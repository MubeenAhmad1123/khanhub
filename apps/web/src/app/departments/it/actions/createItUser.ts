'use server'

import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/hq/auth/adminAuth';

const DOMAIN = '@it.khanhub.com.pk';

export async function createItUserServer(
  customId: string,
  password: string,
  role: string,
  displayName: string,
  studentId?: string,
  clientId?: string,
  emailDomain: string = DOMAIN,
  userCollection: string = 'it_users'
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp('it');
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);

    // Guardrails
    if (role === 'student') {
      try {
        const setupSnap = await adminDb.collection('it_meta').doc('setup').get();
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
        // If guardrail check fails, we still rely on the collision check below.
      }
    }

    const email = `${customId.toLowerCase()}${emailDomain}`;

    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      const existingProfileSnap = await adminDb.collection(userCollection).doc(existingUser.uid).get();

      if (!existingProfileSnap.exists) {
        if (role === 'student' || role === 'client') {
          return {
            success: false,
            error: `Login ID already exists. Please use a different ${role === 'student' ? 'Student' : 'Client'} Login ID.`,
          };
        }

        await adminDb.collection(userCollection).doc(existingUser.uid).set({
          customId,
          role,
          displayName,
          password,
          studentId: studentId || null,
          clientId: clientId || null,
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

      await adminDb.collection(userCollection).doc(existingUser.uid).set(
        {
          customId,
          role,
          displayName,
          password,
          studentId: studentId || null,
          clientId: clientId || null,
          isActive: true,
        },
        { merge: true }
      );

      return { success: true, uid: existingUser.uid };
    } catch {
      // User doesn't exist
    }

    const userRecord = await adminAuth.createUser({ email, password, displayName });
    await adminDb.collection(userCollection).doc(userRecord.uid).set({
      customId,
      role,
      displayName,
      password,
      studentId: studentId || null,
      clientId: clientId || null,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    
    try {
      await adminDb.collection('it_audit').add({
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

export async function markItSetupComplete(
  superAdminCustomId: string,
  cashierCustomId: string
): Promise<{ success: boolean; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  try {
    const app = getAdminApp('it');
    await getFirestore(app).collection('it_meta').doc('setup').set({
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

export async function resetItPassword(
  uid: string,
  newPassword: string,
  userCollection: string = 'it_users'
): Promise<{ success: boolean; error?: string }> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return { success: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };

  try {
    const app = getAdminApp('it');
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);

    await adminAuth.updateUser(uid, { password: newPassword });
    await adminDb.collection(userCollection).doc(uid).update({ password: newPassword });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
