import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';   // use existing firebase config
import type { SpimsUser } from '@/types/spims';

const DOMAIN = '@spims.khanhub';
const LEGACY_DOMAIN = '@spims.edu.pk';

export function buildEmail(customId: string): string {
  return `${customId.trim().toLowerCase()}${DOMAIN}`;
}

export async function loginSpims(customId: string, password: string): Promise<SpimsUser> {
  // Backwards-compatible login:
  // older accounts were created with a different domain, so we try both.
  const primaryEmail = buildEmail(customId);
  let cred;
  try {
    cred = await signInWithEmailAndPassword(auth, primaryEmail, password);
  } catch (err: any) {
    const code = String(err?.code || '');
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-email') {
      const legacyEmail = `${customId.trim().toLowerCase()}${LEGACY_DOMAIN}`;
      cred = await signInWithEmailAndPassword(auth, legacyEmail, password);
    } else {
      throw err;
    }
  }
  const snap = await getDoc(doc(db, 'spims_users', cred.user.uid));
  if (!snap.exists()) throw new Error('User profile not found');
  const data = snap.data();
  if (!data.isActive) throw new Error('Account is inactive');
  return { uid: cred.user.uid, ...data } as SpimsUser;
}

export async function logoutSpims(): Promise<void> {
  await signOut(auth);
}

export async function getSpimsUser(uid: string): Promise<SpimsUser | null> {
  const snap = await getDoc(doc(db, 'spims_users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as SpimsUser;
}
