import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';   // use existing firebase config
import type { HospitalUser } from '@/types/hospital';

const DOMAIN = '@hospital.khanhub';

export function buildEmail(customId: string): string {
  return `${customId.toLowerCase()}${DOMAIN}`;
}

export async function loginHospital(customId: string, password: string): Promise<HospitalUser> {
  const email = buildEmail(customId);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'hospital_users', cred.user.uid));
  if (!snap.exists()) throw new Error('User profile not found');
  const data = snap.data();
  if (!data.isActive) throw new Error('Account is inactive');
  return { uid: cred.user.uid, ...data } as HospitalUser;
}

export async function logoutHospital(): Promise<void> {
  await signOut(auth);
}

export async function getHospitalUser(uid: string): Promise<HospitalUser | null> {
  const snap = await getDoc(doc(db, 'hospital_users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as HospitalUser;
}
