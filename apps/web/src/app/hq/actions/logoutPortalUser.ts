'use server'

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === 'hq-admin');
  if (existing) return existing;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing');

  const sa = JSON.parse(json);

  return initializeApp(
    {
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    },
    'hq-admin'
  );
}

type Portal = 'hq' | 'rehab' | 'spims' | 'hospital' | 'sukoon' | 'job-center' | 'welfare';

const COLLECTION_BY_PORTAL: Record<Portal, string> = {
  hq: 'hq_users',
  rehab: 'rehab_users',
  spims: 'spims_users',
  hospital: 'hospital_users',
  sukoon: 'sukoon_users',
  'job-center': 'job_center_users',
  welfare: 'welfare_users',
};

export async function logoutPortalUser(
  uid: string,
  portal: Portal
): Promise<{ success: boolean; error?: string }> {
  try {
    const app = getAdminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    // 1. Revoke tokens in Firebase Auth
    await auth.revokeRefreshTokens(uid);

    // 2. Mark in Firestore for immediate client-side detection (if implemented in hooks)
    const col = COLLECTION_BY_PORTAL[portal];
    if (col) {
      await db.collection(col).doc(uid).update({
        forceLogoutAt: new Date().toISOString()
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('Logout user error:', err);
    return { success: false, error: err?.message || 'Failed to logout user.' };
  }
}
