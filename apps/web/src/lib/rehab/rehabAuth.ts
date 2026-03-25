import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';   // use existing firebase config
import type { RehabUser } from '@/types/rehab';

const DOMAIN = '@rehab.khanhub';

export function buildEmail(customId: string): string {
  return `${customId.toLowerCase()}${DOMAIN}`;
}

export async function loginRehab(customId: string, password: string): Promise<RehabUser> {
  const email = buildEmail(customId);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'rehab_users', cred.user.uid));
  if (!snap.exists()) throw new Error('User profile not found');
  const data = snap.data();
  if (!data.isActive) throw new Error('Account is inactive');
  return { uid: cred.user.uid, ...data } as RehabUser;
}

export async function logoutRehab(): Promise<void> {
  await signOut(auth);
}

export async function getRehabUser(uid: string): Promise<RehabUser | null> {
  const snap = await getDoc(doc(db, 'rehab_users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as RehabUser;
}
