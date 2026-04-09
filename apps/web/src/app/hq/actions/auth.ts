// apps/web/src/app/hq/actions/auth.ts
'use server';

import { cookies } from 'next/headers';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { HqRole } from '@/types/hq';

const COOKIE_NAME = 'hq_session';

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === 'hq-admin');
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
    'hq-admin'
  );
}

type HqSessionCookie = {
  uid: string;
  customId: string;
  name: string;
  role: HqRole;
  loginTime: number;
};

export async function setHqSessionCookieFromIdToken(idToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const app = getAdminApp();
    const decoded = await getAuth(app).verifyIdToken(idToken);

    const userSnap = await getFirestore(app).collection('hq_users').doc(decoded.uid).get();
    if (!userSnap.exists) return { success: false, error: 'HQ user profile missing.' };
    const data = userSnap.data() as any;
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

    cookies().set(COOKIE_NAME, JSON.stringify(payload), {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to set session.' };
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

