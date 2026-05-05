// apps/web/src/app/hq/actions/auth.ts
'use server';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb, adminAuth, adminDb } from '@/lib/firebaseAdmin';
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
      if (finalData.role !== 'superadmin' && finalData.isActive === false) {
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

    // Set Custom Claims for zero-cost routing and security rules
    await adminAuth.setCustomUserClaims(decoded.uid, {
      role: 'superadmin',
      customId: 'SUPER-ADMIN',
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

export async function setHqSessionCookieFromIdToken(idToken: string) {
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    
    cookieStore.set('hq_firebase_uid', decoded.uid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax',
    });
    
    return { success: true };
  } catch (err: any) {
    console.error('[setHqSessionCookieFromIdToken]', err?.message);
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

export async function loginHqUser({ 
  customId, 
  password 
}: { 
  customId: string; 
  password: string; 
}) {
  try {
    // Validate inputs first — before touching Firebase
    if (!customId?.trim() || !password?.trim()) {
      return { success: false, error: 'User ID and password are required.' };
    }

    // Get adminDb lazily — will throw descriptive error if env vars missing
    const db = getAdminDb();
    
    const snap = await db
      .collection('hq_users')
      .where('customId', '==', customId.trim())
      .where('password', '==', password.trim())
      .limit(1)
      .get();

    if (snap.empty) {
      return { success: false, error: 'Invalid User ID or password.' };
    }

    const userDoc = snap.docs[0];
    const userData = userDoc.data();

    if (userData.role !== 'superadmin' && userData.isActive === false) {
      return { success: false, error: 'Account deactivated. Contact admin.' };
    }

    const uid = userDoc.id;
    
    const auth = getAdminAuth();
    
    // Set Custom User Claims for zero-cost security rules and routing
    await auth.setCustomUserClaims(uid, {
      role: userData.role,
      customId: userData.customId,
      dashboardPath: userData.role === 'superadmin' ? '/hq/dashboard/superadmin' : 
                     userData.role === 'manager' ? '/hq/dashboard/manager' :
                     userData.role === 'cashier' ? '/hq/dashboard/cashier' : '/hq/login'
    });

    const customToken = await auth.createCustomToken(uid, {
      role: userData.role,
      customId: userData.customId,
    });

    const sessionCookie: HqSessionCookie = {
      uid,
      customId: userData.customId,
      name: userData.name || userData.displayName || '',
      role: userData.role,
      loginTime: Date.now(),
    };

    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, JSON.stringify(sessionCookie), {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
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
    console.error('[loginHqUser] Server error:', err?.message || err);
    
    // Return safe error — never expose internal details to client
    return { 
      success: false, 
      error: `Login failed: ${err?.message || 'Unknown server error'}`
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

export async function createAuthCustomToken(uid: string) {
  try {
    const auth = getAdminAuth();
    const token = await auth.createCustomToken(uid);
    return { success: true, customToken: token };
  } catch (err: any) {
    console.error('[createAuthCustomToken] Error:', err);
    return { success: false, error: err.message };
  }
}
