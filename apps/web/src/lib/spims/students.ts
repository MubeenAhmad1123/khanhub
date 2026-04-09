// apps/web/src/lib/spims/students.ts

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
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDate } from '@/lib/utils';
import type { SpimsStudent, SpimsFeePayment, SpimsFeeTrackerRecord } from '@/types/spims';

export function firestoreDate(val: Date | string): Timestamp {
  const d = typeof val === 'string' ? new Date(`${val}T00:00:00`) : val;
  return Timestamp.fromDate(d);
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Record<string, unknown>;
}

function mapStudent(id: string, data: Record<string, unknown>): SpimsStudent {
  return {
    id,
    ...data,
  } as SpimsStudent;
}

export async function getStudent(id: string): Promise<SpimsStudent | null> {
  const snap = await getDoc(doc(db, 'spims_students', id));
  if (!snap.exists()) return null;
  return mapStudent(snap.id, snap.data() as Record<string, unknown>);
}

export async function listStudents(): Promise<SpimsStudent[]> {
  const snap = await getDocs(collection(db, 'spims_students'));
  return snap.docs.map((d) => mapStudent(d.id, d.data() as Record<string, unknown>));
}

export type CreateStudentInput = Omit<SpimsStudent, 'id' | 'createdAt' | 'updatedAt' | 'totalReceived' | 'remaining'> & {
  totalReceived?: number;
  remaining?: number;
};

export async function createStudent(data: CreateStudentInput): Promise<string> {
  const totalPackage = Number(data.totalPackage) || 0;
  const totalReceived = Number(data.totalReceived) || 0;
  const remaining =
    typeof data.remaining === 'number' ? data.remaining : Math.max(0, totalPackage - totalReceived);

  const payload: Record<string, unknown> = omitUndefined({
    ...data,
    admissionDate:
      data.admissionDate instanceof Timestamp
        ? data.admissionDate
        : firestoreDate(toDate(data.admissionDate)),
    dateOfBirth:
      typeof data.dateOfBirth === 'string'
        ? data.dateOfBirth
        : data.dateOfBirth instanceof Timestamp
          ? data.dateOfBirth
          : Timestamp.fromDate(toDate(data.dateOfBirth)),
    admissionFeePaidOn: data.admissionFeePaidOn
      ? data.admissionFeePaidOn instanceof Timestamp
        ? data.admissionFeePaidOn
        : Timestamp.fromDate(toDate(data.admissionFeePaidOn))
      : null,
    registrationFeePaidOn: data.registrationFeePaidOn
      ? data.registrationFeePaidOn instanceof Timestamp
        ? data.registrationFeePaidOn
        : Timestamp.fromDate(toDate(data.registrationFeePaidOn))
      : null,
    examinationFeePaidOn: data.examinationFeePaidOn
      ? data.examinationFeePaidOn instanceof Timestamp
        ? data.examinationFeePaidOn
        : Timestamp.fromDate(toDate(data.examinationFeePaidOn))
      : null,
    totalReceived,
    remaining,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const ref = await addDoc(collection(db, 'spims_students'), payload);
  return ref.id;
}

export async function updateStudent(id: string, data: Partial<SpimsStudent>): Promise<void> {
  const patch: Record<string, unknown> = omitUndefined({ ...data, updatedAt: serverTimestamp() });
  delete patch.id;

  if (data.admissionDate !== undefined) {
    patch.admissionDate =
      data.admissionDate instanceof Timestamp
        ? data.admissionDate
        : firestoreDate(toDate(data.admissionDate));
  }
  if (data.dateOfBirth !== undefined) {
    patch.dateOfBirth =
      typeof data.dateOfBirth === 'string'
        ? data.dateOfBirth
        : data.dateOfBirth instanceof Timestamp
          ? data.dateOfBirth
          : Timestamp.fromDate(toDate(data.dateOfBirth));
  }

  const dateFields = [
    'admissionFeePaidOn',
    'registrationFeePaidOn',
    'examinationFeePaidOn',
    'year1_examDate',
    'year1_passDate',
    'year2_examDate',
    'year2_passDate',
  ] as const;

  for (const key of dateFields) {
    const v = data[key];
    if (v === undefined) continue;
    if (v === null) {
      patch[key] = null;
      continue;
    }
    patch[key] = v instanceof Timestamp ? v : Timestamp.fromDate(toDate(v));
  }

  await updateDoc(doc(db, 'spims_students', id), patch);
}

export async function fetchStudentFees(studentId: string): Promise<SpimsFeePayment[]> {
  const q = query(
    collection(db, 'spims_fees'),
    where('studentId', '==', studentId),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const row = d.data();
    return {
      id: d.id,
      ...row,
      date: row.date?.toDate ? row.date.toDate() : row.date,
      createdAt: row.createdAt?.toDate ? row.createdAt.toDate() : row.createdAt,
    } as SpimsFeePayment;
  });
}

export function buildFeeTrackerRecord(
  student: SpimsStudent,
  fees: SpimsFeePayment[]
): SpimsFeeTrackerRecord {
  const approved = fees.filter((f) => f.status === 'approved');
  const totalPaid = approved.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const totalCourseFee = Number(student.totalPackage) || 0;
  const totalRemaining = Math.max(0, totalCourseFee - totalPaid);
  return {
    totalPaid,
    totalCourseFee,
    totalRemaining,
    payments: approved.map((f) => ({
      amount: Number(f.amount) || 0,
      date: f.date,
      paymentType: f.type,
    })),
  };
}
