'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === 'dashboard-resolver');
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
    'dashboard-resolver'
  );
}

const DEPT_CONFIGS = [
  { domain: '@rehab.khanhub', collection: 'rehab_users', pathBase: '/departments/rehab/dashboard' },
  { domain: '@jobcenter.khanhub', collection: 'jobcenter_users', pathBase: '/departments/job-center/dashboard' },
  { domain: '@spims.khanhub', collection: 'spims_users', pathBase: '/departments/spims/dashboard' },
  { domain: '@hospital.khanhub', collection: 'hospital_users', pathBase: '/departments/hospital/dashboard' },
  { domain: '@sukoon.khanhub', collection: 'sukoon_users', pathBase: '/departments/sukoon/dashboard' },
  { domain: '@welfare.khanhub', collection: 'welfare_users', pathBase: '/departments/welfare/dashboard' },
];

export async function resolveDashboardPathOnServer(uid: string): Promise<string | null> {
  if (!uid) return null;

  try {
    const app = getAdminApp();
    const db = getFirestore(app);
    const auth = getAuth(app);

    // 1. Check Routing Cache (HIGHEST EFFICIENCY)
    const cacheDoc = await db.collection('system_routing_cache').doc(uid).get();
    if (cacheDoc.exists) {
      const cachedPath = cacheDoc.data()?.path;
      if (cachedPath) return cachedPath;
    }

    const user = await auth.getUser(uid);
    const email = user.email || '';
    let resolvedPath: string | null = null;

    // 2. Fast Track by Email Domain
    for (const config of DEPT_CONFIGS) {
      if (email.endsWith(config.domain)) {
        const doc = await db.collection(config.collection).doc(uid).get();
        if (doc.exists) {
          const data = doc.data() || {};
          const role = String(data.role || '').toLowerCase();
          if (role === 'family' && data.patientId) resolvedPath = `${config.pathBase}/family/${data.patientId}`;
          else if (role === 'family') resolvedPath = `${config.pathBase}/family`;
          else resolvedPath = role ? `${config.pathBase}/${role}` : config.pathBase;
          break;
        }
      }
    }

    // 3. Check HQ Users
    if (!resolvedPath) {
      const hqDoc = await db.collection('hq_users').doc(uid).get();
      if (hqDoc.exists) {
        const data = hqDoc.data() || {};
        const role = String(data.role || '').toLowerCase();
        if (role === 'superadmin') resolvedPath = '/hq/dashboard/superadmin';
        else if (role === 'manager') resolvedPath = '/hq/dashboard/manager';
        else if (role === 'cashier') resolvedPath = '/hq/dashboard/cashier';
        else resolvedPath = '/hq/dashboard';
      }
    }

    // 4. Brute Force Scan (Last resort)
    if (!resolvedPath) {
      for (const config of DEPT_CONFIGS) {
        const doc = await db.collection(config.collection).doc(uid).get();
        if (doc.exists) {
          const data = doc.data() || {};
          const role = String(data.role || '').toLowerCase();
          if (role === 'family' && data.patientId) resolvedPath = `${config.pathBase}/family/${data.patientId}`;
          else resolvedPath = role ? `${config.pathBase}/${role}` : config.pathBase;
          break;
        }
      }
    }

    // 5. Update Cache if path found
    if (resolvedPath) {
      await db.collection('system_routing_cache').doc(uid).set({
        path: resolvedPath,
        email: email,
        updatedAt: new Date().toISOString()
      });
    }

    return resolvedPath;
  } catch (error) {
    console.error('[DashboardResolver] Server error:', error);
    return null;
  }
}
