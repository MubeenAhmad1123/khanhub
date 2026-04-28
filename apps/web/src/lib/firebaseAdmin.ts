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

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (privateKey) {
    // 1. Remove surrounding quotes if they exist
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    // 2. Replace escaped newlines (\\n) with actual newlines (\n)
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `[Firebase Admin] Missing environment variables.\n` +
      `FIREBASE_ADMIN_PROJECT_ID: ${projectId ? '✓' : '✗ MISSING'}\n` +
      `FIREBASE_ADMIN_CLIENT_EMAIL: ${clientEmail ? '✓' : '✗ MISSING'}\n` +
      `FIREBASE_ADMIN_PRIVATE_KEY: ${privateKey ? '✓' : '✗ MISSING'}`
    );
  }

  _adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
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

// Named exports for direct import compatibility
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
