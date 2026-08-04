const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const lineMatch = envContent.match(/FIREBASE_PRIVATE_KEY="(.*)"/);
let rawKey = lineMatch ? lineMatch[1] : '';

// Replace \n with actual newline, and strip any backslash before other characters
const cleanPem = rawKey
  .replace(/\\n/g, '\n')
  .replace(/\\(.)/g, '$1')
  .trim();

console.log('--- CLEANED PEM ---');
console.log(cleanPem);

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'khanhub-5e552',
      clientEmail: 'firebase-adminsdk-fbsvc@khanhub-5e552.iam.gserviceaccount.com',
      privateKey: cleanPem
    })
  });
  console.log('🎉🎉🎉 SUCCESS! Firebase Admin successfully authenticated with Firestore! 🎉🎉🎉');
} catch (err) {
  console.error('PEM Test Error:', err.message);
}
