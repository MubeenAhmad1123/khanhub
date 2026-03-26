'use server'

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const DOMAIN = '@rehab.khanhub';

// Lazy initialization — runs only when a function is called, not on import
function getAdminApp(): App {
  const existing = getApps().find(a => a.name === 'rehab-admin');
  if (existing) return existing;
  
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  }, 'rehab-admin');
}

function checkEnvVars(): string | null {
  if (!process.env.FIREBASE_PROJECT_ID) return 'Missing FIREBASE_PROJECT_ID';
  if (!process.env.FIREBASE_CLIENT_EMAIL) return 'Missing FIREBASE_CLIENT_EMAIL';
  if (!process.env.FIREBASE_PRIVATE_KEY) return 'Missing FIREBASE_PRIVATE_KEY';
  return null;
}

export async function createRehabUserServer(
  customId: string,
  password: string,
  role: string,
  displayName: string,
  patientId?: string
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const envError = checkEnvVars();
  if (envError) return { success: false, error: envError };

  try {
    const app = getAdminApp();
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);

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
    console.error('createRehabUserServer error:', err);
    return { success: false, error: err.message };
  }
}

export async function deactivateRehabUser(
  uid: string
): Promise<{ success: boolean; error?: string }> {
  const envError = checkEnvVars();
  if (envError) return { success: false, error: envError };

  try {
    const app = getAdminApp();
    await getAuth(app).updateUser(uid, { disabled: true });
    await getFirestore(app).collection('rehab_users').doc(uid).update({ isActive: false });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetRehabPassword(
  uid: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const envError = checkEnvVars();
  if (envError) return { success: false, error: envError };

  try {
    const app = getAdminApp();
    await getAuth(app).updateUser(uid, { password: newPassword });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function debugEnvVars(): Promise<{
  hasProjectId: boolean;
  hasClientEmail: boolean;
  hasPrivateKey: boolean;
  projectIdValue: string;
}> {
  return {
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    projectIdValue: process.env.FIREBASE_PROJECT_ID 
      ? process.env.FIREBASE_PROJECT_ID.substring(0, 8) + '...' 
      : 'UNDEFINED',
  };
}
