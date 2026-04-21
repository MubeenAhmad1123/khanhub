import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';   // use existing firebase config
import type { WelfareUser } from '@/types/welfare';

const DOMAIN = '@welfare.Khan Hub';

export function buildEmail(customId: string): string {
  return `${customId.trim().toLowerCase()}${DOMAIN}`;
}

export async function loginWelfare(customId: string, password: string): Promise<WelfareUser> {
  const email = buildEmail(customId);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'welfare_users', cred.user.uid));
  if (!snap.exists()) throw new Error('User profile not found');
  const data = snap.data();
  if (!data.isActive) throw new Error('Account is inactive');
  return { uid: cred.user.uid, ...data } as WelfareUser;
}

export async function logoutWelfare(): Promise<void> {
  await signOut(auth);
}

export async function getWelfareUser(uid: string): Promise<WelfareUser | null> {
  const snap = await getDoc(doc(db, 'welfare_users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as WelfareUser;
}
