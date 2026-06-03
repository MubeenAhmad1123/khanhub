// src/lib/rehab/growthPoints.ts
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
import { MonthlyGrowthPoints } from '@/types/rehab';

export async function recalculateGrowthPoints(
  staffId: string,
  month: string,  // "2025-04"
  prefix: string = 'rehab'
): Promise<MonthlyGrowthPoints> {
  let cleanPrefix = prefix;
  if (cleanPrefix === 'job-center') cleanPrefix = 'jobcenter';
  if (cleanPrefix === 'social-media') cleanPrefix = 'media';
  const p = cleanPrefix ? `${cleanPrefix.replace('-', '_')}_` : 'rehab_';

  // 1. Fetch Attendance
  const attendanceQuery = query(
    collection(db, `${p}attendance`),
    where('staffId', '==', staffId)
  );
  const attendanceSnap = await getDocs(attendanceQuery);
  const attendanceDocs = attendanceSnap.docs.filter(d => d.data().date?.startsWith(month));
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

  // 3. Fetch Dress Logs
  const dressQuery = query(
    collection(db, `${p}dress_logs`),
    where('staffId', '==', staffId)
  );
  const dressSnap = await getDocs(dressQuery);
  const dressDocs = dressSnap.docs.filter(d => d.data().date?.startsWith(month));

  // 4. Fetch Contributions
  const contribQuery = query(
    collection(db, `${p}contributions`),
    where('staffId', '==', staffId)
  );
  const contribSnap = await getDocs(contribQuery);
  const contribDocs = contribSnap.docs.filter(d => d.data().date?.startsWith(month));

  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  let attendancePoints = 0;
  let dutyPoints = 0;
  let dressCodePoints = 0;
  let contributionPoints = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${month}-${String(day).padStart(2, '0')}`;

    // Attendance
    const attDoc = attendanceDocs.find(d => d.data().date === dayStr);
    if (attDoc) {
      const data = attDoc.data();
      const status = String(data.status || '').toLowerCase();
      const isLate = data.isLate === true || status === 'late';
      if (status === 'present' && !isLate) {
        attendancePoints += 1;
      }
    }

    // Duty
    const dutyDoc = dutyDocs.find(d => {
      const data = d.data();
      const rawDate = data.date || data.createdAt;
      let dateStr = "";
      if (rawDate instanceof Timestamp) dateStr = rawDate.toDate().toISOString().split('T')[0];
      else if (rawDate?.seconds) dateStr = new Date(rawDate.seconds * 1000).toISOString().split('T')[0];
      else dateStr = String(rawDate).split('T')[0];
      return dateStr === dayStr;
    });
    if (dutyDoc) {
      const data = dutyDoc.data();
      if (data.status === 'completed' || data.status === 'yes') {
        dutyPoints += 1;
      } else if (Array.isArray(data.duties)) {
        const allDone = data.duties.every((duty: any) => duty.status === 'done');
        if (allDone) dutyPoints++;
      }
    }

    // Dress
    const dressDoc = dressDocs.find(d => d.data().date === dayStr);
    if (dressDoc) {
      const data = dressDoc.data();
      if (data.isCompliant === true || data.status === 'yes') {
        dressCodePoints++;
      } else if (Array.isArray(data.items)) {
        const allWearing = data.items.every((item: any) => item.wearing === true || item.status === 'yes');
        if (allWearing) dressCodePoints++;
      }
    }

    // Contribution
    const contribDoc = contribDocs.find(d => d.data().date === dayStr);
    if (contribDoc) {
      const data = contribDoc.data();
      if (data.isApproved === true || data.status === 'yes') {
        contributionPoints += 1;
      }
    }
  }

  // 5. Existing Doc (to keep 'extra' points)
  const existingDoc = await getDocs(query(collection(db, `${p}growth_points`), where('id', '==', `${staffId}_${month}`)));
  const extra = !existingDoc.empty ? (existingDoc.docs[0].data().extra || 0) : 0;

  const totalPossible = daysInMonth * 4; 
  const total = attendancePoints + dutyPoints + dressCodePoints + contributionPoints + extra;
  const percentage = Math.round((total / totalPossible) * 100);

  const growthPoints: MonthlyGrowthPoints = {
    id: `${staffId}_${month}`,
    staffId,
    month,
    attendance: attendancePoints,
    punctuality: 0,
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
  prefix: string = 'rehab'
): Promise<MonthlyGrowthPoints | null> {
  let cleanPrefix = prefix;
  if (cleanPrefix === 'job-center') cleanPrefix = 'jobcenter';
  if (cleanPrefix === 'social-media') cleanPrefix = 'media';
  const p = cleanPrefix ? `${cleanPrefix.replace('-', '_')}_` : 'rehab_';

  const q = query(
    collection(db, `${p}growth_points`),
    where('staffId', '==', staffId),
    where('month', '==', month)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as MonthlyGrowthPoints;
}
