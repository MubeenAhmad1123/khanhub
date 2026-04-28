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
  const compositeId = 'hospital_aHTOgseUV4R1LDP6OUPkXLiSYJs1';
  const idx = compositeId.indexOf('_');
  const dept = compositeId.slice(0, idx);
  const uid = compositeId.slice(idx + 1);
  
  console.log(`Parsed: Dept=${dept}, UID=${uid}`);
  
  const docRef = db.collection('hospital_users').doc(uid);
  const snap = await docRef.get();
  
  if (snap.exists) {
    console.log('Document found!', snap.data().name);
  } else {
    console.log('Document NOT found by UID.');
    // Check if it's stored by compositeId
    const snap2 = await db.collection('hospital_users').doc(compositeId).get();
    if (snap2.exists) {
        console.log('Document found by COMPOSITE ID!', snap2.data().name);
    } else {
        console.log('Document NOT found by Composite ID either.');
        // List some docs to see pattern
        const list = await db.collection('hospital_users').limit(3).get();
        list.forEach(d => console.log('Existing ID:', d.id));
    }
  }
}

check().catch(console.error);
