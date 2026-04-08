import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/types/job-center';

export async function markAttendance(staffId: string, date: string): Promise<string> {
  const res = await addDoc(collection(db, 'job-center_attendance'), {
    staffId,
    date,
    status: 'present',
    checkInTime: Timestamp.now()
  });
  return res.id;
}

export async function hasMarkedToday(staffId: string, date: string): Promise<boolean> {
  const q = query(
    collection(db, 'job-center_attendance'), 
    where('staffId', '==', staffId), 
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function overrideAttendance(
  staffId: string, 
  date: string, 
  status: 'present' | 'absent' | 'leave', 
  adminId: string
): Promise<void> {
  const q = query(
    collection(db, 'job-center_attendance'), 
    where('staffId', '==', staffId), 
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  
  if (snap.empty) {
    await addDoc(collection(db, 'job-center_attendance'), {
      staffId,
      date,
      status,
      overriddenBy: adminId,
      checkInTime: Timestamp.now()
    });
  } else {
    await updateDoc(doc(db, 'job-center_attendance', snap.docs[0].id), {
      status,
      overriddenBy: adminId
    });
  }
}

export async function getMonthlyAttendance(staffId: string, month: string): Promise<AttendanceRecord[]> {
  // month format "2025-01"
  const q = query(
    collection(db, 'job-center_attendance'), 
    where('staffId', '==', staffId), 
    where('date', '>=', `${month}-01`),
    where('date', '<=', `${month}-31`),
    orderBy('date', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data, 
      checkInTime: data.checkInTime?.toDate() 
    } as AttendanceRecord;
  });
}
