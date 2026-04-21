'use server'

import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/hq/auth/adminAuth';

const DOMAIN = '@spims.Khan Hub';

export async function createSpimsUserServer(
  customId: string,
  password: string,
  role: string,
  displayName: string,
  studentId?: string,
  emailDomain: string = DOMAIN,
  userCollection: string = 'spims_users'
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp('spims');
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);

    if (role === 'student' || role === 'family') {
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
              error: 'This Login ID is reserved. Please choose a different Login ID.',
            };
          }
        }
      } catch {
      }
    }

    const email = `${customId.toLowerCase()}${emailDomain}`;

    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      const existingProfileSnap = await adminDb.collection(userCollection).doc(existingUser.uid).get();
      const nextStudentId = studentId || null;

      if (!existingProfileSnap.exists) {
        await adminDb.collection(userCollection).doc(existingUser.uid).set({
          customId,
          role,
          displayName,
          password,
          studentId: nextStudentId,
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
        });
        return { success: true, uid: existingUser.uid };
      }

      const existingProfile = existingProfileSnap.data() as any;

      if (existingProfile?.role && existingProfile.role !== role) {
        return {
          success: false,
          error: `Login ID already exists for a different account type.`,
        };
      }

      await adminDb.collection(userCollection).doc(existingUser.uid).set(
        {
          customId,
          role,
          displayName,
          password,
          studentId: nextStudentId,
          isActive: true,
        },
        { merge: true }
      );

      return { success: true, uid: existingUser.uid };
    } catch {
    }

    const userRecord = await adminAuth.createUser({ email, password, displayName });
    await adminDb.collection(userCollection).doc(userRecord.uid).set({
      customId,
      role,
      displayName,
      password,
      studentId: studentId || null,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    
    try {
      await adminDb.collection('spims_audit').add({
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
    const app = getAdminApp('spims');
    await getFirestore(app).collection('spims_meta').doc('setup').set({
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

export async function deactivateSpimsUser(
  uid: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  try {
    const app = getAdminApp('spims');
    await getAuth(app).updateUser(uid, { disabled: true });
    await getFirestore(app).collection('spims_users').doc(uid).update({ isActive: false });
    try {
      await getFirestore(app).collection('spims_audit').add({
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

export async function resetSpimsPassword(
  uid: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  try {
    const app = getAdminApp('spims');
    await getAuth(app).updateUser(uid, { password: newPassword });
    await getFirestore(app).collection('spims_users').doc(uid).update({
      password: newPassword,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Keep old names as aliases for backward compatibility if needed by old dashboard imports
export const deactivateRehabUser = deactivateSpimsUser;
export const resetRehabPassword = resetSpimsPassword;

export async function createStaffMemberServer(
  customId: string,
  password: string,
  displayName: string,
  emailDomain: string = DOMAIN,
  userCollection: string = 'spims_users'
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp('spims');
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);
    const email = `${customId.toLowerCase()}${emailDomain}`;

    try {
      await adminAuth.getUserByEmail(email);
      return {
        success: false,
        error: `Login ID already exists.`,
      };
    } catch {
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
      await adminDb.collection('spims_audit').add({
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
