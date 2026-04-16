'use server'

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const DOMAIN = '@jobcenter.khanhub';

function getAdminApp(): App {
  const existing = getApps().find(a => a.name === 'job-center-admin');
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
  }, 'job-center-admin');
}

export async function createJobCenterUserServer(
  customId: string,
  password: string,
  role: string,
  displayName: string,
  seekerId?: string,
  employerId?: string,
  emailDomain: string = DOMAIN,
  userCollection: string = 'jobcenter_users'
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp();
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);

    // Guardrails
    if (role === 'seeker') {
      try {
        const setupSnap = await adminDb.collection('jobcenter_meta').doc('setup').get();
        const setupData = setupSnap.data() as any;
        if (setupSnap.exists && setupData?.completed === true) {
          const reservedSuper = String(setupData?.superAdminCustomId || '').toUpperCase();
          const reservedCashier = String(setupData?.cashierCustomId || '').toUpperCase();
          const incoming = String(customId || '').toUpperCase();
          if (incoming && (incoming === reservedSuper || incoming === reservedCashier)) {
            return {
              success: false,
              error: 'This Login ID is reserved. Please choose a different Seeker Login ID.',
            };
          }
        }
      } catch {
        // If guardrail check fails, we still rely on the collision check below.
      }
    }

    const email = `${customId.toLowerCase()}${emailDomain}`;

    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      const existingProfileSnap = await adminDb.collection(userCollection).doc(existingUser.uid).get();
      const nextSeekerId = seekerId || null;

      if (!existingProfileSnap.exists) {
        if (role === 'seeker' || role === 'employer') {
          return {
            success: false,
            error: `Login ID already exists. Please use a different ${role === 'seeker' ? 'Seeker' : 'Employer'} Login ID.`,
          };
        }

        await adminDb.collection(userCollection).doc(existingUser.uid).set({
          customId,
          role,
          displayName,
          password,
          seekerId: nextSeekerId,
          employerId: employerId || null,
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
        });
        return { success: true, uid: existingUser.uid };
      }

      const existingProfile = existingProfileSnap.data() as any;

      if (existingProfile?.role && existingProfile.role !== role) {
        return {
          success: false,
          error: `Login ID already exists for a different account type. Please use the correct Login ID.`,
        };
      }

      if (role === 'seeker' && existingProfile?.seekerId && existingProfile.seekerId !== nextSeekerId) {
        return {
          success: false,
          error: `This Seeker Login ID is already assigned to another seeker.`,
        };
      }

      if (role === 'employer' && existingProfile?.employerId && existingProfile.employerId !== employerId) {
        return {
          success: false,
          error: `This Employer Login ID is already assigned to another company.`,
        };
      }

      await adminDb.collection(userCollection).doc(existingUser.uid).set(
        {
          customId,
          role,
          displayName,
          password,
          seekerId: nextSeekerId,
          employerId: employerId || null,
          isActive: true,
        },
        { merge: true }
      );

      return { success: true, uid: existingUser.uid };
    } catch {
      // User doesn't exist
    }

    const userRecord = await adminAuth.createUser({ email, password, displayName });
    await getFirestore(app).collection(userCollection).doc(userRecord.uid).set({
      customId,
      role,
      displayName,
      password,
      seekerId: seekerId || null,
      employerId: employerId || null,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    
    try {
      await getFirestore(app).collection('jobcenter_audit').add({
        action: 'user_created',
        performedBy: 'server_action',
        details: { customId, role, displayName },
        createdAt: new Date(),
      });
    } catch {}
    return { success: true, uid: userRecord.uid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deactivateJobCenterUser(
  uid: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  try {
    const app = getAdminApp();
    await getAuth(app).updateUser(uid, { disabled: true });
    await getFirestore(app).collection('jobcenter_users').doc(uid).update({ isActive: false });
    try {
      await getFirestore(app).collection('jobcenter_audit').add({
        action: 'user_deactivated',
        performedBy: 'server_action',
        details: { uid },
        createdAt: new Date(),
      });
    } catch {}
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetJobCenterPassword(
  uid: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  try {
    const app = getAdminApp();
    await getAuth(app).updateUser(uid, { password: newPassword });
    await getFirestore(app).collection('jobcenter_users').doc(uid).update({
      password: newPassword,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function markJobCenterSetupComplete(
  superAdminCustomId: string,
  cashierCustomId: string
): Promise<{ success: boolean; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  try {
    const app = getAdminApp();
    await getFirestore(app).collection('jobcenter_meta').doc('setup').set({
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

export async function createJobCenterStaffMemberServer(
  customId: string,
  password: string,
  displayName: string,
  emailDomain: string = '@jobcenter.khanhub',
  userCollection: string = 'jobcenter_users'
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp();
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);
    const email = `${customId.toLowerCase()}${emailDomain}`;

    try {
      await adminAuth.getUserByEmail(email);
      return {
        success: false,
        error: `Login ID already exists. Choose a different Staff Login ID.`,
      };
    } catch {}

    const userRecord = await adminAuth.createUser({ email, password, displayName });

    await adminDb.collection(userCollection).doc(userRecord.uid).set({
      customId,
      role: 'staff',
      displayName,
      password,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    try {
      await adminDb.collection('jobcenter_audit').add({
        action: 'login_initialization',
        performedBy: 'server_action',
        details: { customId, displayName },
        createdAt: new Date(),
      });
    } catch {}
    return { success: true, uid: userRecord.uid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}