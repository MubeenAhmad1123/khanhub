'use server'

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

const adminApp = getApps().find(a => a.name === 'rehab-admin')
  || initializeApp({
    credential: cert(firebaseConfig),
  }, 'rehab-admin');

const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

const DOMAIN = '@rehab.khanhub';

/**
 * Creates a new user in Firebase Auth and a corresponding profile in the rehab_users collection.
 */
export async function createRehabUserServer(
  customId: string,
  password: string,
  role: string,
  displayName: string,
  patientId?: string
): Promise<{ success: boolean; uid?: string; error?: string }> {
  // STEP 4: Safety check for environment variables
  if (!process.env.FIREBASE_PROJECT_ID || 
      !process.env.FIREBASE_CLIENT_EMAIL || 
      !process.env.FIREBASE_PRIVATE_KEY) {
    return { 
      success: false, 
      error: 'Missing Firebase Admin environment variables. Check .env.local' 
    };
  }

  try {
    const email = `${customId.toLowerCase()}${DOMAIN}`;
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    await adminDb.collection('rehab_users').doc(userRecord.uid).set({
      customId,
      role,
      displayName,
      patientId: patientId || null,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (err: any) {
    console.error('Error in createRehabUserServer:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Deactivates a user's Auth account and marks them inactive in Firestore.
 */
export async function deactivateRehabUser(uid: string): Promise<{ success: boolean; error?: string }> {
  if (!process.env.FIREBASE_PROJECT_ID || 
      !process.env.FIREBASE_CLIENT_EMAIL || 
      !process.env.FIREBASE_PRIVATE_KEY) {
    return { 
      success: false, 
      error: 'Missing Firebase Admin environment variables. Check .env.local' 
    };
  }

  try {
    await adminAuth.updateUser(uid, { disabled: true });
    await adminDb.collection('rehab_users').doc(uid).update({ isActive: false });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Resets a user's password to a new one.
 */
export async function resetRehabPassword(uid: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (!process.env.FIREBASE_PROJECT_ID || 
      !process.env.FIREBASE_CLIENT_EMAIL || 
      !process.env.FIREBASE_PRIVATE_KEY) {
    return { 
      success: false, 
      error: 'Missing Firebase Admin environment variables. Check .env.local' 
    };
  }

  try {
    await adminAuth.updateUser(uid, { password: newPassword });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
