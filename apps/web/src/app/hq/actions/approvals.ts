// apps/web/src/app/hq/actions/approvals.ts
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireHqSuperadmin, readHqSessionCookie } from './auth';
import { sendHqPushServer } from '@/lib/hqNotificationsServer';
import { toDate } from '@/lib/utils';

export type Dept = 'rehab' | 'spims' | 'job-center' | 'hospital' | 'sukoon-center' | 'welfare';
type Decision = 'approved' | 'rejected';

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === 'hq-admin');
  if (existing) return existing;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const sa = JSON.parse(json);
    return initializeApp(
      {
        credential: cert({
          projectId: sa.project_id,
          clientEmail: sa.client_email,
          privateKey: sa.private_key,
        }),
      },
      'hq-admin'
    );
  }

  // Fallback for local development using individual variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || '';

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing and no fallback credentials found.');
  }

  const cleanKey = rawPrivateKey
    .replace(/^["']|["']$/g, '') // Remove wrapping quotes
    .replace(/\\n/g, '\n')       // Replace literal \n with real newlines
    .replace(/\\/g, '')          // Strip spurious line breaks
    .trim();

  return initializeApp(
    {
      credential: cert({
        projectId,
        clientEmail,
        privateKey: cleanKey,
      }),
    },
    'hq-admin'
  );
}

function txCollection(dept: Dept, collectionOverride?: string) {
  // If the caller explicitly tells us which collection this tx lives in, use it.
  if (collectionOverride) return collectionOverride;
  if (dept === 'rehab') return 'rehab_transactions';
  if (dept === 'spims') return 'spims_transactions';
  if (dept === 'job-center') return 'jobcenter_transactions';
  if (dept === 'hospital') return 'hospital_transactions';
  if (dept === 'sukoon-center') return 'sukoon_transactions';
  return 'welfare_transactions';
}

function safeToDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') return val.toDate();
  if (typeof val.seconds === 'number') return new Date(val.seconds * 1000);
  if (typeof val._seconds === 'number') return new Date(val._seconds * 1000);
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) return parsed;
  return new Date();
}

async function syncPatientFinance(
  adminDb: FirebaseFirestore.Firestore,
  patientId: string
) {
  const patientRef = adminDb.collection('rehab_patients').doc(patientId);
  const patientSnap = await patientRef.get();
  if (!patientSnap.exists) return;

  const patientData = patientSnap.data() as any;

  // 1. Fetch all approved transactions for this patient
  const txSnap = await adminDb
    .collection('rehab_transactions')
    .where('patientId', '==', patientId)
    .where('status', '==', 'approved')
    .get();

  let totalReceived = 0;
  let totalMedicineCharges = 0;
  let totalDiscount = 0;

  txSnap.docs.forEach((doc) => {
    const tx = doc.data();
    const amount = Number(tx.amount) || 0;
    const discount = Number(tx.discount || 0);
    const returnAmount = Number(tx.returnAmount || tx.return || 0);
    const netAmount = amount - returnAmount;

    if (tx.category === 'medicine_charge') {
      totalMedicineCharges += netAmount;
    } else if (tx.category === 'canteen_deposit' || tx.category === 'canteen' || tx.category === 'canteen_expense') {
      // Exclude canteen transactions from standard patient package finances
    } else {
      totalReceived += netAmount;
      totalDiscount += discount;
    }
  });

  // 2. Calculate stay package fee for current stay
  const monthlyPkg = Number(patientData.monthlyPackage || patientData.packageAmount || 0);
  
  let admissionDate = new Date();
  const ad = patientData.admissionDate;
  if (ad) {
    admissionDate = safeToDate(ad);
  }

  let endDate = new Date();
  if (patientData.isActive === false && patientData.dischargeDate) {
    endDate = safeToDate(patientData.dischargeDate);
  }

  // Calculate billable months for active stay
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
  const currentStayPackage = billableMonths * monthlyPkg;

  // 3. Calculate stay package fee for historical stays in rejoinHistory
  let historicalStayPackage = 0;
  const history = patientData.rejoinHistory || [];
  history.forEach((stay: any) => {
    const sAdmission = safeToDate(stay.admissionDate);
    const sDischarge = stay.dischargeDate ? safeToDate(stay.dischargeDate) : new Date();
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
  const manualAdjustment = Number(patientData.manualRemainingAdjustment || 0);
  const remaining = Math.max(0, totalObligation - totalReceived - totalDiscount + manualAdjustment);

  // Calculate daysAdmitted for active stay
  const diffTimeMs = endDate.getTime() - admissionDate.getTime();
  const daysAdmitted = diffTimeMs > 0 ? Math.floor(diffTimeMs / (1000 * 60 * 60 * 24)) : 0;

  const formatStayDuration = (days: number) => {
    if (days <= 0) return '0 Days';
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (months > 0) {
      return `${months} ${months === 1 ? 'Month' : 'Months'}${remainingDays > 0 ? `, ${remainingDays} ${remainingDays === 1 ? 'Day' : 'Days'}` : ''}`;
    }
    return `${days} ${days === 1 ? 'Day' : 'Days'}`;
  };

  const durationFormatted = formatStayDuration(daysAdmitted);

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
    billableMonths,
    daysAdmitted,
    durationFormatted
  });
}

