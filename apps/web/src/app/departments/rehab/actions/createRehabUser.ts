'use server'

import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/hq/auth/adminAuth';

const DOMAIN = '@rehab.khanhub.com.pk';

export async function createRehabUserServer(
  customId: string,
  password: string,
  role: string,
  displayName: string,
  patientId?: string,
  emailDomain: string = DOMAIN,
  userCollection: string = 'rehab_users'
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp('rehab');
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);

    // Guardrails: family login IDs must never collide with reserved master IDs.
    // Even if reserved master users were deleted from Auth by mistake, this prevents
    // patient admissions from overwriting them later.
    if (role === 'family') {
      try {
        const setupSnap = await adminDb.collection('rehab_meta').doc('setup').get();
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
      // If the user exists, fail instead of deleting/recreating.
      // Deleting/recreating can overwrite existing admin/cashier accounts if a patient
      // login ID accidentally collides with a master account ID.
      const existingProfileSnap = await adminDb.collection(userCollection).doc(existingUser.uid).get();
      const nextPatientId = patientId || null;

      // If Auth exists but Firestore profile is missing, "repair" the Firestore doc.
      // This does NOT change Firebase Auth password.
      if (!existingProfileSnap.exists) {
        // For family accounts, do not guess/repair role into Firestore when Auth user exists.
        // Otherwise an admin/cashier Auth user with a deleted Firestore profile could be
        // accidentally converted into a family user.
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

      // Prevent role hijacking (ex: admin auth user accidentally being used as patient family).
      if (existingProfile?.role && existingProfile.role !== role) {
        return {
          success: false,
          error: `Login ID already exists for a different account type. Please use the correct Login ID.`,
        };
      }

      // For family users, prevent reassigning the same login ID to a different patient.
      if (role === 'family' && existingProfile?.patientId && existingProfile.patientId !== nextPatientId) {
        return {
          success: false,
          error: `This Patient Login ID is already assigned to another patient.`,
        };
      }

      // Role matches (and assignment is safe): update Firestore profile fields.
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
    // Fire-and-forget audit log
    try {
      await getFirestore(app).collection('rehab_audit').add({
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

const SPIMS_DOMAIN = '@spims.khanhub.com.pk';

/** Creates Firebase Auth + `spims_users` doc for a student portal login. */
export async function createSpimsStudentUserServer(
  customId: string,
  password: string,
  displayName: string,
  studentId: string,
  isReadmission?: boolean
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp('rehab');
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);

    try {
      const setupSnap = await adminDb.collection('spims_meta').doc('setup').get();
      const setupData = setupSnap.data() as any;
      if (setupSnap.exists && setupData?.completed === true) {
        const reservedSuper = String(setupData?.superAdminCustomId || '').toUpperCase();
        const reservedCashier = String(setupData?.cashierCustomId || '').toUpperCase();
        const incoming = String(customId || '').toUpperCase();
        if (incoming && (incoming === reservedSuper || incoming === reservedCashier)) {
          return {
            success: false,
            error: 'This Login ID is reserved. Please choose a different Student Login ID.',
          };
        }
      }
    } catch {
      // ignore guardrail failures
    }

    const email = `${customId.toLowerCase()}${SPIMS_DOMAIN}`;

    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      const existingProfileSnap = await adminDb.collection('spims_users').doc(existingUser.uid).get();
      const nextStudentId = studentId || null;

      if (!existingProfileSnap.exists) {
        await adminDb.collection('spims_users').doc(existingUser.uid).set({
          customId,
          role: 'student',
          displayName,
          password,
          studentId: nextStudentId,
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
        });
        return { success: true, uid: existingUser.uid };
      }

      const existingProfile = existingProfileSnap.data() as any;
      if (existingProfile?.role && existingProfile.role !== 'student') {
        return {
          success: false,
          error: `Login ID already exists for a different account type.`,
        };
      }
      if (existingProfile?.studentId && existingProfile.studentId !== nextStudentId && !isReadmission) {
        return {
          success: false,
          error: `This Student Login ID is already assigned to another student.`,
        };
      }

      await adminDb.collection('spims_users').doc(existingUser.uid).set(
        {
          customId,
          role: 'student',
          displayName,
          password,
          studentId: nextStudentId,
          isActive: true,
        },
        { merge: true }
      );
      return { success: true, uid: existingUser.uid };
    } catch {
      // User doesn't exist — continue
    }

    const userRecord = await adminAuth.createUser({ email, password, displayName });
    await getFirestore(app).collection('spims_users').doc(userRecord.uid).set({
      customId,
      role: 'student',
      displayName,
      password,
      studentId,
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
    const app = getAdminApp('rehab');
    await getAuth(app).updateUser(uid, { disabled: true });
    await getFirestore(app).collection('rehab_users').doc(uid).update({ isActive: false });
    // Fire-and-forget audit log
    try {
      await getFirestore(app).collection('rehab_audit').add({
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

export async function resetRehabPassword(
  uid: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  try {
    const app = getAdminApp('rehab');
    await getAuth(app).updateUser(uid, { password: newPassword });
    await getFirestore(app).collection('rehab_users').doc(uid).update({
      password: newPassword,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetSpimsPassword(
  uid: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  try {
    const app = getAdminApp('rehab');
    await getAuth(app).updateUser(uid, { password: newPassword });
    await getFirestore(app).collection('spims_users').doc(uid).update({
      password: newPassword,
    });
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
    const app = getAdminApp('rehab');
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
  emailDomain: string = '@rehab.khanhub',
  userCollection: string = 'rehab_users'
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp('rehab');
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);
    const email = `${customId.toLowerCase()}${emailDomain}`;

    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      // If the user exists, fail instead of deleting/recreating.
      // This prevents accidental overwrite of admin/staff/cashier accounts.
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

    // Fire-and-forget audit log
    try {
      await adminDb.collection('rehab_audit').add({
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
