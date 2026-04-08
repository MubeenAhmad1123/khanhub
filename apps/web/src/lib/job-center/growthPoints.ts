// src/lib/job-center/growthPoints.ts
import { 
  db 
} from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { MonthlyGrowthPoints } from '@/types/job-center';

export async function recalculateGrowthPoints(
  staffId: string,
  month: string,  // "2025-04"
  prefix: string = 'job-center'
): Promise<MonthlyGrowthPoints> {
  const p = prefix ? `${prefix}_` : 'job-center_';

  // 1. Fetch Attendance
  const attendanceQuery = query(
    collection(db, `${p}attendance`),
    where('staffId', '==', staffId)
  );
  const attendanceSnap = await getDocs(attendanceQuery);
  const attendanceDocs = attendanceSnap.docs.filter(d => d.data().date?.startsWith(month));
  
  const attendancePoints = attendanceDocs.filter(d => d.data().status === 'present').length;
  const punctualityPoints = attendanceDocs.filter(d => d.data().status === 'present' && d.data().isLate === false).length;
  
  // 2. Fetch Duty Logs
  const dutyQuery = query(
    collection(db, `${p}duty_logs`),
    where('staffId', '==', staffId)
  );
  const dutySnap = await getDocs(dutyQuery);
  const dutyDocs = dutySnap.docs.filter(d => {
    const rawDate = d.data().date || d.data().createdAt;
    let dateStr = "";
    if (rawDate instanceof Timestamp) dateStr = rawDate.toDate().toISOString();
    else if (rawDate?.seconds) dateStr = new Date(rawDate.seconds * 1000).toISOString();
    else dateStr = String(rawDate);
    return dateStr.startsWith(month);
  });
  
  let dutyPoints = 0;
  dutyDocs.forEach(d => {
    const data = d.data();
    // Support both single status and array of duties
    if (data.status === 'completed') {
      dutyPoints += 1;
    } else if (Array.isArray(data.duties)) {
      const allDone = data.duties.every((duty: any) => duty.status === 'done');
      if (allDone) dutyPoints++;
    }
  });

  // 3. Fetch Dress Logs
  const dressQuery = query(
    collection(db, `${p}dress_logs`),
    where('staffId', '==', staffId)
  );
  const dressSnap = await getDocs(dressQuery);
  const dressDocs = dressSnap.docs.filter(d => d.data().date?.startsWith(month));
  
  let dressCodePoints = 0;
  dressDocs.forEach(d => {
    const data = d.data();
    if (data.isCompliant === true) {
      dressCodePoints++;
    } else if (Array.isArray(data.items)) {
      const allWearing = data.items.every((item: any) => item.wearing === true);
      if (allWearing) dressCodePoints++;
    }
  });

  // 4. Fetch Contributions
  const contribQuery = query(
    collection(db, `${p}contributions`),
    where('staffId', '==', staffId)
  );
  const contribSnap = await getDocs(contribQuery);
  const contribDocs = contribSnap.docs.filter(d => d.data().date?.startsWith(month));
  
  let contributionPoints = 0;
  contribDocs.forEach(d => {
    const data = d.data();
    if (data.isApproved === true) {
      contributionPoints += (data.points || 0); // Sum of points, not count
    }
  });

  // 5. Existing Doc (to keep 'extra' points)
  const existingDoc = await getDocs(query(collection(db, `${p}growth_points`), where('id', '==', `${staffId}_${month}`)));
  const extra = !existingDoc.empty ? (existingDoc.docs[0].data().extra || 0) : 0;

  // 6. Calculate Possible Points
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const totalPossible = daysInMonth * 5; 

  const total = attendancePoints + punctualityPoints + dutyPoints + dressCodePoints + contributionPoints + extra;
  const percentage = Math.round((total / totalPossible) * 100);

  const growthPoints: MonthlyGrowthPoints = {
    id: `${staffId}_${month}`,
    staffId,
    month,
    attendance: attendancePoints,
    punctuality: punctualityPoints,
    duties: dutyPoints,
    dressCode: dressCodePoints,
    contributions: contributionPoints,
    extra,
    total,
    totalPossible,
    percentage,
    lastCalculatedAt: new Date().toISOString()
  };

  await setDoc(doc(db, `${p}growth_points`, growthPoints.id), growthPoints, { merge: true });

  return growthPoints;
}

export async function getGrowthPoints(
  staffId: string,
  month: string,
  prefix: string = 'job-center'
): Promise<MonthlyGrowthPoints | null> {
  const p = prefix ? `${prefix}_` : 'job-center_';
  const q = query(
    collection(db, `${p}growth_points`),
    where('staffId', '==', staffId),
    where('month', '==', month)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as MonthlyGrowthPoints;
}
