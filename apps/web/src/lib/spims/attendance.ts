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
import type { AttendanceRecord } from '@/types/spims';
import { getCached, setCached } from '@/lib/queryCache';

const CACHE_TTL = 300; // 5 minutes for attendance

export async function markAttendance(staffId: string, date: string): Promise<string> {
  const res = await addDoc(collection(db, 'spims_attendance'), {
    staffId,
    date,
    status: 'present',
    checkInTime: Timestamp.now()
  });
  return res.id;
}

export async function hasMarkedToday(staffId: string, date: string): Promise<boolean> {
  const q = query(
    collection(db, 'spims_attendance'), 
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
    collection(db, 'spims_attendance'), 
    where('staffId', '==', staffId), 
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  
  if (snap.empty) {
    await addDoc(collection(db, 'spims_attendance'), {
      staffId,
      date,
      status,
      overriddenBy: adminId,
      checkInTime: Timestamp.now()
    });
  } else {
    await updateDoc(doc(db, 'spims_attendance', snap.docs[0].id), {
      status,
      overriddenBy: adminId
    });
  }
}

export async function getMonthlyAttendance(staffId: string, month: string): Promise<AttendanceRecord[]> {
  const cacheKey = `spims_attendance_${staffId}_${month}`;
  const cached = getCached<AttendanceRecord[]>(cacheKey);
  if (cached) return cached;

  // month format "2025-01"
  const q = query(
    collection(db, 'spims_attendance'), 
    where('staffId', '==', staffId), 
    where('date', '>=', `${month}-01`),
    where('date', '<=', `${month}-31`)
    // Removed orderBy to avoid composite index requirement
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data, 
      checkInTime: data.checkInTime?.toDate() 
    } as AttendanceRecord;
  }).sort((a, b) => a.date.localeCompare(b.date));

  setCached(cacheKey, results, CACHE_TTL);
  return results;
}

