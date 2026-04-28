// apps/web/src/app/hq/actions/auth.ts
'use server';

import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import type { HqRole } from '@/types/hq';

const COOKIE_NAME = 'hq_session';

// Using unified adminAuth/adminDb from @/lib/firebaseAdmin

type HqSessionCookie = {
  uid: string;
  customId: string;
  name: string;
  role: HqRole;
  loginTime: number;
};

/**
 * Provision an HQ superadmin user in Firestore (using Admin SDK, bypasses rules)
 * then set the session cookie — all in one server action.
 */
export async function provisionSuperadminAndSetSession(idToken: string): Promise<{
  success: boolean;
  error?: string;
  session?: HqSessionCookie;
}> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userRef = adminDb.collection('hq_users').doc(decoded.uid);
    const userSnap = await userRef.get();

    let finalData: Record<string, any>;

    if (!userSnap.exists) {
      // First-time superadmin — create the document
      finalData = {
        name: decoded.name || 'Super Admin',
        email: decoded.email || '',
        role: 'superadmin',
        isActive: true,
        photoUrl: decoded.picture || '',
        createdAt: new Date().toISOString(),
        customId: 'SUPER-ADMIN',
      };
      await userRef.set(finalData);
    } else {
      finalData = userSnap.data() as Record<string, any>;
      // Ensure the role is superadmin
      if (finalData.role !== 'superadmin') {
        await userRef.update({ role: 'superadmin' });
        finalData.role = 'superadmin';
      }
      if (finalData.isActive === false) {
        return { success: false, error: 'Account is disabled.' };
      }
    }

    const payload: HqSessionCookie = {
      uid: decoded.uid,
      customId: String(finalData.customId || 'SUPER-ADMIN').toUpperCase(),
      name: String(finalData.name || ''),
      role: 'superadmin',
      loginTime: Date.now(),
    };

    // Set Custom Claims for zero-cost routing
    await adminAuth.setCustomUserClaims(decoded.uid, {
      dashboardPath: '/hq/dashboard/superadmin'
    });

    cookies().set(COOKIE_NAME, JSON.stringify(payload), {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return { success: true, session: payload };
  } catch (err: any) {
    console.error('[provisionSuperadmin]', err);
    return { success: false, error: err?.message || 'Failed to provision superadmin.' };
  }
}

export async function setHqSessionCookieFromIdToken(idToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);

    let userSnap = await adminDb.collection('hq_users').doc(decoded.uid).get();
    let data: any;

    if (!userSnap.exists) {
      // Fallback: Search by email if UID doesn't match document ID
      const emailMatch = await adminDb.collection('hq_users').where('email', '==', decoded.email).limit(1).get();
      if (emailMatch.empty) {
        return { success: false, error: `HQ user profile missing for ${decoded.email}` };
      }
      userSnap = emailMatch.docs[0];
      data = userSnap.data();
    } else {
      data = userSnap.data();
    }

    if (data.isActive === false) return { success: false, error: 'Account disabled.' };

    const role = String(data.role || '').toLowerCase();
    if (role !== 'superadmin' && role !== 'manager' && role !== 'cashier') {
      return { success: false, error: 'Invalid HQ role.' };
    }

    const payload: HqSessionCookie = {
      uid: decoded.uid,
      customId: String(data.customId || '').toUpperCase(),
      name: String(data.name || ''),
      role: role as HqRole,
      loginTime: Date.now(),
    };

    // Set Custom Claims for zero-cost routing (Persists in Auth Token)
    await adminAuth.setCustomUserClaims(decoded.uid, {
      dashboardPath: role === 'superadmin' ? '/hq/dashboard/superadmin' : 
                     role === 'manager' ? '/hq/dashboard/manager' : 
                     role === 'cashier' ? '/hq/dashboard/cashier' : '/hq/dashboard'
    });

    cookies().set(COOKIE_NAME, JSON.stringify(payload), {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to set session.' };
  }
}

/**
 * Sets custom claims for any department user to enable zero-cost routing.
 */
export async function setUserDashboardClaims(uid: string, path: string) {
  try {
    await adminAuth.setCustomUserClaims(uid, { dashboardPath: path });
    return { success: true };
  } catch (err) {
    console.error('[SetClaims] Error:', err);
    return { success: false };
  }
}

export async function clearHqSessionCookie(): Promise<void> {
  cookies().set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function readHqSessionCookie(): Promise<HqSessionCookie | null> {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HqSessionCookie;
  } catch {
    return null;
  }
}

export async function requireHqSuperadmin(): Promise<HqSessionCookie> {
  const session = await readHqSessionCookie();
  if (!session) throw new Error('Unauthorized');
  if (session.role !== 'superadmin') throw new Error('Unauthorized');
  return session;
}

export async function loginHqUser({ customId, password }: { customId: string; password: string }) {
  try {
    // Use Admin SDK to query — bypasses Firestore rules on server
    const usersRef = adminDb.collection('hq_users');
    const snap = await usersRef
      .where('customId', '==', customId.trim())
      .where('password', '==', password)
      .limit(1)
      .get();

    if (snap.empty) {
      return { success: false, error: 'Invalid credentials. Check your User ID and password.' };
    }

    const userDoc = snap.docs[0];
    const userData = userDoc.data();
    
    if (userData.isActive === false) {
      return { success: false, error: 'Account is deactivated. Contact administrator.' };
    }

    // Generate Firebase custom token for this user's Firebase Auth UID
    // The Firestore doc ID IS the Firebase Auth UID for HQ users
    const uid = userDoc.id;
    const customToken = await adminAuth.createCustomToken(uid, {
      role: userData.role,
      customId: userData.customId,
    });

    return {
      success: true,
      uid,
      customToken,
      user: {
        uid,
        customId: userData.customId,
        name: userData.name || userData.displayName || '',
        role: userData.role,
        photoUrl: userData.photoUrl || null,
        phone: userData.phone || null,
        isActive: userData.isActive !== false,
      },
    };
  } catch (err: any) {
    console.error('[loginHqUser] Error:', err);
    return { 
      success: false, 
      error: 'Login failed. Please try again.' 
    };
  }
}

export async function createHqFirebaseAuthAccount({
  uid,        // The Firestore doc ID (hq_users document ID)
  email,      // A generated email: customId@khanhub.internal
  displayName,
}: {
  uid: string;
  email: string;
  displayName: string;
}) {
  try {
    // Check if user already exists
    try {
      await adminAuth.getUser(uid);
      return { success: true, message: 'User already exists' };
    } catch {
      // User doesn't exist, create them
    }
    
    await adminAuth.createUser({
      uid,
      email,
      displayName,
      emailVerified: true,
      password: Math.random().toString(36), // Random password — login via customToken only
    });
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
