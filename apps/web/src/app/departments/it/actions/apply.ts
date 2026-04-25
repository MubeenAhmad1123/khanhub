'use server'

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/hq/auth/adminAuth';

export async function submitItStudentApplication(data: {
  name: string;
  whatsapp: string;
  education: string;
  course: string;
  city: string;
  experience?: string;
  notes?: string;
}) {
  try {
    const app = getAdminApp('it');
    const adminDb = getFirestore(app);

    const docRef = await adminDb.collection('it_students').add({
      ...data,
      status: 'pending',
      joiningDate: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, id: docRef.id };
  } catch (err: any) {
    console.error('Submit IT application error:', err);
    return { success: false, error: err.message };
  }
}
