'use server'

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { deleteStaffProfile } from '@/lib/hq/superadmin/staff';

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

type Portal = 'hq' | 'rehab' | 'spims' | 'hospital' | 'sukoon' | 'job-center' | 'welfare' | 'social-media' | 'it';

export async function deletePortalUser(
  uid: string,
  portal: Portal
): Promise<{ success: boolean; error?: string }> {
  try {
    const app = getAdminApp();
    const auth = getAuth(app);

    // 1. Delete from Firebase Auth
    try {
      await auth.deleteUser(uid);
    } catch (e: any) {
      // If user is not found in Auth, we can ignore and just delete from DB
      if (e.code !== 'auth/user-not-found') {
         throw e;
      }
    }

    // 2. Delete from Firestore (using the existing deleteStaffProfile lib which deletes from the right collections)
    const compositeId = `${portal}_${uid}`;
    const res = await deleteStaffProfile(compositeId);
    if (!res.success) throw new Error(res.error);

    return { success: true };
  } catch (err: any) {
    console.error('Delete user error:', err);
    return { success: false, error: err?.message || 'Failed to delete user.' };
  }
}
