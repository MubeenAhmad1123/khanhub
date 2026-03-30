import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { buildEmail } from './spimsAuth';
import type { SpimsUser, SpimsRole } from '@/types/spims';

export async function createSpimsUser(
  customId: string, 
  password: string, 
  role: SpimsRole, 
  displayName: string, 
  patientId?: string
): Promise<string> {
  // NOTE: This will sign the current user out and the new user in if called on the client.
  // In a real app, this should be a Server Action or Firebase Admin SDK call.
  const email = buildEmail(customId);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  
  const userData: Omit<SpimsUser, 'uid'> = {
    customId,
    role,
    displayName,
    patientId,
    createdAt: new Date(),
    isActive: true
  };

  await setDoc(doc(db, 'spims_users', cred.user.uid), {
    ...userData,
    createdAt: Timestamp.now()
  });

  return cred.user.uid;
}

export async function deactivateUser(uid: string): Promise<void> {
  await updateDoc(doc(db, 'spims_users', uid), {
    isActive: false
  });
}

export async function getSpimsUserByCustomId(customId: string): Promise<SpimsUser | null> {
  const q = query(collection(db, 'spims_users'), where('customId', '==', customId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { uid: doc.id, ...doc.data() } as SpimsUser;
}

// Placeholder for password reset (requires Admin SDK / Server Action)
export async function resetUserPassword(uid: string, newPassword: string): Promise<void> {
  console.warn('Password reset requires Firebase Admin SDK or Server Action. Not implemented in client-side lib.');
  throw new Error('Not implemented: requires Admin SDK');
}
