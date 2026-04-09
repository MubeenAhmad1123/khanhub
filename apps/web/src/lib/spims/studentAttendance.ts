// apps/web/src/lib/spims/studentAttendance.ts

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type SpimsStudentAttendanceStatus = 'present' | 'absent';

export type SpimsStudentAttendance = {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: SpimsStudentAttendanceStatus;
  markedBy?: string | null;
  createdAt?: any;
  updatedAt?: any;
};

export async function upsertAttendance(params: {
  studentId: string;
  date: string;
  status: SpimsStudentAttendanceStatus;
  markedBy?: string | null;
}) {
  const id = `${params.date}_${params.studentId}`;
  await setDoc(
    doc(db, 'spims_student_attendance', id),
    {
      studentId: params.studentId,
      date: params.date,
      status: params.status,
      markedBy: params.markedBy || null,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  return id;
}

export function subscribeStudentAttendance(params: {
  studentId: string;
  onData: (rows: SpimsStudentAttendance[]) => void;
}) {
  const q = query(
    collection(db, 'spims_student_attendance'),
    where('studentId', '==', params.studentId),
    orderBy('date', 'desc'),
    limit(90)
  );
  return onSnapshot(q, (snap) => {
    params.onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
  });
}

