import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';   // use existing firebase config
import type { SpimsUser } from '@/types/spims';

const DOMAIN = '@spims.khanhub';

export function buildEmail(customId: string): string {
  return `${customId.toLowerCase()}${DOMAIN}`;
}

export async function loginSpims(customId: string, password: string): Promise<SpimsUser> {
  const email = buildEmail(customId);
  const cred = await signInWithEmailAndPassword(auth, email, password);
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
