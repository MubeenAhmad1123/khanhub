import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';   // use existing firebase config
import type { SukoonUser } from '@/types/sukoon';

const DOMAIN = '@sukoon.khanhub';

export function buildEmail(customId: string): string {
  return `${customId.trim().toLowerCase()}${DOMAIN}`;
}

export async function loginSukoon(customId: string, password: string): Promise<SukoonUser> {
  const email = buildEmail(customId);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'sukoon_users', cred.user.uid));
  if (!snap.exists()) throw new Error('User profile not found');
  const data = snap.data();
  if (!data.isActive) throw new Error('Account is inactive');
  return { uid: cred.user.uid, ...data } as SukoonUser;
}

export async function logoutSukoon(): Promise<void> {
  await signOut(auth);
}

export async function getSukoonUser(uid: string): Promise<SukoonUser | null> {
  const snap = await getDoc(doc(db, 'sukoon_users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as SukoonUser;
}
