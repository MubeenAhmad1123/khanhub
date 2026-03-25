// REQUIRED environment variables in .env.local:
// FIREBASE_PROJECT_ID=your-project-id
// FIREBASE_CLIENT_EMAIL=your-service-account-email
// FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
// These come from Firebase Console → Project Settings → Service Accounts → Generate new private key

'use server'

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { RehabRole } from '@/types/rehab';

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!getApps().length) {
  initializeApp({
    credential: cert(firebaseAdminConfig),
  });
}

const auth = getAuth();
const db = getFirestore();
const DOMAIN = '@rehab.khanhub';

export async function createRehabUserServer(
  customId: string,
  password: string,
  role: RehabRole,
  displayName: string,
  patientId?: string
): Promise<{ success: boolean; uid?: string; error?: string }> {
  try {
    const email = `${customId.toLowerCase()}${DOMAIN}`;
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
    });

    await db.collection('rehab_users').doc(userRecord.uid).set({
      customId,
      role,
      displayName,
      patientId: patientId || null,
      isActive: true,
      createdAt: new Date(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    console.error('Error creating rehab user:', error);
    return { success: false, error: error.message };
  }
}

export async function deactivateRehabUser(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    await auth.updateUser(uid, { disabled: true });
    await db.collection('rehab_users').doc(uid).update({ isActive: false });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resetRehabPassword(uid: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    await auth.updateUser(uid, { password: newPassword });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
