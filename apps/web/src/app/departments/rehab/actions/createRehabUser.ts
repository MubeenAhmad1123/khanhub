'use server'

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const DOMAIN = '@rehab.khanhub';

function getServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getAdminApp(): App {
  const existing = getApps().find(a => a.name === 'rehab-admin');
  if (existing) return existing;

  const sa = getServiceAccount();
  if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing or invalid JSON');

  return initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
  }, 'rehab-admin');
}

function checkEnvVars(): string | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return 'Missing FIREBASE_SERVICE_ACCOUNT_JSON in environment variables';
  try {
    const parsed = JSON.parse(json);
    if (!parsed.project_id) return 'FIREBASE_SERVICE_ACCOUNT_JSON missing project_id';
    if (!parsed.client_email) return 'FIREBASE_SERVICE_ACCOUNT_JSON missing client_email';
    if (!parsed.private_key) return 'FIREBASE_SERVICE_ACCOUNT_JSON missing private_key';
    return null;
  } catch {
    return 'FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON';
  }
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
    await getFirestore(app)
      .collection('rehab_users')
      .doc(uid)
      .update({ isActive: false });
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
      hasJson: false,
      isValidJson: false,
      hasProjectId: false,
      hasClientEmail: false,
      hasPrivateKey: false,
      projectIdValue: 'MISSING',
      privateKeyFirstChars: 'MISSING',
    };
  }
  try {
    const parsed = JSON.parse(json);
    return {
      hasJson: true,
      isValidJson: true,
      hasProjectId: !!parsed.project_id,
      hasClientEmail: !!parsed.client_email,
      hasPrivateKey: !!parsed.private_key,
      projectIdValue: (parsed.project_id || '').substring(0, 10) + '...',
      privateKeyFirstChars: (parsed.private_key || '').substring(0, 27),
    };
  } catch {
    return {
      hasJson: true,
      isValidJson: false,
      hasProjectId: false,
      hasClientEmail: false,
      hasPrivateKey: false,
      projectIdValue: 'JSON_PARSE_FAILED',
      privateKeyFirstChars: 'JSON_PARSE_FAILED',
    };
  }
}
