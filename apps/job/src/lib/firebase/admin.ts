import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;

let credential: any = null;

if (serviceAccountKey) {
  try {
    credential = cert(JSON.parse(serviceAccountKey));
  } catch (err) {
    console.error('[Firebase Admin] Failed to parse serviceAccountKey:', err);
  }
} else if (projectId && clientEmail && rawPrivateKey) {
  try {
    const cleanKey = rawPrivateKey
      .replace(/^["']|["']$/g, '') // Remove wrapping quotes
      .replace(/\\n/g, '\n')       // Replace literal \n with real newlines
      .trim();                     // Remove any accidental whitespace
    credential = cert({
      projectId,
      clientEmail,
      privateKey: cleanKey,
    });
  } catch (err: any) {
    console.error('[Firebase Admin] Failed to initialize credentials:', err.message);
  }
}

if (!credential) {
  console.warn('⚠️ Firebase Admin credentials are not set. Referral tracking will be skipped.');
}

const app = getApps().length === 0 && credential
  ? initializeApp({ credential })
  : getApps()[0];

export const adminDb = credential ? getFirestore(app) : null;
