// apps/web/src/lib/voice/voiceTools.ts
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { readHqSessionCookie } from '@/app/hq/actions/auth';
import { resolveEntityByName } from './entityResolver';

async function assertVoiceAccess() {
  const session = await readHqSessionCookie();
  if (!session || !['superadmin', 'manager', 'cashier'].includes(session.role)) {
    throw new Error('Unauthorized');
  }
  return session;
}

function getPKTDate(daysBack: number = 0): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + 300);
  now.setDate(now.getDate() - daysBack);
  return now.toISOString().split('T')[0];
}

// ─── TOOL 1: Latest admission ─────────────────────────────────────────────────
export async function getLatestAdmission(department: string | null) {
  await assertVoiceAccess();

  const collMap: Record<string, string> = {
    rehab: 'rehab_patients',
    hospital: 'hospital_patients',
    spims: 'spims_students',
    welfare: 'welfare_children',
    'job-center': 'jobcenter_seekers',
  };

  const collections = department && collMap[department]
    ? [{ col: collMap[department], dept: department }]
    : Object.entries(collMap).map(([dept, col]) => ({ col, dept }));

  let latest: any = null;
  let latestDept = '';

  for (const { col, dept } of collections) {
    try {
      const snap = await adminDb.collection(col)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!snap.empty) {
        const d = snap.docs[0].data();
        if (!latest || (d.createdAt > latest.createdAt)) {
          latest = { id: snap.docs[0].id, ...d };
          latestDept = dept;
        }
      }
    } catch (e) {
      console.warn(`[voiceTools] getLatestAdmission skipping ${col}:`, e);
    }
  }

  if (!latest) return null;

  let admittedAtStr = '';
  const rawAdmittedAt = latest.admissionDate || latest.createdAt;
  if (rawAdmittedAt) {
    const dDate = rawAdmittedAt.toDate ? rawAdmittedAt.toDate() : new Date(rawAdmittedAt);
    admittedAtStr = dDate.toISOString();
  }

  return {
    name: latest.name || latest.displayName || 'Unknown',
    id: latest.id,
    department: latestDept,
    admittedAt: admittedAtStr,
    detail: latest.substanceOfAddiction
      ? `Addiction: ${latest.substanceOfAddiction}`
      : latest.course
      ? `Course: ${latest.course}`
      : '',
    fatherName: latest.fatherName || '',
    inpatientNumber: latest.inpatientNumber || latest.rollNo || latest.seekerNumber || '',
  };
}

// ─── TOOL 2: Most recent discharge ───────────────────────────────────────────
export async function getMostRecentDischarge(department: string | null) {
  await assertVoiceAccess();

  const collMap: Record<string, string> = {
    rehab: 'rehab_patients',
    hospital: 'hospital_patients',
    spims: 'spims_students',
    welfare: 'welfare_children',
  };

  const collections = department && collMap[department]
    ? [{ col: collMap[department], dept: department }]
    : Object.entries(collMap).map(([dept, col]) => ({ col, dept }));

  let latest: any = null;
  let latestDept = '';

  for (const { col, dept } of collections) {
    try {
      const snap = await adminDb.collection(col)
        .where('dischargeDate', '!=', null)
        .orderBy('dischargeDate', 'desc')
        .limit(1)
        .get();

      if (!snap.empty) {
        const d = snap.docs[0].data();
        const dDate = d.dischargeDate?.toDate?.() || new Date(d.dischargeDate);
        if (!latest || dDate > latest._dischargeMs) {
          latest = { id: snap.docs[0].id, ...d, _dischargeMs: dDate };
          latestDept = dept;
        }
      }
    } catch (e) {
      console.warn(`[voiceTools] getMostRecentDischarge skipping ${col}:`, e);
    }
  }

  if (!latest) return null;

  let dischargeDateStr = '';
  if (latest.dischargeDate) {
    const dDate = latest.dischargeDate.toDate ? latest.dischargeDate.toDate() : new Date(latest.dischargeDate);
    dischargeDateStr = dDate.toISOString();
  }

  return {
    name: latest.name || 'Unknown',
    id: latest.id,
    department: latestDept,
    dischargeDate: dischargeDateStr,
    dischargeReason: latest.dischargeReason || 'Not specified',
    fatherName: latest.fatherName || '',
  };
}

