'use server'

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const DOMAIN = '@hospital.Khan Hub';

function getAdminApp(): App {
  const existing = getApps().find(a => a.name === 'hospital-admin');
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
  }, 'hospital-admin');
}

export async function createHospitalUserServer(
  customId: string,
  password: string,
  role: string,
  displayName: string,
  patientId?: string,
  emailDomain: string = DOMAIN,
  userCollection: string = 'hospital_users'
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp();
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);

    // Guardrails: family login IDs must never collide with reserved master IDs.
    if (role === 'family') {
      try {
        const setupSnap = await adminDb.collection('hospital_meta').doc('setup').get();
        const setupData = setupSnap.data() as any;
        if (setupSnap.exists && setupData?.completed === true) {
          const reservedSuper = String(setupData?.superAdminCustomId || '').toUpperCase();
          const reservedCashier = String(setupData?.cashierCustomId || '').toUpperCase();
          const incoming = String(customId || '').toUpperCase();
          if (incoming && (incoming === reservedSuper || incoming === reservedCashier)) {
            return {
              success: false,
              error: 'This Login ID is reserved. Please choose a different Patient Login ID.',
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
      const nextPatientId = patientId || null;

      if (!existingProfileSnap.exists) {
        if (role === 'family') {
          return {
            success: false,
            error: 'Login ID already exists. Please use a different Patient Login ID.',
          };
        }

        await adminDb.collection(userCollection).doc(existingUser.uid).set({
          customId,
          role,
          displayName,
          password,
          patientId: nextPatientId,
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

      if (role === 'family' && existingProfile?.patientId && existingProfile.patientId !== nextPatientId) {
        return {
          success: false,
          error: `This Patient Login ID is already assigned to another patient.`,
        };
      }

      await adminDb.collection(userCollection).doc(existingUser.uid).set(
        {
          customId,
          role,
          displayName,
          password,
          patientId: nextPatientId,
          isActive: true,
        },
        { merge: true }
      );

      return { success: true, uid: existingUser.uid };
    } catch {
      // User doesn't exist — continue normally.
    }

    const userRecord = await adminAuth.createUser({ email, password, displayName });
    await getFirestore(app).collection(userCollection).doc(userRecord.uid).set({
      customId,
      role,
      displayName,
      password,
      patientId: patientId || null,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    
    try {
      await getFirestore(app).collection('hospital_audit').add({
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

export async function deactivateHospitalUser(
  uid: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  try {
    const app = getAdminApp();
    await getAuth(app).updateUser(uid, { disabled: true });
    await getFirestore(app).collection('hospital_users').doc(uid).update({ isActive: false });
    try {
      await getFirestore(app).collection('hospital_audit').add({
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

export async function resetHospitalPassword(
  uid: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  try {
    const app = getAdminApp();
    await getAuth(app).updateUser(uid, { password: newPassword });
    await getFirestore(app).collection('hospital_users').doc(uid).update({
      password: newPassword,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
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
    await getFirestore(app).collection('hospital_meta').doc('setup').set({
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
  emailDomain: string = '@hospital.Khan Hub',
  userCollection: string = 'hospital_users'
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp();
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);
    const email = `${customId.toLowerCase()}${emailDomain}`;

    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      return {
        success: false,
        error: `Login ID already exists. Choose a different Staff Login ID.`,
      };
    } catch {
      // fine
    }

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
      await adminDb.collection('hospital_audit').add({
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
