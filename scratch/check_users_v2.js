const admin = require('firebase-admin');
const fs = require('fs');

const env = fs.readFileSync('apps/web/.env.local', 'utf8');
const privateKeyMatch = env.match(/FIREBASE_ADMIN_PRIVATE_KEY="(.*?)"/);
if (!privateKeyMatch) {
  console.error('Private key not found');
  process.exit(1);
}

const privateKey = privateKeyMatch[1].replace(/\\n/g, '\n');

const serviceAccount = {
  projectId: "khanhub-5e552",
  clientEmail: "firebase-adminsdk-fbsvc@khanhub-5e552.iam.gserviceaccount.com",
  privateKey: privateKey
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
  console.log('--- REHAB USERS ---');
  const snap = await db.collection('rehab_users').limit(10).get();
  snap.forEach(doc => {
    console.log(`ID: ${doc.id} | CustomID: ${doc.data().customId} | Role: ${doc.data().role}`);
  });
}

check().catch(console.error);
