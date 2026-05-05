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
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';


import { db } from '@/lib/firebase';
import { toDate } from '@/lib/utils';
import { getCached, setCached } from '@/lib/queryCache';

import type { SpimsStudent, SpimsFeePayment, SpimsFeeTrackerRecord, SpimsStudentStatus } from '@/types/spims';

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

export async function getUnifiedStudent(id: string): Promise<any | null> {
  // Try getting profile first
  let profile = await getStudent(id);
  
  // Try finding login by studentId or UID
  const qLogin = query(
    collection(db, 'spims_users'), 
    where('role', '==', 'student')
  );
  const loginSnap = await getDocs(qLogin);
  
  // Look for match in logins
  const login = loginSnap.docs.find(d => d.id === id || (d.data() as any).studentId === id);
  const loginData = login ? { uid: login.id, ...login.data() } as any : null;

  if (profile) {
    return { ...profile, login: loginData };
  }

  if (loginData) {
    const data = loginData as { 
      studentId?: string; 
      uid: string; 
      displayName?: string; 
      customId?: string; 
    };
    
    return {
      id: data.studentId || data.uid,
      name: data.displayName || 'Unnamed Student',
      rollNo: data.customId || 'N/A',
      course: 'User Only (Missing Profile)',
      session: 'N/A',
      status: 'Active',
      login: loginData,
      isVirtual: true
    };
  }

  return null;
}

export async function listStudents(): Promise<SpimsStudent[]> {
  const cacheKey = 'spims_students_list';
  const cached = getCached<SpimsStudent[]>(cacheKey);
  if (cached) return cached;

  const q = query(collection(db, 'spims_students'), orderBy('name', 'asc'), limit(1000)); 
  const snap = await getDocs(q);
  const students = snap.docs.map((d) => mapStudent(d.id, d.data() as Record<string, unknown>));
  setCached(cacheKey, students, 60); // 1 min cache
  return students;
}

export async function listStudentLogins(): Promise<any[]> {
  const q = query(collection(db, 'spims_users'), where('role', '==', 'student'), limit(1000));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

export async function listUnifiedStudents(): Promise<any[]> {
  // Fetch profiles and logins in parallel
  const [profiles, logins] = await Promise.all([
    listStudents(),
    listStudentLogins()
  ]);

  // Create a map for quick lookup of logins by studentId
  const loginMap = new Map();
  logins.forEach(l => {
    if (l.studentId) {
      loginMap.set(l.studentId, l);
    }
  });

  // Start with all profile records
  const unified = profiles.map(p => ({
    ...p,
    login: loginMap.get(p.id) || null
  }));

  // Find logins that DON'T have a matching profile record (orphaned or user-only students)
  const profileIds = new Set(profiles.map(p => p.id));
  logins.forEach(l => {
    if (l.studentId && !profileIds.has(l.studentId)) {
      unified.push({
        id: l.studentId,
        name: l.displayName || 'Unnamed Student',
        rollNo: l.customId || 'N/A',
        course: 'User Only (Missing Profile)',
        session: 'N/A',
        status: 'Active',
        login: l,
        isVirtual: true
      } as any);
    } else if (!l.studentId) {
      // User with role student but NO studentId linked
      unified.push({
        id: `user-${l.uid}`,
        name: l.displayName || 'Unnamed Student',
        rollNo: l.customId || 'N/A',
        course: 'Unlinked Login',
        session: 'N/A',
        status: 'Active',
        login: l,
        isVirtual: true
      } as any);
    }
  });

  return unified;
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

export async function updateStudentStatus(id: string, status: SpimsStudentStatus, note?: string): Promise<void> {
  const patch: any = { status, updatedAt: serverTimestamp() };
  if (note) {
    patch.statusNote = note;
  }
  await updateDoc(doc(db, 'spims_students', id), patch);
}

export async function fetchStudentFees(studentId: string): Promise<SpimsFeePayment[]> {
  const cacheKey = `spims_fees_${studentId}`;
  const cached = getCached<SpimsFeePayment[]>(cacheKey);
  if (cached) return cached;

  const q = query(
    collection(db, 'spims_fees'),
    where('studentId', '==', studentId),
    limit(50) // Limit tx history
  );
  const snap = await getDocs(q);
  const fees = snap.docs.map((d) => {
    const row = d.data();
    return {
      id: d.id,
      ...row,
      date: row.date?.toDate ? row.date.toDate() : row.date,
      createdAt: row.createdAt?.toDate ? row.createdAt.toDate() : row.createdAt,
    } as SpimsFeePayment;
  });

  // Client-side sort by date desc
  fees.sort((a, b) => {
    const tA = toDate(a.date).getTime();
    const tB = toDate(b.date).getTime();
    return tB - tA;
  });

  setCached(cacheKey, fees, 60); // 1 min cache for finance
  return fees;
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
export async function updateSpimsUserRole(uid: string, role: string): Promise<void> {
  await updateDoc(doc(db, 'spims_users', uid), { role, updatedAt: serverTimestamp() });
}
