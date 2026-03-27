'use server'

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const DOMAIN = '@rehab.khanhub';

function getAdminApp(): App {
  const existing = getApps().find(a => a.name === 'rehab-admin');
  if (existing) return existing;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing');

  const sa = JSON.parse(json);

  return initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
  }, 'rehab-admin');
}

export async function createRehabUserServer(
  customId: string,
  password: string,
  role: string,
  displayName: string,
  patientId?: string
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp();
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);
    const email = `${customId.toLowerCase()}${DOMAIN}`;

    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      // If user exists, delete and recreate (only safe during setup)
      await adminAuth.deleteUser(existingUser.uid);
      await adminDb.collection('rehab_users').doc(existingUser.uid).delete();
    } catch {
      // User doesn't exist — continue normally
    }

    const userRecord = await adminAuth.createUser({ email, password, displayName });
    await getFirestore(app).collection('rehab_users').doc(userRecord.uid).set({
      customId,
      role,
      displayName,
      patientId: patientId || null,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true, uid: userRecord.uid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deactivateRehabUser(
  uid: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
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
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  try {
    const app = getAdminApp();
    await getAuth(app).updateUser(uid, { password: newPassword });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function debugEnvVars(): Promise<{
  hasJson: boolean;
  isValidJson: boolean;
  hasProjectId: boolean;
  hasClientEmail: boolean;
  hasPrivateKey: boolean;
  projectIdValue: string;
  privateKeyFirstChars: string;
}> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    return {
      hasJson: false, isValidJson: false,
      hasProjectId: false, hasClientEmail: false, hasPrivateKey: false,
      projectIdValue: 'MISSING', privateKeyFirstChars: 'MISSING',
    };
  }
  try {
    const sa = JSON.parse(json);
    return {
      hasJson: true,
      isValidJson: true,
      hasProjectId: !!sa.project_id,
      hasClientEmail: !!sa.client_email,
      hasPrivateKey: !!sa.private_key,
      projectIdValue: (sa.project_id || '').substring(0, 10) + '...',
      privateKeyFirstChars: (sa.private_key || '').substring(0, 27),
    };
  } catch {
    return {
      hasJson: true, isValidJson: false,
      hasProjectId: false, hasClientEmail: false, hasPrivateKey: false,
      projectIdValue: 'JSON_PARSE_FAILED', privateKeyFirstChars: 'JSON_PARSE_FAILED',
    };
  }
}

export async function markSetupComplete(
  superAdminCustomId: string,
  cashierCustomId: string
): Promise<{ success: boolean; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  try {
    const app = getAdminApp();
    await getFirestore(app).collection('rehab_meta').doc('setup').set({
      completed: true,
      completedAt: new Date(),
      superAdminCustomId,
      cashierCustomId,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createStaffMemberServer(
  customId: string,
  password: string,
  displayName: string,
  staffRole: string,
  phone?: string,
  salary?: number
): Promise<{ success: boolean; uid?: string; staffDocId?: string; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp();
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);
    const email = `${customId.toLowerCase()}@rehab.khanhub`;

    // Clean up if user already exists
    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      await adminAuth.deleteUser(existingUser.uid);
      await adminDb.collection('rehab_users').doc(existingUser.uid).delete();
    } catch {
      // fine
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({ email, password, displayName });

    // Write to rehab_users (for login)
    await adminDb.collection('rehab_users').doc(userRecord.uid).set({
      customId,
      role: 'staff',
      displayName,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Write to rehab_staff (for attendance + roster)
    const staffRef = adminDb.collection('rehab_staff').doc();
    await staffRef.set({
      name: displayName,
      role: staffRole,
      phone: phone || null,
      salary: salary || 0,
      joiningDate: FieldValue.serverTimestamp(),
      isActive: true,
      photoUrl: null,
      loginUserId: userRecord.uid,
    });

    return { success: true, uid: userRecord.uid, staffDocId: staffRef.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}