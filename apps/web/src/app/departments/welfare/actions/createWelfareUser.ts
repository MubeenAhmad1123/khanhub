'use server'

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const DOMAIN = '@welfare.Khan Hub';
const ADMIN_APP_NAME = 'welfare-admin';

function getAdminApp(): App {
  const existing = getApps().find(a => a.name === ADMIN_APP_NAME);
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
  }, ADMIN_APP_NAME);
}

export async function createWelfareUserServer(
  customId: string,
  password: string,
  role: string,
  displayName: string,
  childId?: string,
  emailDomain: string = DOMAIN,
  userCollection: string = 'welfare_users'
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp();
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);

    // Guardrail: family login IDs must never collide with reserved master IDs.
    if (role === 'family') {
      try {
        const setupSnap = await adminDb.collection('welfare_meta').doc('setup').get();
        const setupData = setupSnap.data() as any;
        if (setupSnap.exists && setupData?.completed === true) {
          const reservedSuper = String(setupData?.superAdminCustomId || '').toUpperCase();
          const reservedCashier = String(setupData?.cashierCustomId || '').toUpperCase();
          const incoming = String(customId || '').toUpperCase();
          if (incoming && (incoming === reservedSuper || incoming === reservedCashier)) {
            return {
              success: false,
              error: 'This Login ID is reserved. Please choose a different Child Login ID.',
            };
          }
        }
      } catch {
        // If guardrail check fails, fall through to collision check below.
      }
    }

    const email = `${customId.toLowerCase()}${emailDomain}`;

    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      const existingProfileSnap = await adminDb.collection(userCollection).doc(existingUser.uid).get();
      const nextChildId = childId || null;

      // Repair missing Firestore profile (but never guess a family user into an admin slot).
      if (!existingProfileSnap.exists) {
        if (role === 'family') {
          return {
            success: false,
            error: 'Login ID already exists. Please use a different Child Login ID.',
          };
        }
        await adminDb.collection(userCollection).doc(existingUser.uid).set({
          customId,
          role,
          displayName,
          password,
          childId: nextChildId,
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
        });
        return { success: true, uid: existingUser.uid };
      }

      const existingProfile = existingProfileSnap.data() as any;

      // Prevent role hijacking.
      if (existingProfile?.role && existingProfile.role !== role) {
        return {
          success: false,
          error: 'Login ID already exists for a different account type. Please use the correct Login ID.',
        };
      }

      // Prevent reassigning family login to a different child.
      if (role === 'family' && existingProfile?.childId && existingProfile.childId !== nextChildId) {
        return {
          success: false,
          error: 'This Child Login ID is already assigned to another child.',
        };
      }

      // Safe update.
      await adminDb.collection(userCollection).doc(existingUser.uid).set(
        { customId, role, displayName, password, childId: nextChildId, isActive: true },
        { merge: true }
      );
      return { success: true, uid: existingUser.uid };
    } catch {
      // User doesn't exist in Auth — create normally.
    }

    const userRecord = await adminAuth.createUser({ email, password, displayName });
    await adminDb.collection(userCollection).doc(userRecord.uid).set({
      customId,
      role,
      displayName,
      password,
      childId: childId || null,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Fire-and-forget audit log
    try {
      await adminDb.collection('welfare_audit').add({
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

// Keep old name as alias for backward-compat with HQ manager page imports
export const createRehabUserServer = createWelfareUserServer;

export async function deactivateWelfareUser(
  uid: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  try {
    const app = getAdminApp();
    await getAuth(app).updateUser(uid, { disabled: true });
    await getFirestore(app).collection('welfare_users').doc(uid).update({ isActive: false });
    try {
      await getFirestore(app).collection('welfare_audit').add({
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

export async function resetWelfarePassword(
  uid: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  try {
    const app = getAdminApp();
    await getAuth(app).updateUser(uid, { password: newPassword });
    await getFirestore(app).collection('welfare_users').doc(uid).update({ password: newPassword });
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
    const app = getAdminApp();
    await getFirestore(app).collection('welfare_meta').doc('setup').set({
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
  emailDomain: string = DOMAIN,
  userCollection: string = 'welfare_users'
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
        error: 'Login ID already exists. Choose a different Staff Login ID.',
      };
    } catch {
      // User doesn't exist — continue.
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
      await adminDb.collection('welfare_audit').add({
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
