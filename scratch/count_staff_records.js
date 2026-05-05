const admin = require('firebase-admin');
const fs = require('fs');

const env = fs.readFileSync('apps/web/.env.local', 'utf8');
const privateKeyMatch = env.match(/FIREBASE_ADMIN_PRIVATE_KEY="(.*?)"/);
const privateKey = privateKeyMatch[1].replace(/\\n/g, '\n');

const serviceAccount = {
  projectId: "khanhub-5e552",
  clientEmail: "firebase-adminsdk-fbsvc@khanhub-5e552.iam.gserviceaccount.com",
  privateKey: privateKey
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function check() {
  const uid = 'aHTOgseUV4R1LDP6OUPkXLiSYJs1';
  const prefix = 'hospital';
  
  const collections = [
    `${prefix}_attendance`,
    `${prefix}_dress_logs`,
    `${prefix}_duty_logs`,
    `${prefix}_salary_records`,
    `${prefix}_special_tasks`
  ];
  
  console.log(`Checking counts for UID: ${uid}`);
  
  for (const col of collections) {
    const snap = await db.collection(col).where('staffId', '==', uid).get();
    console.log(`${col}: ${snap.size} records`);
  }
}

check().catch(console.error);
