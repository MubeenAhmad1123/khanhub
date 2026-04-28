import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let _adminApp: App | null = null;
let _adminAuth: Auth | null = null;
let _adminDb: Firestore | null = null;

function initAdmin(): App {
  if (_adminApp) return _adminApp;
  
  if (getApps().length > 0) {
    _adminApp = getApps()[0];
    return _adminApp;
  }

  // PRIMARY: Use full service account JSON (most reliable)
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      _adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
      return _adminApp;
    } catch (err) {
      console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err);
    }
  }

  // FALLBACK: Use individual env vars
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || '';

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error(
      `[Firebase Admin] Missing Credentials. \n` +
      `PROJECT_ID: ${projectId ? '✓' : '✗'}\n` +
      `CLIENT_EMAIL: ${clientEmail ? '✓' : '✗'}\n` +
      `PRIVATE_KEY: ${rawPrivateKey ? '✓' : '✗'}`
    );
  }

  // Clean the private key thoroughly
  const cleanKey = rawPrivateKey
    .replace(/^["']|["']$/g, '') // Remove wrapping quotes
    .replace(/\\n/g, '\n')       // Replace literal \n with real newlines
    .trim();                     // Remove any accidental whitespace

  _adminApp = initializeApp({
    credential: cert({ 
      projectId, 
      clientEmail, 
      privateKey: cleanKey 
    }),
  });
  
  return _adminApp;
}

export function getAdminAuth(): Auth {
  if (_adminAuth) return _adminAuth;
  _adminAuth = getAuth(initAdmin());
  return _adminAuth;
}

export function getAdminDb(): Firestore {
  if (_adminDb) return _adminDb;
  _adminDb = getFirestore(initAdmin());
  return _adminDb;
}

export const adminAuth = {
  createCustomToken: (...args: Parameters<Auth['createCustomToken']>) => 
    getAdminAuth().createCustomToken(...args),
  verifyIdToken: (...args: Parameters<Auth['verifyIdToken']>) => 
    getAdminAuth().verifyIdToken(...args),
  createUser: (...args: Parameters<Auth['createUser']>) => 
    getAdminAuth().createUser(...args),
  getUser: (...args: Parameters<Auth['getUser']>) => 
    getAdminAuth().getUser(...args),
  updateUser: (...args: Parameters<Auth['updateUser']>) => 
    getAdminAuth().updateUser(...args),
  deleteUser: (...args: Parameters<Auth['deleteUser']>) => 
    getAdminAuth().deleteUser(...args),
  setCustomUserClaims: (...args: Parameters<Auth['setCustomUserClaims']>) => 
    getAdminAuth().setCustomUserClaims(...args),
};

export const adminDb = {
  collection: (...args: Parameters<Firestore['collection']>) => 
    getAdminDb().collection(...args),
  doc: (...args: Parameters<Firestore['doc']>) => 
    getAdminDb().doc(...args),
  runTransaction: (...args: Parameters<Firestore['runTransaction']>) => 
    getAdminDb().runTransaction(...args),
  batch: () => getAdminDb().batch(),
};
