import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';   // use existing firebase config
import type { JobCenterUser } from '@/types/job-center';

const DOMAIN = '@job-center.khanhub.com.pk';

export function buildEmail(customId: string): string {
  return `${customId.trim().toLowerCase()}${DOMAIN}`;
}

export async function loginJobCenter(customId: string, password: string): Promise<JobCenterUser> {
  const email = buildEmail(customId);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'jobcenter_users', cred.user.uid));
  if (!snap.exists()) throw new Error('User profile not found');
  const data = snap.data();
  if (!data.isActive) throw new Error('Account is inactive');
  return { uid: cred.user.uid, ...data } as JobCenterUser;
}

export async function logoutJobCenter(): Promise<void> {
  await signOut(auth);
}

export async function getJobCenterUser(uid: string): Promise<JobCenterUser | null> {
  const snap = await getDoc(doc(db, 'jobcenter_users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as JobCenterUser;
}
