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

// Construct service account JSON
const privateKey = env.FIREBASE_PRIVATE_KEY
  ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
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

async function run() {
  try {
    console.log('Querying students for Nabeel Raza or roll 204...');
    
    // Find student
    const studentQuery = await db.collection('spims_students')
      .where('name', '>=', 'Nabeel')
      .get();
      
    if (studentQuery.empty) {
      console.log('No student found matching "Nabeel"');
      return;
    }
    
    for (const doc of studentQuery.docs) {
      const sData = doc.data();
      console.log(`\n===========================================`);
      console.log(`Student ID: ${doc.id}`);
      console.log(`Name: ${sData.name}`);
      console.log(`totalPackageAmount: ${sData.totalPackageAmount}`);
      console.log(`totalPackage: ${sData.totalPackage}`);
      console.log(`totalReceived: ${sData.totalReceived}`);
      console.log(`remaining: ${sData.remaining}`);
      console.log(`remainingBalance: ${sData.remainingBalance}`);
      
      // Query their transactions
      console.log(`\nTransactions (spims_transactions):`);
      const txs = await db.collection('spims_transactions')
        .where('studentId', '==', doc.id)
        .get();
        
      txs.forEach(t => {
        const td = t.data();
        console.log(` - TX ${t.id}: amount=${td.amount}, category=${td.category}, categoryName=${td.categoryName}, spimsFeeSubtype=${td.spimsFeeSubtype}, status=${td.status}, feePaymentId=${td.feePaymentId}`);
      });
      
      // Query their fees
      console.log(`\nFees (spims_fees):`);
      const fees = await db.collection('spims_fees')
        .where('studentId', '==', doc.id)
        .get();
        
      fees.forEach(f => {
        const fd = f.data();
        console.log(` - FEE ${f.id}: amount=${fd.amount}, type=${fd.type}, status=${fd.status}, remaining=${fd.remaining}, date=${fd.date}`);
      });
    }
  } catch (err) {
    console.error('Error querying Firestore:', err);
  }
}

run();