// ─── TOOL 3: Admissions by date ───────────────────────────────────────────────
export async function getAdmissionsByDate(
  department: string | null,
  targetDate: string | null,
  daysBack: number | null
) {
  await assertVoiceAccess();

  let start: Date;
  let end: Date;
  let dateLabel: string;

  if (targetDate) {
    const [year, month, day] = targetDate.split('-').map(Number);
    start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - 5 * 60 * 60 * 1000);
    end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - 5 * 60 * 60 * 1000);
    dateLabel = targetDate;
  } else if (daysBack && daysBack > 0) {
    const todayStr = getPKTDate(0);
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    const pastStr = getPKTDate(daysBack);
    const [pY, pM, pD] = pastStr.split('-').map(Number);
    start = new Date(Date.UTC(pY, pM - 1, pD, 0, 0, 0, 0) - 5 * 60 * 60 * 1000);
    end = new Date(Date.UTC(tY, tM - 1, tD, 23, 59, 59, 999) - 5 * 60 * 60 * 1000);
    dateLabel = `last ${daysBack} days (${pastStr} to ${todayStr})`;
  } else {
    const todayStr = getPKTDate(0);
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    start = new Date(Date.UTC(tY, tM - 1, tD, 0, 0, 0, 0) - 5 * 60 * 60 * 1000);
    end = new Date(Date.UTC(tY, tM - 1, tD, 23, 59, 59, 999) - 5 * 60 * 60 * 1000);
    dateLabel = todayStr;
  }

  const collMap: Record<string, string> = {
    rehab: 'rehab_patients',
    hospital: 'hospital_patients',
    spims: 'spims_students',
    welfare: 'welfare_children',
    'job-center': 'jobcenter_seekers',
  };

  const collections = department && collMap[department]
    ? [{ col: collMap[department], dept: department }]
    : Object.entries(collMap).map(([dept, col]) => ({ col, dept }));

  const admissions: { name: string; id: string; department: string; type: string }[] = [];

  const typeMap: Record<string, string> = {
    rehab: 'patient',
    hospital: 'patient',
    spims: 'student',
    welfare: 'child',
    'job-center': 'job seeker',
    sukoon: 'client',
  };

  for (const { col, dept } of collections) {
    try {
      const snap = await adminDb.collection(col)
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .get();

      const type = typeMap[dept] || 'patient';

      snap.docs.forEach(doc => {
        const d = doc.data();
        admissions.push({
          name: d.name || d.displayName || 'Unknown',
          id: doc.id,
          department: dept,
          type,
        });
      });
    } catch (e) {
      console.warn(`[voiceTools] getAdmissionsByDate skipping ${col}:`, e);
    }
  }

  return { date: dateLabel, count: admissions.length, admissions };
}

// ─── TOOL 9: Discharges by date ───────────────────────────────────────────────
export async function getDischargesByDate(
  department: string | null,
  targetDate: string | null,
  daysBack: number | null
) {
  await assertVoiceAccess();
  
  let start: Date;
  let end: Date;
  let dateLabel: string;

  if (targetDate) {
    const [year, month, day] = targetDate.split('-').map(Number);
    start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - 5 * 60 * 60 * 1000);
    end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - 5 * 60 * 60 * 1000);
    dateLabel = targetDate;
  } else if (daysBack && daysBack > 0) {
    const todayStr = getPKTDate(0);
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    const pastStr = getPKTDate(daysBack);
    const [pY, pM, pD] = pastStr.split('-').map(Number);
    start = new Date(Date.UTC(pY, pM - 1, pD, 0, 0, 0, 0) - 5 * 60 * 60 * 1000);
    end = new Date(Date.UTC(tY, tM - 1, tD, 23, 59, 59, 999) - 5 * 60 * 60 * 1000);
    dateLabel = `last ${daysBack} days (${pastStr} to ${todayStr})`;
  } else {
    const todayStr = getPKTDate(0);
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    start = new Date(Date.UTC(tY, tM - 1, tD, 0, 0, 0, 0) - 5 * 60 * 60 * 1000);
    end = new Date(Date.UTC(tY, tM - 1, tD, 23, 59, 59, 999) - 5 * 60 * 60 * 1000);
    dateLabel = todayStr;
  }

  const collMap: Record<string, string> = {
    rehab: 'rehab_patients',
    hospital: 'hospital_patients',
    spims: 'spims_students',
    welfare: 'welfare_children',
  };

  const collections = department && collMap[department]
    ? [{ col: collMap[department], dept: department }]
    : Object.entries(collMap).map(([dept, col]) => ({ col, dept }));

  const discharges: { name: string; id: string; department: string; type: string }[] = [];

  const typeMap: Record<string, string> = {
    rehab: 'patient',
    hospital: 'patient',
    spims: 'student',
    welfare: 'child',
  };

  for (const { col, dept } of collections) {
    try {
      const snap = await adminDb.collection(col)
        .where('dischargeDate', '>=', start)
        .where('dischargeDate', '<=', end)
        .get();

      const type = typeMap[dept] || 'patient';

      snap.docs.forEach(doc => {
        const d = doc.data();
        discharges.push({
          name: d.name || 'Unknown',
          id: doc.id,
          department: dept,
          type,
        });
      });
    } catch (e) {
      console.warn(`[voiceTools] getDischargesByDate skipping ${col}:`, e);
    }
  }

  return { date: dateLabel, count: discharges.length, discharges };
}

