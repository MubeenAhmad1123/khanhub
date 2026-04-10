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
  'job-center': 'job-center_users',
  welfare: 'welfare_users',
};

export async function resetPortalUserPassword(
  uid: string,
  portal: Portal,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  try {
    const app = getAdminApp();
    await getAuth(app).updateUser(uid, { password: newPassword });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reset password.' };
  }
}
