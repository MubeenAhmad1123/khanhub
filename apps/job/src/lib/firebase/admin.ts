import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY is not set in .env.local. Referral tracking will be skipped.');
}

const app = getApps().length === 0 && serviceAccountKey
  ? initializeApp({ 
      credential: cert(JSON.parse(serviceAccountKey)) 
    })
  : getApps()[0];

export const adminDb = serviceAccountKey ? getFirestore(app) : null;