export async function syncRehabPatientFinance(patientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const app = getAdminApp();
    const adminDb = getFirestore(app);
    await syncPatientFinance(adminDb, patientId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function updateEntityTotals(
  adminDb: FirebaseFirestore.Firestore,
  dept: Dept,
  txData: any
) {
  const entityId = txData.patientId || txData.studentId || txData.seekerId || txData.donorId;
  if (!entityId) return;

  if (dept === 'rehab') {
    await syncPatientFinance(adminDb, entityId);
    return;
  }
  
  let col = '';
  if (dept === 'spims') col = 'spims_students';
  else if (dept === 'job-center') col = 'job_center_seekers';
  else if (dept === 'hospital') col = 'hospital_patients';
  else if (dept === 'sukoon-center') col = 'sukoon_clients';
  else if (dept === 'welfare') col = 'welfare_donors';
  else return; // unknown department or no auto-update logic

  let ref = adminDb.collection(col).doc(entityId);
  let snap = await ref.get();

  if (!snap.exists && dept === 'spims') {
    const querySnap = await adminDb
      .collection('spims_students')
      .where('studentId', '==', entityId)
      .limit(1)
      .get();
    if (!querySnap.empty) {
      ref = querySnap.docs[0].ref;
      snap = await ref.get();
    } else if (/^\d+$/.test(entityId)) {
      const numQuerySnap = await adminDb
        .collection('spims_students')
        .where('studentId', '==', Number(entityId))
        .limit(1)
        .get();
      if (!numQuerySnap.empty) {
        ref = numQuerySnap.docs[0].ref;
        snap = await ref.get();
      }
    }
  }

  if (!snap.exists) return;

  const amount = Number(txData.amount) || 0;
  const discount = Number(txData.discount) || 0;
  const returnAmount = Number(txData.returnAmount || txData.return || 0);
  const isIncome = txData.type === 'income';
  const diff = isIncome ? (amount - returnAmount) : -(amount - returnAmount);

  const update: Record<string, any> = {};
  update.totalReceived = FieldValue.increment(diff);
  update.totalDiscount = FieldValue.increment(isIncome ? discount : -discount);

  if (dept === 'spims' && isIncome && txData.category !== 'medicine_charge') {
    const subtype = txData.spimsFeeSubtype;
    if (subtype === 'admission') update.admissionPaid = FieldValue.increment(amount);
    if (subtype === 'registration') update.registrationPaid = FieldValue.increment(amount);
    if (subtype === 'examination') update.examinationPaid = FieldValue.increment(amount);
  }

  await ref.update(update);

  // Re-read to sync 'remaining' balance field if it exists
  const updatedSnap = await ref.get();
  const updatedData = updatedSnap.data() as any;
  const medCharges = Number(updatedData?.medicineCharges) || 0;
  const received = Number(updatedData?.totalReceived) || 0;
  const totalDiscount = Number(updatedData?.totalDiscount) || 0;
  
  const pkg = Number(updatedData?.totalPackage || updatedData?.totalPackageAmount) || 0;
  const totalObligation = pkg + medCharges;
  
  await ref.update({
    remaining: Math.max(0, totalObligation - received - totalDiscount),
    remainingBalance: Math.max(0, totalObligation - received - totalDiscount), // Support both naming conventions
  });
}

async function syncRehabRecords(
  adminDb: FirebaseFirestore.Firestore,
  txId: string,
  txData: any,
  approvedBy: string
) {
  const patientId = txData.patientId;
  const staffId = txData.staffId;
  if (!patientId && !staffId) return;

  console.log('[syncRehabRecords] Called with:', { txId, patientId, staffId, category: txData.category, amount: txData.amount });

  try {
    let txDate = new Date();
    if (txData.date) {
      if (typeof txData.date.toDate === 'function') {
        txDate = txData.date.toDate();
      } else if (txData.date && typeof txData.date.seconds === 'number') {
        txDate = new Date(txData.date.seconds * 1000);
      } else if (txData.date && typeof txData.date._seconds === 'number') {
        txDate = new Date(txData.date._seconds * 1000);
      } else {
        const parsed = new Date(txData.date);
        if (!isNaN(parsed.getTime())) {
          txDate = parsed;
        }
      }
    }
    const year = txDate.getFullYear();
    const mm = String(txDate.getMonth() + 1).padStart(2, '0');
    const month = `${year}-${mm}`;
    console.log('[syncRehabRecords] Parsed date:', txDate, 'month:', month);

    const isFeeCategory = 
      txData.category !== 'medicine_charge' &&
      txData.category !== 'canteen_deposit' &&
      txData.category !== 'canteen' &&
      txData.category !== 'canteen_expense' &&
      (txData.type === 'income' ||
      txData.category === 'patient_fee' || 
      txData.category === 'fee' || 
      String(txData.category || '').toLowerCase().includes('fee') ||
      String(txData.categoryName || '').toLowerCase().includes('fee') ||
      String(txData.categoryName || '').toLowerCase().includes('admission'));

    if (isFeeCategory && patientId) {
      const feesRef = adminDb.collection('rehab_fees');
      const feesSnap = await feesRef
        .where('patientId', '==', patientId)
        .where('month', '==', month)
        .limit(1)
        .get();

      const amount = Number(txData.amount) || 0;
      const discount = Number(txData.discount || 0);
      const returnAmount = Number(txData.returnAmount || txData.return || 0);
      const creditAmount = amount + discount - returnAmount;
      console.log('[syncRehabRecords] Querying rehab_fees with patientId:', patientId, 'month:', month, 'found:', feesSnap.size);

      if (feesSnap.empty) {
        const patientSnap = await adminDb.collection('rehab_patients').doc(patientId).get();
        const packageAmount = patientSnap.exists
          ? (Number(patientSnap.data()?.packageAmount || patientSnap.data()?.monthlyPackage) || 60000)
          : 60000;
        const amountRemaining = Math.max(0, packageAmount - creditAmount);
        console.log('[syncRehabRecords] Creating new fee record for patientId:', patientId, 'packageAmount:', packageAmount, 'amountPaid:', creditAmount);

        await feesRef.add({
          patientId,
          patientName: txData.patientName || '',
          month,
          packageAmount,
          amountPaid: creditAmount,
          amountRemaining,
          payments: [{
            amount: creditAmount,
            discount,
            returnAmount,
            date: txDate,
            transactionId: txId,
            approvedBy,
            status: 'approved',
          }],
          lastPaymentDate: FieldValue.serverTimestamp(),
          lastPaymentAmount: amount,
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        const feeDoc = feesSnap.docs[0];
        const current = feeDoc.data();
        const newPaid = (Number(current.amountPaid) || 0) + creditAmount;
        const newRemaining = Math.max(0, (Number(current.packageAmount || current.monthlyPackage) || 60000) - newPaid);
        const existingPayments = current.payments || [];
        console.log('[syncRehabRecords] Updating existing fee record for patientId:', patientId, 'newPaid:', newPaid, 'newRemaining:', newRemaining);

        await feeDoc.ref.update({
          amountPaid: newPaid,
          amountRemaining: newRemaining,
          lastPaymentDate: FieldValue.serverTimestamp(),
          lastPaymentAmount: amount,
          payments: [...existingPayments, {
            amount: creditAmount,
            discount,
            returnAmount,
            date: txDate,
            transactionId: txId,
            approvedBy,
            status: 'approved',
          }],
        });
      }
    }

    if ((txData.category === 'canteen_deposit' || txData.category === 'canteen') && patientId) {
      const canteenRef = adminDb.collection('rehab_canteen');
      const canteenSnap = await canteenRef
        .where('patientId', '==', patientId)
        .where('month', '==', month)
        .limit(1)
        .get();

      const amount = Number(txData.amount) || 0;
      const discount = Number(txData.discount || 0);
      const returnAmount = Number(txData.returnAmount || txData.return || 0);
      const netCanteen = amount + discount - returnAmount;

      if (canteenSnap.empty) {
        await canteenRef.add({
          patientId,
          patientName: txData.patientName || '',
          month,
          totalDeposited: netCanteen,
          totalSpent: 0,
          balance: netCanteen,
          lastDepositDate: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        const canteenDoc = canteenSnap.docs[0];
        const current = canteenDoc.data();
        const newDeposited = (Number(current.totalDeposited) || 0) + netCanteen;
        const newBalance = newDeposited - (Number(current.totalSpent) || 0);

        await canteenDoc.ref.update({
          totalDeposited: newDeposited,
          balance: newBalance,
          lastDepositDate: FieldValue.serverTimestamp(),
        });
      }
    }

    if (txData.category === 'canteen_expense' && patientId) {
      const canteenRef = adminDb.collection('rehab_canteen');
      const canteenSnap = await canteenRef
        .where('patientId', '==', patientId)
        .where('month', '==', month)
        .limit(1)
        .get();

      const amount = Number(txData.amount) || 0;

      if (!canteenSnap.empty) {
        const canteenDoc = canteenSnap.docs[0];
        const current = canteenDoc.data();
        const newSpent = (Number(current.totalSpent) || 0) + amount;
        const newBalance = (Number(current.totalDeposited) || 0) - newSpent;

        await canteenDoc.ref.update({
          totalSpent: newSpent,
          balance: Math.max(0, newBalance),
        });
      }
    }

    if (txData.category === 'staff_salary' && staffId) {
      const salaryRef = adminDb.collection('rehab_salary_records');
      const salarySnap = await salaryRef
        .where('staffId', '==', staffId)
        .where('month', '==', month)
        .limit(1)
        .get();

      const amount = Number(txData.amount) || 0;

      if (salarySnap.empty) {
        await salaryRef.add({
          staffId,
          staffName: txData.staffName || '',
          month,
          amount,
          transactionId: txId,
          paidAt: FieldValue.serverTimestamp(),
          approvedBy,
        });
      } else {
        const salaryDoc = salarySnap.docs[0];
        await salaryDoc.ref.update({
          amount: (Number(salaryDoc.data()?.amount) || 0) + amount,
          lastPaidAt: FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.error('[syncRehabRecords] Error:', err);
  }
}

async function syncSpimsFeeRecords(
  adminDb: FirebaseFirestore.Firestore,
  txId: string,
  txData: any,
  decision: Decision
) {
  const studentId = txData.studentId;
  if (!studentId) return;

  try {
    const feePaymentId = txData.feePaymentId;
    if (feePaymentId) {
      await adminDb.collection('spims_fees').doc(feePaymentId).set({
        status: decision,
        updatedAt: new Date()
      }, { merge: true });
    }

    let studentRef = adminDb.collection('spims_students').doc(studentId);
    let studentSnap = await studentRef.get();

    if (!studentSnap.exists) {
      const snap = await adminDb
        .collection('spims_students')
        .where('studentId', '==', studentId)
        .limit(1)
        .get();
      if (!snap.empty) {
        studentRef = snap.docs[0].ref;
        studentSnap = await studentRef.get();
      } else if (/^\d+$/.test(studentId)) {
        const snapNum = await adminDb
          .collection('spims_students')
          .where('studentId', '==', Number(studentId))
          .limit(1)
          .get();
        if (!snapNum.empty) {
          studentRef = snapNum.docs[0].ref;
          studentSnap = await studentRef.get();
        }
      }
    }

    if (studentSnap.exists) {
      const studentData = studentSnap.data() as any;
      const pkg = Number(studentData?.totalPackage || studentData?.totalPackageAmount) || 0;

      // Use the resolved Firestore document ID for the query
      const resolvedStudentId = studentRef.id;
      
      // Query by both the resolved doc ID AND the original studentId to catch all records
      const [feesSnap1, feesSnap2] = await Promise.all([
        adminDb.collection('spims_fees').where('studentId', '==', resolvedStudentId).get(),
        resolvedStudentId !== studentId
          ? adminDb.collection('spims_fees').where('studentId', '==', studentId).get()
          : Promise.resolve({ docs: [] as any[] })
      ]);

      // Merge and deduplicate by doc ID
      const feeDocMap = new Map<string, any>();
      [...feesSnap1.docs, ...feesSnap2.docs].forEach(d => {
        if (!feeDocMap.has(d.id)) feeDocMap.set(d.id, { id: d.id, ...d.data() });
      });

      const approvedRows = Array.from(feeDocMap.values())
        .filter(r => r.status === 'approved');

      approvedRows.sort((a, b) => {
        const tA = toDate(a.date || a.createdAt).getTime();
        const tB = toDate(b.date || b.createdAt).getTime();
        return tA - tB;
      });

      let bal = pkg;
      for (const r of approvedRows) {
        bal -= Number(r.amount) || 0;
        await adminDb.collection('spims_fees').doc(r.id).set({
          remaining: Math.max(0, bal)
        }, { merge: true });
      }

      const remainingBal = Math.max(0, bal);
      await studentRef.update({
        totalReceived: pkg - remainingBal,
        remaining: remainingBal,
        remainingBalance: remainingBal,
        updatedAt: new Date(),
      });
    }
  } catch (err) {
    console.error('[syncSpimsFeeRecords] Error:', err);
  }
}

async function updateSpimsStudentOnApproval(
  adminDb: FirebaseFirestore.Firestore,
  studentId: string,
  amount: number,
  category: string
): Promise<void> {
  // Step 1: Try direct doc lookup by Firestore document ID
  let studentRef: FirebaseFirestore.DocumentReference | null = null;
  let isDirectDoc = false;

  try {
    const directDoc = await adminDb.collection('spims_students').doc(studentId).get();
    if (directDoc.exists) {
      studentRef = directDoc.ref;
      isDirectDoc = true;
    }
  } catch (_) {}

  // Step 2: If not found, query by studentId field (handles numeric IDs like "36")
  if (!studentRef) {
    const snap = await adminDb
      .collection('spims_students')
      .where('studentId', '==', studentId)
      .limit(1)
      .get();
    if (!snap.empty) {
      studentRef = snap.docs[0].ref;
    }
  }

  // Step 3: Also try numeric conversion (studentId might be stored as number)
  if (!studentRef && /^\d+$/.test(studentId)) {
    const snap = await adminDb
      .collection('spims_students')
      .where('studentId', '==', Number(studentId))
      .limit(1)
      .get();
    if (!snap.empty) {
      studentRef = snap.docs[0].ref;
    }
  }

  if (!studentRef) {
    console.warn('[approvals] SPIMS student not found for studentId:', studentId);
    return; // Don't crash — transaction is already approved
  }

  // Step 4: Determine which fee flag to set
  const cat = (category || '').toLowerCase();
  const feeFlags: Record<string, boolean> = {};
  if (cat.includes('monthly') || cat === 'fee' || cat.includes('fee')) {
    feeFlags.monthlyFeePaid = true;
  }
  if (cat.includes('admission')) {
    feeFlags.admissionFeePaid = true;
  }
  if (cat.includes('registration')) {
    feeFlags.registrationFeePaid = true;
  }
  if (cat.includes('examination') || cat.includes('exam')) {
    feeFlags.examinationFeePaid = true;
  }

  // Step 5: Read current values then update atomically
  const currentData = (await studentRef.get()).data() || {};

  if (isDirectDoc) {
    // Already updated by updateEntityTotals / syncSpimsFeeRecords, so only set feeFlags
    if (Object.keys(feeFlags).length > 0) {
      await studentRef.update({
        ...feeFlags,
        updatedAt: new Date(),
      });
    }
  } else {
    // Direct lookup failed, so update totals and fee flags
    const currentReceived = Number(currentData.totalReceived || 0);
    const currentRemaining = Number(currentData.remainingBalance ?? currentData.remaining ?? 0);

    await studentRef.update({
      totalReceived: currentReceived + amount,
      remainingBalance: Math.max(0, currentRemaining - amount),
      ...feeFlags,
      updatedAt: new Date(),
    });
  }
}

export async function decideTransaction(params: {
  dept: Dept;
  txId: string;
  decision: Decision;
  rejectReason?: string;
  /** Optional: override which Firestore collection to look in (e.g. 'spims_fees') */
  _collection?: string;
}): Promise<{ success: boolean; error?: string }> {
  const caller = await requireHqSuperadmin();
  try {
    const app = getAdminApp();
    const adminDb = getFirestore(app);

    const col = txCollection(params.dept, params._collection);
    let ref = adminDb.collection(col).doc(params.txId);
    let snap = await ref.get();

    // SPIMS fallback: if not found in the expected collection, try the other one
    if (!snap.exists && params.dept === 'spims') {
      const altCol = col === 'spims_transactions' ? 'spims_fees' : 'spims_transactions';
      const altRef = adminDb.collection(altCol).doc(params.txId);
      const altSnap = await altRef.get();
      if (altSnap.exists) {
        ref = altRef;
        snap = altSnap;
      }
    }

    if (!snap.exists) return { success: false, error: 'Transaction not found.' };

    const data = snap.data() as any;
    if (data?.processedAt) return { success: false, error: 'Already processed.' };

    const update: Record<string, any> = {
      status: params.decision,
      processedAt: new Date(),
      processedBy: caller.customId,
    };
    if (params.decision === 'approved') {
      update.approvedAt = new Date();
      update.approvedBy = caller.customId;
    } else {
      update.rejectedAt = new Date();
      update.rejectedBy = caller.customId;
      update.rejectionReason = String(params.rejectReason || '').trim();
    }

    await ref.set(update, { merge: true });

    if (params.decision === 'approved') {
      await updateEntityTotals(adminDb, params.dept, data);
      if (params.dept === 'rehab') {
        await syncRehabRecords(adminDb, params.txId, data, caller.customId);
      }
      if (params.dept === 'welfare') {
        await syncWelfareRecords(adminDb, params.txId, data, caller.customId);
      }
      if (params.dept === 'spims') {
        await syncSpimsFeeRecords(adminDb, params.txId, data, 'approved');

        const studentId = data.studentId || data.patientId;
        const amount = Number(data.amount || 0);
        const category = String(data.category || data.feePaymentType || '');
        if (studentId && amount > 0) {
          try {
            await updateSpimsStudentOnApproval(adminDb, studentId, amount, category);
          } catch (e) {
            console.error('[approvals] Student update failed (non-fatal):', e);
          }
        }
      }
    } else {
      if (params.dept === 'spims') {
        await syncSpimsFeeRecords(adminDb, params.txId, data, 'rejected');
      }
    }

    await adminDb.collection('hq_audit').add({
      action: params.decision === 'approved' ? 'tx_approved' : 'tx_rejected',
      actorId: caller.uid,
      actorName: caller.name,
      dept: params.dept,
      entityId: data.patientId || data.studentId || data.seekerId || data.staffId || null,
      entityLabel: data.patientName || data.studentName || data.seekerName || data.staffName || null,
      message:
        params.decision === 'approved'
          ? `Approved ${params.dept} transaction`
          : `Rejected ${params.dept} transaction`,
      details: {
        txId: params.txId,
        amount: data.amount ?? null,
        category: data.category ?? null,
        rejectReason: params.decision === 'rejected' ? String(params.rejectReason || '').trim() : null,
      },
      createdAt: new Date(),
      performedBy: 'hq_superadmin',
    });

    // Notify the cashier who created the transaction
    if (data.createdBy) {
      void (async () => {
        try {
          const userSnap = await adminDb.collection('hq_users').doc(data.createdBy).get();
          if (userSnap.exists) {
            const cashierData = userSnap.data();
            const recipientId = String(cashierData?.customId || '').toUpperCase();
            if (recipientId) {
              await sendHqPushServer({
                recipientId,
                recipientUid: data.createdBy,
                type: params.decision === 'approved' ? 'tx_approved' : 'tx_rejected',
                title: params.decision === 'approved' ? 'Transaction Approved' : 'Transaction Rejected',
                body: `Your transaction of Rs ${Number(data.amount).toLocaleString()} for ${data.patientName || data.studentName || data.seekerName || 'Patient/Student/Seeker'} has been ${params.decision}.`,
                actionUrl: '/hq/dashboard/cashier',
                relatedId: params.txId,
              });
            }
          }
        } catch (warn) {
          console.warn('[Approvals] Notification failed:', warn);
        }
      })();
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed.' };
  }
}

export async function bulkDecideTransactions(params: {
  dept: Dept;
  txIds: string[];
  decision: Decision;
  rejectReason?: string;
}): Promise<{ success: boolean; processed: number; error?: string }> {
  const caller = await requireHqSuperadmin();
  try {
    const app = getAdminApp();
    const adminDb = getFirestore(app);
    const col = txCollection(params.dept);

    const ids = Array.from(new Set(params.txIds || [])).filter(Boolean);
    if (!ids.length) return { success: true, processed: 0 };

    const snaps = await Promise.all(ids.slice(0, 100).map((id) => adminDb.collection(col).doc(id).get()));
    const validSnaps = snaps.filter((s) => s.exists && !s.data()?.processedAt);

    let processed = 0;
    const batch = adminDb.batch();
    for (const snap of validSnaps) {
      const txId = snap.id;
      const ref = adminDb.collection(col).doc(txId);
      batch.set(
        ref,
        {
          status: params.decision,
          processedAt: new Date(),
          processedBy: caller.customId,
          ...(params.decision === 'approved'
            ? { approvedAt: new Date(), approvedBy: caller.customId }
            : { rejectedAt: new Date(), rejectedBy: caller.customId, rejectionReason: String(params.rejectReason || '').trim() }),
        },
        { merge: true }
      );
      processed++;
    }
    await batch.commit();

    if (params.decision === 'approved') {
      // Process entity updates sequentially to avoid race conditions on same entity
      for (const snap of validSnaps) {
        await updateEntityTotals(adminDb, params.dept, snap.data());
        if (params.dept === 'rehab') {
          await syncRehabRecords(adminDb, snap.id, snap.data(), caller.customId);
        }
        if (params.dept === 'spims') {
          await syncSpimsFeeRecords(adminDb, snap.id, snap.data(), 'approved');

          const txData = snap.data() || {};
          const studentId = txData.studentId || txData.patientId;
          const amount = Number(txData.amount || 0);
          const category = String(txData.category || txData.feePaymentType || '');
          if (studentId && amount > 0) {
            try {
              await updateSpimsStudentOnApproval(adminDb, studentId, amount, category);
            } catch (e) {
              console.error('[approvals] Student update failed (non-fatal):', e);
            }
          }
        }
      }
    } else {
      if (params.dept === 'spims') {
        for (const snap of validSnaps) {
          await syncSpimsFeeRecords(adminDb, snap.id, snap.data(), 'rejected');
        }
      }
    }

    await adminDb.collection('hq_audit').add({
      action: params.decision === 'approved' ? 'tx_bulk_approved' : 'tx_bulk_rejected',
      actorId: caller.uid,
      actorName: caller.name,
      dept: params.dept,
      message: `Bulk ${params.decision} ${processed} ${params.dept} transactions`,
      details: { count: processed },
      createdAt: new Date(),
      performedBy: 'hq_superadmin',
    });

    // Notify creators (simplified for bulk - unique creators)
    const creators = Array.from(new Set(validSnaps.map(s => s.data()?.createdBy).filter(Boolean)));
    for (const uid of creators) {
      void (async () => {
        try {
          const userSnap = await adminDb.collection('hq_users').doc(uid as string).get();
          if (userSnap.exists) {
            const cashierData = userSnap.data();
            const recipientId = String(cashierData?.customId || '').toUpperCase();
            if (recipientId) {
              await sendHqPushServer({
                recipientId,
                recipientUid: uid as string,
                type: 'tx_bulk_processed',
                title: 'Transactions Processed',
                body: `The superadmin has ${params.decision} ${validSnaps.filter(s => s.data()?.createdBy === uid).length} of your pending transactions.`,
                actionUrl: '/hq/dashboard/cashier',
              });
            }
          }
        } catch (warn) {
          console.warn('[Approvals] Bulk notification failed:', warn);
        }
      })();
    }

    return { success: true, processed };
  } catch (err: any) {
    return { success: false, processed: 0, error: err?.message || 'Failed.' };
  }
}

export async function editApprovedTransaction(params: {
  dept: Dept;
  txId: string;
  amount: number;
  date: string;
  category?: string;
  categoryName?: string;
  spimsFeeSubtype?: string;
  description?: string;
  discount?: number;
  returnAmount?: number;
  stayDurationIndex?: number;
  hospitalDayCloseShift?: string;
  hospitalPatientDetails?: any;
  /** Optional: override which Firestore collection to look in (e.g. 'spims_fees') */
  _collection?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await readHqSessionCookie();
    if (!session) return { success: false, error: 'Unauthorized. Please login again.' };

    const app = getAdminApp();
    const adminDb = getFirestore(app);

    const col = txCollection(params.dept, params._collection);
    const ref = adminDb.collection(col).doc(params.txId);
    const snap = await ref.get();
    if (!snap.exists) return { success: false, error: 'Transaction not found.' };

    const oldData = snap.data() as any;
    if (oldData?.status !== 'approved') {
      return { success: false, error: 'Only approved transactions can be edited using this action.' };
    }

    const isHospitalTx = params.dept === 'hospital';
    const isOwner = oldData.cashierId === session.customId;
    const isSuperadmin = session.role === 'superadmin';

    if (isHospitalTx) {
      if (!isSuperadmin && !isOwner) {
        return { success: false, error: 'Unauthorized: Cashiers can only edit hospital transactions they created.' };
      }
    } else {
      if (!isSuperadmin) {
        return { success: false, error: 'Unauthorized: Only Super Admins can edit approved transactions.' };
      }
    }

    const caller = session;

    const newAmount = Number(params.amount) || 0;
    const oldAmount = Number(oldData.amount) || 0;
    const amountDiff = newAmount - oldAmount;

    const newCategory = params.category || oldData.category;
    const oldCategory = oldData.category;
    const newSubtype = params.spimsFeeSubtype || oldData.spimsFeeSubtype || '';
    const oldSubtype = oldData.spimsFeeSubtype || '';

    const isAmountChanged = amountDiff !== 0;
    const isCategoryChanged = newCategory !== oldCategory;
    const isSubtypeChanged = newSubtype !== oldSubtype;

    // 1. Update the transaction document
    const [y, m, d] = params.date.split('-').map(Number);
    const transactionDate = new Date(y, m - 1, d, 12, 0, 0);
    const updatePayload: Record<string, any> = {
      amount: newAmount,
      date: transactionDate,
      transactionDate: transactionDate,
      description: String(params.description || '').trim(),
      updatedAt: new Date(),
      editedBy: caller.customId,
      discount: typeof params.discount === 'number' ? params.discount : Number(oldData.discount || 0),
      returnAmount: typeof params.returnAmount === 'number' ? params.returnAmount : Number(oldData.returnAmount || oldData.return || 0),
    };
    if (typeof params.stayDurationIndex === 'number') {
      updatePayload.stayDurationIndex = params.stayDurationIndex;
    }
    if (params.category) {
      updatePayload.category = params.category;
      if (params.categoryName) {
        updatePayload.categoryName = params.categoryName;
      }
    }
    if (params.spimsFeeSubtype !== undefined) {
      updatePayload.spimsFeeSubtype = params.spimsFeeSubtype;
    }
    if (params.hospitalDayCloseShift !== undefined) {
      updatePayload.hospitalDayCloseShift = params.hospitalDayCloseShift;
    }
    if (params.hospitalPatientDetails !== undefined) {
      updatePayload.hospitalPatientDetails = params.hospitalPatientDetails;
      if (params.hospitalPatientDetails) {
        updatePayload.patientName = params.hospitalPatientDetails.patientName || params.hospitalPatientDetails.receiverName || 'Inline Patient';
      }
    }
    await ref.set(updatePayload, { merge: true });

    // Update corresponding SPIMS fee record if applicable
    if (params.dept === 'spims' && oldData.feePaymentId) {
      try {
        await adminDb.collection('spims_fees').doc(oldData.feePaymentId).set({
          amount: newAmount,
          date: transactionDate,
          note: String(params.description || '').trim(),
          type: params.spimsFeeSubtype || oldData.spimsFeeSubtype || 'monthly',
          updatedAt: new Date(),
        }, { merge: true });
      } catch (e) {
        console.warn('[Approvals] Failed to update linked SPIMS fee record:', e);
      }
    }

    // 2. Adjust patient/student totals if amount, category, subtype, discount, or returnAmount changed
    const oldDiscount = Number(oldData.discount || 0);
    const newDiscount = typeof params.discount === 'number' ? params.discount : oldDiscount;
    const oldReturnAmount = Number(oldData.returnAmount || oldData.return || 0);
    const newReturnAmount = typeof params.returnAmount === 'number' ? params.returnAmount : oldReturnAmount;

    const isDiscountChanged = newDiscount !== oldDiscount;
    const isReturnChanged = newReturnAmount !== oldReturnAmount;

    if (isAmountChanged || isCategoryChanged || isSubtypeChanged || isDiscountChanged || isReturnChanged) {
      const entityId = oldData.patientId || oldData.studentId || oldData.seekerId || oldData.donorId;
      if (entityId) {
        let entityCol = '';
        if (params.dept === 'rehab') entityCol = 'rehab_patients';
        else if (params.dept === 'spims') entityCol = 'spims_students';
        else if (params.dept === 'job-center') entityCol = 'job_center_seekers';
        else if (params.dept === 'hospital') entityCol = 'hospital_patients';
        else if (params.dept === 'sukoon-center') entityCol = 'sukoon_clients';
        else if (params.dept === 'welfare') entityCol = 'welfare_donors';

        if (entityCol) {
          let entityRef = adminDb.collection(entityCol).doc(entityId);
          let entitySnap = await entityRef.get();

          if (!entitySnap.exists && params.dept === 'spims') {
            const snap = await adminDb
              .collection('spims_students')
              .where('studentId', '==', entityId)
              .limit(1)
              .get();
            if (!snap.empty) {
              entityRef = snap.docs[0].ref;
              entitySnap = await entityRef.get();
            } else if (/^\d+$/.test(entityId)) {
              const snapNum = await adminDb
                .collection('spims_students')
                .where('studentId', '==', Number(entityId))
                .limit(1)
                .get();
              if (!snapNum.empty) {
                entityRef = snapNum.docs[0].ref;
                entitySnap = await entityRef.get();
              }
            }
          }

          if (entitySnap.exists) {
            const isIncome = oldData.type === 'income';

            if (params.dept === 'rehab') {
              await syncPatientFinance(adminDb, entityId);
            } else {
              const oldNet = isIncome ? (oldAmount - oldReturnAmount) : -(oldAmount - oldReturnAmount);
              const newNet = isIncome ? (newAmount - newReturnAmount) : -(newAmount - newReturnAmount);
              const diffAdjustment = newNet - oldNet;
              
              const discountDiff = isIncome ? (newDiscount - oldDiscount) : -(newDiscount - oldDiscount);

              const entityUpdate: Record<string, any> = {};
              entityUpdate.totalReceived = FieldValue.increment(diffAdjustment);
              entityUpdate.totalDiscount = FieldValue.increment(discountDiff);

              if (params.dept === 'spims' && isIncome && newCategory === 'fee') {
                if (oldCategory !== 'fee') {
                  if (newSubtype === 'admission') entityUpdate.admissionPaid = FieldValue.increment(newAmount);
                  if (newSubtype === 'registration') entityUpdate.registrationPaid = FieldValue.increment(newAmount);
                  if (newSubtype === 'examination') entityUpdate.examinationPaid = FieldValue.increment(newAmount);
                } else if (oldSubtype !== newSubtype) {
                  if (oldSubtype === 'admission') entityUpdate.admissionPaid = FieldValue.increment(-oldAmount);
                  if (oldSubtype === 'registration') entityUpdate.registrationPaid = FieldValue.increment(-oldAmount);
                  if (oldSubtype === 'examination') entityUpdate.examinationPaid = FieldValue.increment(-oldAmount);
                  
                  if (newSubtype === 'admission') entityUpdate.admissionPaid = FieldValue.increment(newAmount);
                  if (newSubtype === 'registration') entityUpdate.registrationPaid = FieldValue.increment(newAmount);
                  if (newSubtype === 'examination') entityUpdate.examinationPaid = FieldValue.increment(newAmount);
                } else {
                  if (newSubtype === 'admission') entityUpdate.admissionPaid = FieldValue.increment(amountDiff);
                  if (newSubtype === 'registration') entityUpdate.registrationPaid = FieldValue.increment(amountDiff);
                  if (newSubtype === 'examination') entityUpdate.examinationPaid = FieldValue.increment(amountDiff);
                }
              } else if (params.dept === 'spims' && isIncome && oldCategory === 'fee' && newCategory !== 'fee') {
                if (oldSubtype === 'admission') entityUpdate.admissionPaid = FieldValue.increment(-oldAmount);
                if (oldSubtype === 'registration') entityUpdate.registrationPaid = FieldValue.increment(-oldAmount);
                if (oldSubtype === 'examination') entityUpdate.examinationPaid = FieldValue.increment(-oldAmount);
              }

              if (Object.keys(entityUpdate).length > 0) {
                await entityRef.update(entityUpdate);
              }

              // Re-read and recalculate remaining balance
              const updatedSnap = await entityRef.get();
              const updatedData = updatedSnap.data() as any;
              const medCharges = Number(updatedData?.medicineCharges) || 0;
              const received = Number(updatedData?.totalReceived) || 0;
              const totalDiscountVal = Number(updatedData?.totalDiscount) || 0;

              const pkg = Number(updatedData?.totalPackage || updatedData?.totalPackageAmount) || 0;
              const totalObligation = pkg + medCharges;

              await entityRef.update({
                remaining: Math.max(0, totalObligation - received - totalDiscountVal),
                remainingBalance: Math.max(0, totalObligation - received - totalDiscountVal),
              });
            }
          }
        }
      }
    }

    if (params.dept === 'rehab') {
      // Find the fee record for this patient and month and update it
      const patientId = oldData.patientId;
      if (patientId) {
        let oldTxDate = safeToDate(oldData.date || oldData.transactionDate);
        const oldMonth = `${oldTxDate.getFullYear()}-${String(oldTxDate.getMonth() + 1).padStart(2, '0')}`;
        
        const feesRef = adminDb.collection('rehab_fees');
        const feesSnap = await feesRef
          .where('patientId', '==', patientId)
          .where('month', '==', oldMonth)
          .limit(1)
          .get();
        
        if (!feesSnap.empty) {
          const feeDoc = feesSnap.docs[0];
          const feeData = feeDoc.data();
          const payments = feeData.payments || [];
          
          let paymentFound = false;
          const updatedPayments = payments.map((p: any) => {
            if (p.transactionId === params.txId) {
              paymentFound = true;
              return {
                ...p,
                amount: newAmount + newDiscount - newReturnAmount,
                date: transactionDate,
                discount: newDiscount,
                returnAmount: newReturnAmount,
              };
            }
            return p;
          });
          
          if (paymentFound) {
            const newPaid = updatedPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
            const newRemaining = Math.max(0, (Number(feeData.packageAmount || feeData.monthlyPackage) || 60000) - newPaid);
            
            await feeDoc.ref.update({
              payments: updatedPayments,
              amountPaid: newPaid,
              amountRemaining: newRemaining,
            });
          }
        }
      }
    }

    if (params.dept === 'spims') {
      await syncSpimsFeeRecords(adminDb, params.txId, oldData, 'approved');
    }

    // 3. Add to Audit Log
    await adminDb.collection('hq_audit').add({
      action: 'tx_edited',
      actorId: caller.uid,
      actorName: caller.name,
      dept: params.dept,
      entityId: oldData.patientId || oldData.studentId || oldData.seekerId || oldData.staffId || null,
      entityLabel: oldData.patientName || oldData.studentName || oldData.seekerName || oldData.staffName || null,
      message: `Edited approved ${params.dept} transaction`,
      details: {
        txId: params.txId,
        oldAmount,
        newAmount,
        oldDate: oldData.date || oldData.transactionDate || null,
        newDate: params.date,
        discount: newDiscount,
        returnAmount: newReturnAmount,
      },
      createdAt: new Date(),
      performedBy: 'hq_superadmin',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed.' };
  }
}

export async function syncDirectApprovedTransaction(params: {
  dept: Dept;
  txId: string;
  approvedBy?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const app = getAdminApp();
    const adminDb = getFirestore(app);

    const col = txCollection(params.dept);
    const ref = adminDb.collection(col).doc(params.txId);
    const snap = await ref.get();
    if (!snap.exists) return { success: false, error: 'Transaction not found.' };

    const data = snap.data();
    await updateEntityTotals(adminDb, params.dept, data);
    if (params.dept === 'rehab') {
      await syncRehabRecords(adminDb, params.txId, data, params.approvedBy || 'SUPERADMIN');
    }
    if (params.dept === 'welfare') {
      await syncWelfareRecords(adminDb, params.txId, data, params.approvedBy || 'SUPERADMIN');
    }
    if (params.dept === 'spims') {
      await syncSpimsFeeRecords(adminDb, params.txId, data, 'approved');
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to sync totals.' };
  }
}

async function reverseEntityTotalsServer(
  adminDb: FirebaseFirestore.Firestore,
  dept: Dept,
  txData: any
) {
  const entityId = txData.patientId || txData.studentId || txData.seekerId || txData.donorId || txData.clientId;
  if (!entityId) return;

  if (dept === 'rehab') {
    await syncPatientFinance(adminDb, entityId);
    return;
  }
  
  let col = '';
  if (dept === 'spims') col = 'spims_students';
  else if (dept === 'job-center') col = 'job_center_seekers';
  else if (dept === 'hospital') col = 'hospital_patients';
  else if (dept === 'sukoon-center') col = 'sukoon_clients';
  else if (dept === 'welfare') col = 'welfare_donors';
  else return;

  let ref = adminDb.collection(col).doc(entityId);
  let snap = await ref.get();

  if (!snap.exists && dept === 'spims') {
    const querySnap = await adminDb
      .collection('spims_students')
      .where('studentId', '==', entityId)
      .limit(1)
      .get();
    if (!querySnap.empty) {
      ref = querySnap.docs[0].ref;
      snap = await ref.get();
    } else if (/^\d+$/.test(entityId)) {
      const numQuerySnap = await adminDb
        .collection('spims_students')
        .where('studentId', '==', Number(entityId))
        .limit(1)
        .get();
      if (!numQuerySnap.empty) {
        ref = numQuerySnap.docs[0].ref;
        snap = await ref.get();
      }
    }
  }

  if (!snap.exists) return;

  const amount = Number(txData.amount) || 0;
  const discount = Number(txData.discount) || 0;
  const returnAmount = Number(txData.returnAmount || txData.return || 0);
  const isIncome = txData.type === 'income' || txData.type === undefined;
  const netAmount = amount - returnAmount;
  const diff = isIncome ? -netAmount : netAmount;

  const update: Record<string, any> = {};
  update.totalReceived = FieldValue.increment(diff);
  update.totalDiscount = FieldValue.increment(isIncome ? -discount : discount);

  if (dept === 'spims' && isIncome && txData.category !== 'medicine_charge') {
    const subtype = txData.spimsFeeSubtype;
    if (subtype === 'admission') update.admissionPaid = FieldValue.increment(-amount);
    if (subtype === 'registration') update.registrationPaid = FieldValue.increment(-amount);
    if (subtype === 'examination') update.examinationPaid = FieldValue.increment(-amount);
  }

  await ref.update(update);

  // Re-read to sync 'remaining' balance field
  const updatedSnap = await ref.get();
  const updatedData = updatedSnap.data() as any;
  const medCharges = Number(updatedData?.medicineCharges) || 0;
  const received = Number(updatedData?.totalReceived) || 0;
  const totalDiscount = Number(updatedData?.totalDiscount) || 0;
  
  const pkg = Number(updatedData?.totalPackage || updatedData?.totalPackageAmount) || 0;
  const totalObligation = pkg + medCharges;
  
  await ref.update({
    remaining: Math.max(0, totalObligation - received - totalDiscount),
    remainingBalance: Math.max(0, totalObligation - received - totalDiscount),
  });
}

async function syncSpimsDeletedFee(
  adminDb: FirebaseFirestore.Firestore,
  studentId: string
) {
  try {
    let studentRef = adminDb.collection('spims_students').doc(studentId);
    let studentSnap = await studentRef.get();

    if (!studentSnap.exists) {
      const snap = await adminDb
        .collection('spims_students')
        .where('studentId', '==', studentId)
        .limit(1)
        .get();
      if (!snap.empty) {
        studentRef = snap.docs[0].ref;
        studentSnap = await studentRef.get();
      } else if (/^\d+$/.test(studentId)) {
        const snapNum = await adminDb
          .collection('spims_students')
          .where('studentId', '==', Number(studentId))
          .limit(1)
          .get();
        if (!snapNum.empty) {
          studentRef = snapNum.docs[0].ref;
          studentSnap = await studentRef.get();
        }
      }
    }

    if (studentSnap.exists) {
      const studentData = studentSnap.data() as any;
      const pkg = Number(studentData?.totalPackage || studentData?.totalPackageAmount) || 0;

      // Use the resolved Firestore document ID for the query
      const resolvedStudentId = studentRef.id;
      
      // Query by both the resolved doc ID AND the original studentId to catch all records
      const [feesSnap1, feesSnap2] = await Promise.all([
        adminDb.collection('spims_fees').where('studentId', '==', resolvedStudentId).get(),
        resolvedStudentId !== studentId
          ? adminDb.collection('spims_fees').where('studentId', '==', studentId).get()
          : Promise.resolve({ docs: [] as any[] })
      ]);

      // Merge and deduplicate by doc ID
      const feeDocMap = new Map<string, any>();
      [...feesSnap1.docs, ...feesSnap2.docs].forEach(d => {
        if (!feeDocMap.has(d.id)) feeDocMap.set(d.id, { id: d.id, ...d.data() });
      });

      const approvedRows = Array.from(feeDocMap.values())
        .filter(r => r.status === 'approved');

      approvedRows.sort((a, b) => {
        const tA = toDate(a.date || a.createdAt).getTime();
        const tB = toDate(b.date || b.createdAt).getTime();
        return tA - tB;
      });

      let bal = pkg;
      for (const r of approvedRows) {
        bal -= Number(r.amount) || 0;
        await adminDb.collection('spims_fees').doc(r.id).set({
          remaining: Math.max(0, bal)
        }, { merge: true });
      }

      const remainingBal = Math.max(0, bal);
      await studentRef.update({
        totalReceived: pkg - remainingBal,
        remaining: remainingBal,
        remainingBalance: remainingBal,
        updatedAt: new Date(),
      });
    }
  } catch (err) {
    console.error('[syncSpimsDeletedFee] Error:', err);
  }
}

export async function deleteTransactionServer(params: {
  dept: Dept;
  txId: string;
  _collection?: string;
}): Promise<{ success: boolean; error?: string }> {
  const caller = await requireHqSuperadmin();
  try {
    const app = getAdminApp();
    const adminDb = getFirestore(app);

    const col = txCollection(params.dept, params._collection);
    let ref = adminDb.collection(col).doc(params.txId);
    let snap = await ref.get();

    // SPIMS fallback
    if (!snap.exists && params.dept === 'spims') {
      const altCol = col === 'spims_transactions' ? 'spims_fees' : 'spims_transactions';
      const altRef = adminDb.collection(altCol).doc(params.txId);
      const altSnap = await altRef.get();
      if (altSnap.exists) {
        ref = altRef;
        snap = altSnap;
      }
    }

    if (!snap.exists) return { success: false, error: 'Transaction not found.' };

    const data = snap.data() as any;
    
    // 1. If approved, reverse entity totals
    if (data.status === 'approved') {
      await reverseEntityTotalsServer(adminDb, params.dept, data);
    }

    // 2. If SPIMS and has feePaymentId, delete corresponding fee payment doc
    if (params.dept === 'spims' && data.feePaymentId) {
      await adminDb.collection('spims_fees').doc(data.feePaymentId).delete();
    }

    // 3. Delete the transaction itself
    await ref.delete();

    // 4. If Rehab or SPIMS, sync finance
    const entityId = data.patientId || data.studentId || data.seekerId || data.donorId || data.clientId;
    if (entityId) {
      if (params.dept === 'rehab') {
        await syncPatientFinance(adminDb, entityId);
      } else if (params.dept === 'spims') {
        await syncSpimsDeletedFee(adminDb, entityId);
      }
    }

    // 5. Add audit log
    await adminDb.collection('hq_audit').add({
      action: 'tx_deleted',
      actorId: caller.uid,
      actorName: caller.name,
      dept: params.dept,
      entityId: entityId || null,
      entityLabel: data.patientName || data.studentName || data.seekerName || data.staffName || null,
      message: `Permanently deleted ${params.dept} transaction`,
      details: {
        txId: params.txId,
        amount: data.amount ?? null,
        category: data.category ?? null,
      },
      createdAt: new Date(),
      performedBy: 'hq_superadmin',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete.' };
  }
}

export async function bulkDeleteTransactionsServer(params: {
  dept: Dept;
  txIds: string[];
}): Promise<{ success: boolean; processed: number; error?: string }> {
  const caller = await requireHqSuperadmin();
  try {
    const app = getAdminApp();
    const adminDb = getFirestore(app);
    const col = txCollection(params.dept);

    const ids = Array.from(new Set(params.txIds || [])).filter(Boolean);
    if (!ids.length) return { success: true, processed: 0 };

    let processed = 0;
    const entityIdsToSync = new Set<string>();

    for (const id of ids) {
      let ref = adminDb.collection(col).doc(id);
      let snap = await ref.get();

      // SPIMS fallback
      if (!snap.exists && params.dept === 'spims') {
        const altCol = col === 'spims_transactions' ? 'spims_fees' : 'spims_transactions';
        const altRef = adminDb.collection(altCol).doc(id);
        const altSnap = await altRef.get();
        if (altSnap.exists) {
          ref = altRef;
          snap = altSnap;
        }
      }

      if (!snap.exists) continue;

      const data = snap.data() as any;
      const entityId = data.patientId || data.studentId || data.seekerId || data.donorId || data.clientId;

      // 1. If approved, reverse entity totals
      if (data.status === 'approved') {
        await reverseEntityTotalsServer(adminDb, params.dept, data);
      }

      // 2. If SPIMS and has feePaymentId, delete fee payment
      if (params.dept === 'spims' && data.feePaymentId) {
        await adminDb.collection('spims_fees').doc(data.feePaymentId).delete();
      }

      // 3. Delete transaction doc
      await ref.delete();

      if (entityId) {
        entityIdsToSync.add(entityId);
      }
      processed++;
    }

    // 4. Sync client/student records
    for (const entityId of Array.from(entityIdsToSync)) {
      if (params.dept === 'rehab') {
        await syncPatientFinance(adminDb, entityId);
      } else if (params.dept === 'spims') {
        await syncSpimsDeletedFee(adminDb, entityId);
      }
    }

    // 5. Add audit log
    await adminDb.collection('hq_audit').add({
      action: 'tx_bulk_deleted',
      actorId: caller.uid,
      actorName: caller.name,
      dept: params.dept,
      message: `Bulk permanently deleted ${processed} ${params.dept} transactions`,
      details: { count: processed },
      createdAt: new Date(),
      performedBy: 'hq_superadmin',
    });

    return { success: true, processed };
  } catch (err: any) {
    return { success: false, processed: 0, error: err?.message || 'Failed.' };
  }
}

async function syncWelfareRecords(
  adminDb: FirebaseFirestore.Firestore,
  txId: string,
  txData: any,
  approvedBy: string
) {
  const childId = txData.childId;
  const staffId = txData.staffId;
  if (!childId && !staffId) return;

  try {
    let txDate = new Date();
    if (txData.date) {
      txDate = safeToDate(txData.date);
    }
    const year = txDate.getFullYear();
    const mm = String(txDate.getMonth() + 1).padStart(2, '0');
    const month = `${year}-${mm}`;

    if (txData.category === 'child_fee' && childId) {
      const feesRef = adminDb.collection('welfare_fees');
      const feesSnap = await feesRef
        .where('childId', '==', childId)
        .where('month', '==', month)
        .limit(1)
        .get();

      const amount = Number(txData.amount) || 0;

      if (feesSnap.empty) {
        const childSnap = await adminDb.collection('welfare_children').doc(childId).get();
        const packageAmount = childSnap.exists
          ? (Number(childSnap.data()?.packageAmount) || 60000)
          : 60000;
        const amountRemaining = Math.max(0, packageAmount - amount);

        await feesRef.add({
          childId,
          childName: txData.childName || '',
          month,
          packageAmount,
          amountPaid: amount,
          amountRemaining,
          payments: [{
            amount,
            date: txDate,
            transactionId: txId,
            approvedBy,
          }],
          lastPaymentDate: FieldValue.serverTimestamp(),
          lastPaymentAmount: amount,
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        const feeDoc = feesSnap.docs[0];
        const current = feeDoc.data();
        const newPaid = (Number(current.amountPaid) || 0) + amount;
        const newRemaining = Math.max(0, (Number(current.packageAmount) || 60000) - newPaid);
        const existingPayments = current.payments || [];

        await feeDoc.ref.update({
          amountPaid: newPaid,
          amountRemaining: newRemaining,
          lastPaymentDate: FieldValue.serverTimestamp(),
          lastPaymentAmount: amount,
          payments: [...existingPayments, {
            amount,
            date: txDate,
            transactionId: txId,
            approvedBy,
          }],
        });
      }
    }

    if (txData.category === 'canteen_deposit' && childId) {
      const canteenRef = adminDb.collection('welfare_canteen');
      const canteenSnap = await canteenRef
        .where('childId', '==', childId)
        .where('month', '==', month)
        .limit(1)
        .get();

      const amount = Number(txData.amount) || 0;

      if (canteenSnap.empty) {
        await canteenRef.add({
          childId,
          childName: txData.childName || '',
          month,
          totalDeposited: amount,
          totalSpent: 0,
          balance: amount,
          lastDepositDate: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        const canteenDoc = canteenSnap.docs[0];
        const current = canteenDoc.data();
        const newDeposited = (Number(current.totalDeposited) || 0) + amount;
        const newBalance = newDeposited - (Number(current.totalSpent) || 0);

        await canteenDoc.ref.update({
          totalDeposited: newDeposited,
          balance: newBalance,
          lastDepositDate: FieldValue.serverTimestamp(),
        });
      }
    }

    if (txData.category === 'canteen_expense' && childId) {
      const canteenRef = adminDb.collection('welfare_canteen');
      const canteenSnap = await canteenRef
        .where('childId', '==', childId)
        .where('month', '==', month)
        .limit(1)
        .get();

      const amount = Number(txData.amount) || 0;

      if (!canteenSnap.empty) {
        const canteenDoc = canteenSnap.docs[0];
        const current = canteenDoc.data();
        const newSpent = (Number(current.totalSpent) || 0) + amount;
        const newBalance = (Number(current.totalDeposited) || 0) - newSpent;

        await canteenDoc.ref.update({
          totalSpent: newSpent,
          balance: Math.max(0, newBalance),
        });
      }
    }

    if (txData.category === 'staff_salary' && staffId) {
      const salaryRef = adminDb.collection('welfare_salary_records');
      const salarySnap = await salaryRef
        .where('staffId', '==', staffId)
        .where('month', '==', month)
        .limit(1)
        .get();

      const amount = Number(txData.amount) || 0;

      if (salarySnap.empty) {
        await salaryRef.add({
          staffId,
          staffName: txData.staffName || '',
          month,
          amount,
          transactionId: txId,
          paidAt: FieldValue.serverTimestamp(),
          approvedBy,
        });
      } else {
        await salarySnap.docs[0].ref.update({
          amount: (Number(salarySnap.docs[0].data().amount) || 0) + amount,
          lastPaidAt: FieldValue.serverTimestamp(),
        });
      }
    }

  } catch (err) {
    console.error('[syncWelfareRecords] Error syncing:', err);
  }
}
