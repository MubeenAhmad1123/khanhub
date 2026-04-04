// src/lib/rehab/notifications.ts
import { 
  db 
} from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';

export async function checkUnmarkedDuties(managerId: string): Promise<string[]> {
  const today = new Date().toISOString().split('T')[0];
  
  // 1. Get all active staff
  const staffQuery = query(
    collection(db, 'rehab_staff'),
    where('isActive', '==', true)
  );
  const staffSnap = await getDocs(staffQuery);
  const activeStaff = staffSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));

  // 2. Get all duty logs for today
  const dutyLogQuery = query(
    collection(db, 'rehab_duty_logs'),
    where('date', '==', today)
  );
  const dutyLogSnap = await getDocs(dutyLogQuery);
  const markedStaffIds = new Set(dutyLogSnap.docs.map(doc => doc.data().staffId));

  // 3. Filter staff without a log
  const unmarkedStaffNames = activeStaff
    .filter(staff => !markedStaffIds.has(staff.id))
    .map(staff => staff.name);

  return unmarkedStaffNames;
}
