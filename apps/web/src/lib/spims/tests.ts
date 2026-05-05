// apps/web/src/lib/spims/tests.ts

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDate } from '@/lib/utils';


export type SpimsTestScope = 'all' | 'course_session' | 'student';

export type SpimsTest = {
  id: string;
  title: string;
  scope: SpimsTestScope;
  course?: string | null;
  session?: string | null;
  studentId?: string | null;
  scheduledAt?: Timestamp | Date | null;
  note?: string | null;
  createdAt?: Timestamp | Date;
  createdBy?: string | null;
  testDate?: string | null;
};

export async function createSpimsTest(input: Omit<SpimsTest, 'id' | 'createdAt'>) {
  const ref = await addDoc(collection(db, 'spims_tests'), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSpimsTest(id: string, patch: Partial<SpimsTest>) {
  const { id: _id, ...rest } = patch as any;
  await updateDoc(doc(db, 'spims_tests', id), rest);
}

export async function deleteSpimsTest(id: string) {
  await deleteDoc(doc(db, 'spims_tests', id));
}

export function subscribeAdminTests(onData: (rows: SpimsTest[]) => void) {
  const q = query(collection(db, 'spims_tests'), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(q, 
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    },
    (err) => {
      console.warn('[tests] Admin tests snapshot error:', err);
    }
  );
}

export function subscribeStudentTests(params: {
  studentId: string;
  course: string;
  session: string;
  onData: (rows: SpimsTest[]) => void;
}) {
  const buffers: Record<string, SpimsTest[]> = { all: [], cs: [], student: [] };
  const push = () => {
    const merged = [...buffers.all, ...buffers.cs, ...buffers.student];
    const seen = new Set<string>();
    const uniq = merged.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
    params.onData(
      uniq.sort((a, b) => {
        const aMs = toDate(a.createdAt).getTime();
        const bMs = toDate(b.createdAt).getTime();
        return bMs - aMs;
      })

    );
  };

  const unsubs: Array<() => void> = [];
  unsubs.push(
    onSnapshot(query(collection(db, 'spims_tests'), where('scope', '==', 'all'), orderBy('createdAt', 'desc'), limit(50)), 
      (snap) => {
        buffers.all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        push();
      },
      (err) => console.warn('[tests] "all" scope snapshot error:', err)
    )
  );
  unsubs.push(
    onSnapshot(
      query(
        collection(db, 'spims_tests'),
        where('scope', '==', 'course_session'),
        where('course', '==', params.course),
        where('session', '==', params.session),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
      (snap) => {
        buffers.cs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        push();
      },
      (err) => console.warn('[tests] "course_session" scope snapshot error:', err)
    )
  );
  unsubs.push(
    onSnapshot(
      query(
        collection(db, 'spims_tests'),
        where('scope', '==', 'student'),
        where('studentId', '==', params.studentId),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
      (snap) => {
        buffers.student = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        push();
      },
      (err) => console.warn('[tests] "student" scope snapshot error:', err)
    )
  );

  return () => unsubs.forEach((u) => u());
}

