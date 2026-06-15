const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Read and parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
});

const privateKey = env.FIREBASE_PRIVATE_KEY
  ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/\\/g, '')
  : '';

const sa = {
  project_id: env.FIREBASE_PROJECT_ID,
  client_email: env.FIREBASE_CLIENT_EMAIL,
  privateKey: privateKey
};

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: sa.project_id,
    clientEmail: sa.client_email,
    privateKey: sa.privateKey
  })
});

const db = admin.firestore();

function toDate(val) {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val.seconds === 'number') return new Date(val.seconds * 1000);
  return new Date(val);
}

async function run() {
  const patientId = 'Zed7C5RDIYpuVzR9wpUD';
  try {
    console.log(`Starting cleanup for patient ${patientId}...`);

    // 1. Find all canteen / canteen_deposit transactions for this patient
    const txSnap = await db.collection('rehab_transactions')
      .where('patientId', '==', patientId)
      .get();
      
    const canteenTxIds = new Set();
    const canteenTxsByMonth = {};

    txSnap.forEach(doc => {
      const data = doc.data();
      const isCanteen = data.category === 'canteen_deposit' || data.category === 'canteen';
      if (isCanteen) {
        console.log(` - Canteen Transaction ${doc.id}: amount=${data.amount}, status=${data.status}, category=${data.category}`);
        if (data.status === 'approved') {
          canteenTxIds.add(doc.id);
          
          // Group by month
          const txDate = toDate(data.date || data.createdAt);
          const month = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
          if (!canteenTxsByMonth[month]) {
            canteenTxsByMonth[month] = [];
          }
          canteenTxsByMonth[month].push({
            id: doc.id,
            amount: Number(data.amount) || 0,
            discount: Number(data.discount || 0),
            returnAmount: Number(data.returnAmount || data.return || 0),
            patientName: data.patientName || '',
            date: txDate
          });
        }
      }
    });

    console.log(`Found ${canteenTxIds.size} approved canteen transactions.`);

    // 2. Fetch all rehab_fees for this patient and filter out any canteen payments
    const feesSnap = await db.collection('rehab_fees')
      .where('patientId', '==', patientId)
      .get();

    console.log(`Found ${feesSnap.size} rehab_fees documents.`);

    for (const feeDoc of feesSnap.docs) {
      const feeData = feeDoc.data();
      const existingPayments = feeData.payments || [];
      const originalLength = existingPayments.length;

      // Filter out payments that have a transactionId matching any canteen deposit
      const updatedPayments = existingPayments.filter(p => {
        const isCanteenPayment = canteenTxIds.has(p.transactionId) || canteenTxIds.has(p.id);
        if (isCanteenPayment) {
          console.log(`Removing canteen payment from fee doc ${feeDoc.id}: amount=${p.amount}, txId=${p.transactionId || p.id}`);
        }
        return !isCanteenPayment;
      });

      if (updatedPayments.length !== originalLength) {
        // Recalculate amountPaid and amountRemaining for this fee document
        const newPaid = updatedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const packageAmt = Number(feeData.packageAmount || feeData.monthlyPackage || 60000);
        const newRemaining = Math.max(0, packageAmt - newPaid);

        console.log(`Updating fee doc ${feeDoc.id}: amountPaid ${feeData.amountPaid} -> ${newPaid}, amountRemaining ${feeData.amountRemaining} -> ${newRemaining}`);
        
        await feeDoc.ref.update({
          payments: updatedPayments,
          amountPaid: newPaid,
          amountRemaining: newRemaining
        });
      }
    }

    // 3. Update/Sync rehab_canteen collection for each month
    for (const month of Object.keys(canteenTxsByMonth)) {
      const txs = canteenTxsByMonth[month];
      const totalDeposited = txs.reduce((sum, tx) => sum + (tx.amount + tx.discount - tx.returnAmount), 0);
      
      const canteenRef = db.collection('rehab_canteen');
      const canteenSnap = await canteenRef
        .where('patientId', '==', patientId)
        .where('month', '==', month)
        .limit(1)
        .get();

      if (canteenSnap.empty) {
        console.log(`Creating new canteen record for month ${month} with deposit: ${totalDeposited}`);
        await canteenRef.add({
          patientId,
          patientName: txs[0].patientName,
          month,
          totalDeposited,
          totalSpent: 0,
          balance: totalDeposited,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastDepositDate: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const canteenDoc = canteenSnap.docs[0];
        const current = canteenDoc.data();
        const totalSpent = Number(current.totalSpent) || 0;
        const newBalance = totalDeposited - totalSpent;

        console.log(`Updating canteen record for month ${month}: totalDeposited -> ${totalDeposited}, balance -> ${newBalance}`);
        await canteenDoc.ref.update({
          totalDeposited,
          balance: newBalance,
          lastDepositDate: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    // 4. Recalculate and sync the patient's finance totals in rehab_patients
    console.log('Recalculating patient finance totals...');
    const patientRef = db.collection('rehab_patients').doc(patientId);
    const patientSnap = await patientRef.get();
    if (!patientSnap.exists) {
      console.log(`Patient ${patientId} not found in rehab_patients.`);
      return;
    }

    const patientData = patientSnap.data();

    // Fetch all approved transactions (excluding canteen deposits)
    const approvedTxSnap = await db.collection('rehab_transactions')
      .where('patientId', '==', patientId)
      .where('status', '==', 'approved')
      .get();

    let totalReceived = 0;
    let totalMedicineCharges = 0;
    let totalDiscount = 0;

    approvedTxSnap.forEach(doc => {
      const tx = doc.data();
      const amount = Number(tx.amount) || 0;
      const discount = Number(tx.discount || 0);
      const returnAmount = Number(tx.returnAmount || tx.return || 0);
      const netAmount = amount - returnAmount;

      if (tx.category === 'medicine_charge') {
        totalMedicineCharges += netAmount;
      } else if (tx.category === 'canteen_deposit' || tx.category === 'canteen') {
        // Skip canteen deposits!
      } else {
        totalReceived += netAmount;
        totalDiscount += discount;
      }
    });

    // Calculate billable months
    const admissionDate = toDate(patientData.admissionDate);
    const endDate = patientData.isActive === false && patientData.dischargeDate
      ? toDate(patientData.dischargeDate)
      : new Date();

    const rawMonths = (endDate.getFullYear() - admissionDate.getFullYear()) * 12 + (endDate.getMonth() - admissionDate.getMonth());
    let completedMonths = rawMonths;
    let hasExtraDays = false;

    if (endDate.getDate() < admissionDate.getDate()) {
      completedMonths = rawMonths - 1;
      hasExtraDays = true;
    } else if (endDate.getDate() > admissionDate.getDate()) {
      completedMonths = rawMonths;
      hasExtraDays = true;
    } else {
      completedMonths = rawMonths;
      hasExtraDays = false;
    }

    const billableMonths = Math.max(1, completedMonths + (hasExtraDays ? 1 : 0));
    const monthlyPkg = Number(patientData.monthlyPackage || patientData.packageAmount || 0);
    const currentStayPackage = billableMonths * monthlyPkg;

    // Calculate historical stays
    let historicalStayPackage = 0;
    const history = patientData.rejoinHistory || [];
    history.forEach((stay) => {
      const sAdmission = toDate(stay.admissionDate);
      const sDischarge = stay.dischargeDate ? toDate(stay.dischargeDate) : new Date();
      const sMonthlyPkg = Number(stay.monthlyPackage || stay.packageAmount || 0);

      const sRawMonths = (sDischarge.getFullYear() - sAdmission.getFullYear()) * 12 + (sDischarge.getMonth() - sAdmission.getMonth());
      let sCompletedMonths = sRawMonths;
      let sHasExtraDays = false;

      if (sDischarge.getDate() < sAdmission.getDate()) {
        sCompletedMonths = sRawMonths - 1;
        sHasExtraDays = true;
      } else if (sDischarge.getDate() > sAdmission.getDate()) {
        sCompletedMonths = sRawMonths;
        sHasExtraDays = true;
      } else {
        sCompletedMonths = sRawMonths;
        sHasExtraDays = false;
      }

      const sBillableMonths = Math.max(1, sCompletedMonths + (sHasExtraDays ? 1 : 0));
      historicalStayPackage += sBillableMonths * sMonthlyPkg;
    });

    const totalStayPackage = currentStayPackage + historicalStayPackage;
    const finalMedicineCharges = typeof patientData.medicineCharges === 'number' ? patientData.medicineCharges : totalMedicineCharges;
    const totalObligation = totalStayPackage + finalMedicineCharges;
    const remaining = Math.max(0, totalObligation - totalReceived - totalDiscount);

    console.log(`Updating patient doc: totalReceived=${totalReceived}, medicineCharges=${finalMedicineCharges}, remaining=${remaining}`);
    await patientRef.update({
      totalReceived,
      overallReceived: totalReceived,
      totalDiscount,
      medicineCharges: finalMedicineCharges,
      remaining,
      remainingBalance: remaining,
      overallRemaining: remaining,
      dueTillDate: currentStayPackage,
      totalStayPackage,
      billableMonths
    });

    console.log('Cleanup completed successfully!');
  } catch (err) {
    console.error('Error in cleanup script:', err);
  }
}

run();