// ─── TOOL 4: Financial summary ────────────────────────────────────────────────
export async function getFinancialSummary(
  department: string | null,
  targetDate: string | null,
  daysBack: number | null
) {
  await assertVoiceAccess();
  
  let start: Date;
  let end: Date;
  let dateLabel: string;

  if (targetDate) {
    const [year, month, day] = targetDate.split('-').map(Number);
    start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - 5 * 60 * 60 * 1000);
    end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - 5 * 60 * 60 * 1000);
    dateLabel = targetDate;
  } else if (daysBack && daysBack > 0) {
    const todayStr = getPKTDate(0);
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    const pastStr = getPKTDate(daysBack);
    const [pY, pM, pD] = pastStr.split('-').map(Number);
    start = new Date(Date.UTC(pY, pM - 1, pD, 0, 0, 0, 0) - 5 * 60 * 60 * 1000);
    end = new Date(Date.UTC(tY, tM - 1, tD, 23, 59, 59, 999) - 5 * 60 * 60 * 1000);
    dateLabel = `last ${daysBack} days (${pastStr} to ${todayStr})`;
  } else {
    const todayStr = getPKTDate(0);
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    start = new Date(Date.UTC(tY, tM - 1, tD, 0, 0, 0, 0) - 5 * 60 * 60 * 1000);
    end = new Date(Date.UTC(tY, tM - 1, tD, 23, 59, 59, 999) - 5 * 60 * 60 * 1000);
    dateLabel = todayStr;
  }

  const txCollMap: Record<string, string> = {
    rehab: 'rehab_transactions',
    spims: 'spims_transactions',
    hospital: 'hospital_transactions',
    welfare: 'welfare_transactions',
    'job-center': 'jobcenter_transactions',
  };

  const collections = department && txCollMap[department]
    ? [{ col: txCollMap[department], dept: department }]
    : Object.entries(txCollMap).map(([dept, col]) => ({ col, dept }));

  let totalIncome = 0;
  let totalExpense = 0;
  let txCount = 0;
  const breakdown: { dept: string; income: number; expense: number }[] = [];

  for (const { col, dept } of collections) {
    try {
      // Query date range only, filtering status client-side to bypass composite index requirements
      const snap = await adminDb.collection(col)
        .where('date', '>=', start)
        .where('date', '<=', end)
        .get();

      let dIncome = 0;
      let dExpense = 0;
      snap.docs.forEach(doc => {
        const d = doc.data();
        if (d.status === 'approved') {
          txCount++;
          if (d.type === 'income') dIncome += d.amount || 0;
          else if (d.type === 'expense') dExpense += d.amount || 0;
        }
      });

      totalIncome += dIncome;
      totalExpense += dExpense;
      if (dIncome > 0 || dExpense > 0) {
        breakdown.push({ dept, income: dIncome, expense: dExpense });
      }
    } catch (e) {
      console.warn(`[voiceTools] getFinancialSummary skipping ${col}:`, e);
    }
  }

  return {
    date: dateLabel,
    income: totalIncome,
    expense: totalExpense,
    net: totalIncome - totalExpense,
    department: department || 'all',
    transactionCount: txCount,
    breakdown,
  };
}

