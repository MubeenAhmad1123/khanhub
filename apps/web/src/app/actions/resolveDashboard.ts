'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === 'dashboard-resolver');
  if (existing) return existing;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
     // If env is missing, we can't do server-side detection
     // but we shouldn't crash here.
     throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing');
  }

  const sa = JSON.parse(json);
  return initializeApp(
    {
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    },
    'dashboard-resolver'
  );
}

export async function resolveDashboardPathOnServer(uid: string): Promise<string | null> {
  if (!uid) return null;

  try {
    const app = getAdminApp();
    const db = getFirestore(app);

    // 1. Check HQ Users
    const hqDoc = await db.collection('hq_users').doc(uid).get();
    if (hqDoc.exists) {
      const data = hqDoc.data() || {};
      const role = String(data.role || '').toLowerCase();
      if (role === 'superadmin') return '/hq/dashboard/superadmin';
      if (role === 'manager') return '/hq/dashboard/manager';
      if (role === 'cashier') return '/hq/dashboard/cashier';
    }

    // 2. Check Rehab Users
    const rehabDoc = await db.collection('rehab_users').doc(uid).get();
    if (rehabDoc.exists) {
      const data = rehabDoc.data() || {};
      const role = String(data.role || '').toLowerCase();
      if (role === 'admin') return '/departments/rehab/dashboard/admin';
      if (role === 'cashier') return '/departments/rehab/dashboard/cashier';
      if (role === 'staff') return '/departments/rehab/dashboard/staff';
      if (role === 'superadmin') return '/departments/rehab/dashboard/superadmin';
      if (role === 'family') {
        return data.patientId ? `/departments/rehab/dashboard/family/${data.patientId}` : '/departments/rehab/dashboard';
      }
    }

    // 3. Check SPIMS Users
    const spimsDoc = await db.collection('spims_users').doc(uid).get();
    if (spimsDoc.exists) {
      const data = spimsDoc.data() || {};
      const role = String(data.role || '').toLowerCase();
      if (role === 'admin') return '/departments/spims/dashboard/admin';
      if (role === 'student') return '/departments/spims/dashboard/student';
      if (role === 'staff') return '/departments/spims/dashboard/staff';
      if (role === 'cashier') return '/departments/spims/dashboard/cashier';
      if (role === 'superadmin') return '/departments/spims/dashboard/superadmin';
    }

    // 4. Check Job Center
    const jobDoc = await db.collection('job_center_users').doc(uid).get();
    if (jobDoc.exists) {
        const data = jobDoc.data() || {};
        const role = String(data.role || '').toLowerCase();
        return `/departments/job-center/dashboard${role ? `/${role}` : ''}`;
    }

    // 5. Check other departments if needed...
    
    return null;
  } catch (error) {
    console.error('[DashboardResolver] Server error:', error);
    return null;
  }
}
