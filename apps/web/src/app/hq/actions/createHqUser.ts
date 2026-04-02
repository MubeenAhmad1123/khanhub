'use server'

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { HqUser, HqRole, HqMeta } from '@/types/hq';

const DOMAIN = '@hq.khanhub.com';

function getAdminApp(): App {
  const existing = getApps().find(a => a.name === 'hq-admin');
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
  }, 'hq-admin');
}

export async function markHqSetupComplete(superadminUid: string): Promise<void> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing');

  const app = getAdminApp();
  await getFirestore(app).collection('hq_meta').doc('setup').set({
    completed: true,
    completedAt: new Date().toISOString(),
    superadminId: superadminUid,
  } as HqMeta);
}

export async function createHqUserServer(data: {
  customId: string;
  name: string;
  role: HqRole;
  password: string;
  phone?: string;
  createdBy: string;
}): Promise<{ success: boolean; uid?: string; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp();
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);
    const email = `${data.customId.toLowerCase().replace(/-/g, '.')}@hq.khanhub.com`;

    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      await adminAuth.deleteUser(existingUser.uid);
      await adminDb.collection('hq_users').doc(existingUser.uid).delete();
    } catch {
      // User doesn't exist — continue normally
    }

    const userRecord = await adminAuth.createUser({ email, password: data.password, displayName: data.name });
    
    const hqUser: Omit<HqUser, 'uid'> = {
      customId: data.customId,
      name: data.name,
      role: data.role,
      password: data.password,
      email,
      ...(data.phone ? { phone: data.phone } : {}),
      createdBy: data.createdBy,
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    
    await adminDb.collection('hq_users').doc(userRecord.uid).set(hqUser);

    // Fire-and-forget audit log
    try {
      await adminDb.collection('hq_audit').add({
        action: 'user_created',
        performedBy: 'server_action',
        details: { customId: data.customId, role: data.role, name: data.name },
        createdAt: new Date(),
      });
    } catch {}
    
    return { success: true, uid: userRecord.uid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function checkHqSetupStatus(): Promise<boolean> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return false;

  try {
    const app = getAdminApp();
    const doc = await getFirestore(app).collection('hq_meta').doc('setup').get();
    if (!doc.exists) return false;
    const data = doc.data() as HqMeta;
    return data.completed === true;
  } catch {
    return false;
  }
}