// ─── TOOL 5: Remaining fee ────────────────────────────────────────────────────
export async function getRemainingFee(entityId: string, department: string | null) {
  await assertVoiceAccess();

  const feeCollMap: Record<string, string> = {
    rehab: 'rehab_fees',
    hospital: 'hospital_fees',
    spims: 'spims_students', // remaining is on the student doc itself
  };

  const collections = department && feeCollMap[department]
    ? [{ col: feeCollMap[department], dept: department }]
    : Object.entries(feeCollMap).map(([dept, col]) => ({ col, dept }));

  for (const { col, dept } of collections) {
    try {
      // For spims — remaining is directly on the student doc
      if (dept === 'spims') {
        const doc = await adminDb.collection('spims_students').doc(entityId).get();
        if (doc.exists) {
          const d = doc.data()!;
          return {
            amountRemaining: d.remaining || 0,
            amountPaid: d.totalReceived || 0,
            totalAmount: d.totalPackage || 0,
            lastPaymentDate: null,
            lastPaymentAmount: null,
            department: 'spims',
          };
        }
        continue;
      }

      // For rehab/hospital — check fee sub-collection
      const snap = await adminDb.collection(col)
        .where('patientId', '==', entityId)
        .limit(1)
        .get();

      if (!snap.empty) {
        const d = snap.docs[0].data();
        return {
          amountRemaining: d.amountRemaining || 0,
          amountPaid: d.amountPaid || 0,
          totalAmount: d.totalAmount || 0,
          lastPaymentDate: d.lastPaymentDate || null,
          lastPaymentAmount: d.lastPaymentAmount || null,
          department: dept,
        };
      }
    } catch (e) {
      console.warn(`[voiceTools] getRemainingFee skipping ${col}:`, e);
    }
  }

  return null;
}

// ─── TOOL 6: Search person by name or ID ─────────────────────────────────────
export async function searchPersonByName(
  name: string | null,
  entityId: string | null,
  entityType: string | null,
  department: string | null
) {
  await assertVoiceAccess();

  const allDepts = ['rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center'];
  const { matches } = await resolveEntityByName(
    name,
    entityId,
    entityType as any,
    department ? [department] : allDepts
  );

  return matches.map(m => {
    let type = 'patient';
    if (m.collection.endsWith('_users') || m.collection.endsWith('_staff')) {
      type = 'staff';
    } else if (m.collection === 'spims_students') {
      type = 'student';
    } else if (m.collection === 'welfare_children') {
      type = 'child';
    } else if (m.collection === 'job_center_seekers') {
      type = 'seeker';
    }

    return {
      id: m.id,
      name: m.name,
      fatherName: m.fatherName || '',
      department: m.department,
      type,
      identifier: m.identifierLabel || m.id,
    };
  });
}

// ─── TOOL 7: Attendance summary ───────────────────────────────────────────────
export async function getAttendanceSummary(
  targetDate: string | null,
  daysBack: number | null
) {
  await assertVoiceAccess();
  const date = targetDate || getPKTDate(daysBack || 0);

  try {
    const snap = await adminDb.collection('hq_attendance')
      .where('date', '==', date)
      .get();

    const present = snap.docs.filter(d => d.data().status === 'present').length;
    const absent = snap.docs.filter(d => d.data().status === 'absent').length;
    const leave = snap.docs.filter(d => ['leave', 'paid_leave', 'unpaid_leave'].includes(d.data().status)).length;
    const total = snap.docs.length;

    return { date, present, absent, leave, total };
  } catch (e) {
    console.warn('[voiceTools] getAttendanceSummary error:', e);
    return null;
  }
}

// ─── TOOL 8: Students by course ───────────────────────────────────────────────
export async function getStudentsByCourse(course: string) {
  await assertVoiceAccess();

  try {
    const snap = await adminDb.collection('spims_students')
      .where('course', '==', course)
      .get();

    const activeStudents = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((d: any) => d.status === 'active');

    // Sort by name client-side
    activeStudents.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    return {
      course,
      count: activeStudents.length,
      students: activeStudents.map((d: any) => ({ name: d.name, rollNo: d.rollNo, id: d.id })),
    };
  } catch (e) {
    console.warn('[voiceTools] getStudentsByCourse error:', e);
    return null;
  }
}
