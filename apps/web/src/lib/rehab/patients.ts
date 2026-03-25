import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Patient, FeeRecord, CanteenRecord } from '@/types/rehab';

export async function getPatient(id: string): Promise<Patient | null> {
  const snap = await getDoc(doc(db, 'rehab_patients', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { 
    id: snap.id, 
    ...data,
    admissionDate: data.admissionDate.toDate(),
    createdAt: data.createdAt.toDate()
  } as Patient;
}

export async function getPatients(): Promise<Patient[]> {
  const q = query(collection(db, 'rehab_patients'), where('isActive', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data,
      admissionDate: data.admissionDate.toDate(),
      createdAt: data.createdAt.toDate()
    } as Patient;
  });
}

export async function createPatient(data: Omit<Patient, 'id' | 'createdAt'>): Promise<string> {
  const res = await addDoc(collection(db, 'rehab_patients'), {
    ...data,
    admissionDate: Timestamp.fromDate(data.admissionDate),
    createdAt: Timestamp.now(),
    isActive: true
  });
  return res.id;
}

export async function updatePatient(id: string, data: Partial<Patient>): Promise<void> {
  const updateData = { ...data };
  if (data.admissionDate) {
    updateData.admissionDate = Timestamp.fromDate(data.admissionDate) as any;
  }
  await updateDoc(doc(db, 'rehab_patients', id), updateData);
}

export async function getPatientFeeRecord(patientId: string, month: string): Promise<FeeRecord | null> {
  const q = query(
    collection(db, 'rehab_fees'), 
    where('patientId', '==', patientId), 
    where('month', '==', month)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();
  return { 
    id: doc.id, 
    ...data,
    payments: data.payments.map((p: any) => ({ ...p, date: p.date.toDate() }))
  } as FeeRecord;
}

export async function getPatientCanteen(patientId: string, month: string): Promise<CanteenRecord | null> {
  const q = query(
    collection(db, 'rehab_canteen'), 
    where('patientId', '==', patientId), 
    where('month', '==', month)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();
  return { 
    id: doc.id, 
    ...data,
    transactions: data.transactions.map((t: any) => ({ ...t, date: t.date.toDate() }))
  } as CanteenRecord;
}

export async function getPatientVideos(patientId: string): Promise<any[]> {
  const q = query(
    collection(db, 'rehab_videos'), 
    where('patientId', '==', patientId), 
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
