// apps/web/src/lib/voice/voiceTools.ts
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { readHqSessionCookie } from '@/app/hq/actions/auth';
import { resolveEntityByName } from './entityResolver';
import { getCompletion } from './aiProvider';
import { DEFAULT_KNOWLEDGE } from './getData';

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

function resolveDateRange(
  startDate: string | null,
  endDate: string | null,
  daysBack: number | null
): { start: Date; end: Date; label: string; rawStart: string; rawEnd: string } {
  const resolvedStartDate = startDate || (daysBack ? getPKTDate(daysBack) : getPKTDate(0));
  const resolvedEndDate = endDate || getPKTDate(0);

  const [sY, sM, sD] = resolvedStartDate.split('-').map(Number);
  const [eY, eM, eD] = resolvedEndDate.split('-').map(Number);

  const start = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0, 0) - 5 * 60 * 60 * 1000);
  const end = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999) - 5 * 60 * 60 * 1000);

  const label = resolvedStartDate === resolvedEndDate ? resolvedStartDate : `${resolvedStartDate} to ${resolvedEndDate}`;
  return { start, end, label, rawStart: resolvedStartDate, rawEnd: resolvedEndDate };
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
      const orderByField = (dept === 'rehab' || dept === 'hospital' || dept === 'spims')
        ? 'admissionDate'
        : 'createdAt';

      const snap = await adminDb.collection(col)
        .orderBy(orderByField, 'desc')
        .limit(1)
        .get();

      if (!snap.empty) {
        const d = snap.docs[0].data();
        const scoreKey = (dept === 'rehab' || dept === 'hospital' || dept === 'spims') ? 'admissionDate' : 'createdAt';
        if (!latest || (d[scoreKey] > latest[scoreKey])) {
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
  startDate: string | null,
  endDate: string | null,
  daysBack: number | null
) {
  await assertVoiceAccess();
  const { start, end, label } = resolveDateRange(startDate, endDate, daysBack);

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
      const dateField = (dept === 'rehab' || dept === 'hospital' || dept === 'spims')
        ? 'admissionDate'
        : 'createdAt';

      const snap = await adminDb.collection(col)
        .where(dateField, '>=', start)
        .where(dateField, '<=', end)
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

  return { date: label, count: admissions.length, admissions };
}

// ─── TOOL 9: Discharges by date ───────────────────────────────────────────────
export async function getDischargesByDate(
  department: string | null,
  startDate: string | null,
  endDate: string | null,
  daysBack: number | null
) {
  await assertVoiceAccess();
  const { start, end, label } = resolveDateRange(startDate, endDate, daysBack);

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

  return { date: label, count: discharges.length, discharges };
}

// ─── TOOL 4: Financial summary ────────────────────────────────────────────────
export async function getFinancialSummary(
  department: string | null,
  startDate: string | null,
  endDate: string | null,
  daysBack: number | null
) {
  await assertVoiceAccess();
  const { start, end, label } = resolveDateRange(startDate, endDate, daysBack);

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
    date: label,
    income: totalIncome,
    expense: totalExpense,
    net: totalIncome - totalExpense,
    department: department || 'all',
    transactionCount: txCount,
    breakdown,
  };
}

// ─── TOOL 5: Remaining fee ────────────────────────────────────────────────────
export async function getRemainingFee(entityId: string | null, department: string | null) {
  await assertVoiceAccess();

  if (!entityId) {
    let rehabTotal = 0;
    let rehabCount = 0;
    let hospitalTotal = 0;
    let hospitalCount = 0;
    let spimsTotal = 0;
    let spimsCount = 0;

    const rehabList: any[] = [];
    const hospitalList: any[] = [];
    const spimsList: any[] = [];

    const deptStr = department ? String(department).toLowerCase().trim() : 'all';

    if (deptStr === 'all' || deptStr === 'rehab') {
      try {
        const snap = await adminDb.collection('rehab_patients').get();
        snap.docs.forEach(doc => {
          const d = doc.data();
          if (d.isActive !== false) {
            const rem = Number(d.remaining ?? d.overallRemaining ?? d.remainingAmount ?? d.amountRemaining ?? 0);
            if (rem > 0) {
              rehabTotal += rem;
              rehabCount++;
              rehabList.push({
                id: doc.id,
                name: d.name || d.displayName || 'Unnamed Patient',
                remaining: rem,
                department: 'rehab',
                type: 'patient'
              });
            }
          }
        });
      } catch (e) {
        console.warn('[voiceTools] Error getting rehab outstanding:', e);
      }
    }

    if (deptStr === 'all' || deptStr === 'hospital') {
      try {
        const snap = await adminDb.collection('hospital_patients').get();
        snap.docs.forEach(doc => {
          const d = doc.data();
          const rem = Number(d.remaining ?? d.remainingAmount ?? 0);
          if (rem > 0) {
            hospitalTotal += rem;
            hospitalCount++;
            hospitalList.push({
              id: doc.id,
              name: d.name || d.displayName || 'Unnamed Patient',
              remaining: rem,
              department: 'hospital',
              type: 'patient'
            });
          }
        });
      } catch (e) {
        console.warn('[voiceTools] Error getting hospital outstanding:', e);
      }
    }

    if (deptStr === 'all' || deptStr === 'spims') {
      try {
        const snap = await adminDb.collection('spims_students').get();
        snap.docs.forEach(doc => {
          const d = doc.data();
          const status = (d.status || '').toLowerCase();
          if (status !== 'left' && status !== 'pass' && status !== 'fail' && status !== 'terminated') {
            const rem = Number(d.remaining ?? d.remainingBalance ?? 0);
            if (rem > 0) {
              spimsTotal += rem;
              spimsCount++;
              spimsList.push({
                id: doc.id,
                name: d.name || d.displayName || 'Unnamed Student',
                remaining: rem,
                department: 'spims',
                type: 'student'
              });
            }
          }
        });
      } catch (e) {
        console.warn('[voiceTools] Error getting spims outstanding:', e);
      }
    }

    if (deptStr === 'rehab') {
      return {
        totalOutstanding: rehabTotal,
        patientCount: rehabCount,
        department: 'rehab',
        type: 'department_summary',
        list: rehabList
      };
    } else if (deptStr === 'hospital') {
      return {
        totalOutstanding: hospitalTotal,
        patientCount: hospitalCount,
        department: 'hospital',
        type: 'department_summary',
        list: hospitalList
      };
    } else if (deptStr === 'spims') {
      return {
        totalOutstanding: spimsTotal,
        studentCount: spimsCount,
        department: 'spims',
        type: 'department_summary',
        list: spimsList
      };
    } else {
      return {
        totalOutstanding: rehabTotal + hospitalTotal + spimsTotal,
        rehabTotal,
        hospitalTotal,
        spimsTotal,
        department: 'all',
        type: 'all_summary',
        list: [...rehabList, ...hospitalList, ...spimsList]
      };
    }
  }

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

        // Fetch patient details from parent collection
        const patientCollMap: Record<string, string> = {
          rehab: 'rehab_patients',
          hospital: 'hospital_patients',
          sukoon: 'sukoon_patients',
        };
        
        let admissionDate = null;
        let dischargeDate = null;
        let stayDurationDays = null;
        let remainingDays = null;
        let isActive = null;
        let name = null;
        
        const patientCol = patientCollMap[dept];
        if (patientCol) {
          const pDoc = await adminDb.collection(patientCol).doc(entityId).get();
          if (pDoc.exists) {
            const pData = pDoc.data()!;
            name = pData.name || pData.displayName || null;
            isActive = pData.isActive !== false;
            
            // Dates
            const adm = pData.admissionDate;
            const dis = pData.dischargeDate;
            
            if (adm) {
              try {
                const d = adm.toDate ? adm.toDate() : new Date(adm);
                if (!isNaN(d.getTime())) {
                  admissionDate = d.toISOString().split('T')[0];
                  const endDate = dis ? (dis.toDate ? dis.toDate() : new Date(dis)) : new Date();
                  if (!isNaN(endDate.getTime())) {
                    const diffTimeMs = endDate.getTime() - d.getTime();
                    stayDurationDays = diffTimeMs > 0 ? Math.floor(diffTimeMs / (1000 * 60 * 60 * 24)) : 0;
                  }
                  const diffToday = new Date().getTime() - d.getTime();
                  const daysAdmitted = diffToday > 0 ? Math.floor(diffToday / (1000 * 60 * 60 * 24)) : 0;
                  remainingDays = Math.max(0, 100 - daysAdmitted);
                } else {
                  admissionDate = String(adm);
                }
              } catch (e) {
                admissionDate = String(adm);
              }
            }
            if (dis) {
              try {
                const d = dis.toDate ? dis.toDate() : new Date(dis);
                if (!isNaN(d.getTime())) {
                  dischargeDate = d.toISOString().split('T')[0];
                } else {
                  dischargeDate = String(dis);
                }
              } catch (e) {
                dischargeDate = String(dis);
              }
            }
          }
        }

        return {
          amountRemaining: d.amountRemaining || 0,
          amountPaid: d.amountPaid || 0,
          totalAmount: d.totalAmount || 0,
          lastPaymentDate: d.lastPaymentDate || null,
          lastPaymentAmount: d.lastPaymentAmount || null,
          department: dept,
          admissionDate,
          dischargeDate,
          stayDurationDays,
          remainingDays,
          isActive,
          name,
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
  startDate: string | null,
  endDate: string | null,
  daysBack: number | null,
  department: string | null = null
) {
  await assertVoiceAccess();
  const { rawStart, rawEnd, label } = resolveDateRange(startDate, endDate, daysBack);

  const depts = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];
  const cleanedDept = department ? String(department).toLowerCase().trim() : null;

  // Search all depts if department is null, 'hq', or 'all'
  const targetDepts = (cleanedDept && cleanedDept !== 'hq' && depts.includes(cleanedDept))
    ? [cleanedDept]
    : depts;

  const txCollMap: Record<string, { col: string; prefix: string }> = {
    hq: { col: 'hq_users', prefix: 'hq' },
    rehab: { col: 'rehab_users', prefix: 'rehab' },
    spims: { col: 'spims_users', prefix: 'spims' },
    hospital: { col: 'hospital_users', prefix: 'hospital' },
    sukoon: { col: 'sukoon_users', prefix: 'sukoon' },
    welfare: { col: 'welfare_users', prefix: 'welfare' },
    'job-center': { col: 'jobcenter_users', prefix: 'jobcenter' },
    'social-media': { col: 'media_users', prefix: 'media' },
    it: { col: 'it_users', prefix: 'it' }
  };

  const getSimpleId = (id: string) => {
    if (!id) return '';
    const prefixes = ['hq_', 'rehab_', 'spims_', 'hospital_', 'sukoon_', 'welfare_', 'jobcenter_', 'media_', 'it_'];
    for (const pref of prefixes) {
      if (id.startsWith(pref)) return id.substring(pref.length);
    }
    return id;
  };

  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;
  let unmarkedCount = 0;

  const presentStaff: { name: string; role: string; dept: string; status: string }[] = [];
  const absentStaff: { name: string; role: string; dept: string; status: string }[] = [];
  const leaveStaff: { name: string; role: string; dept: string; status: string }[] = [];
  const lateStaff: { name: string; role: string; dept: string; time?: string }[] = [];
  const noUniformStaff: { name: string; role: string; dept: string; missingItems: string[] }[] = [];
  const pendingDutyStaff: { name: string; role: string; dept: string; dutyStatus: string; pendingDuties: string[] }[] = [];

  const timeToMinutes = (timeStr?: string) => {
    if (!timeStr) return null;
    const clean = timeStr.trim().toUpperCase();
    const isPM = clean.includes('PM');
    const isAM = clean.includes('AM');
    const numeric = clean.replace(/[^0-9:]/g, '');
    const parts = numeric.split(':');
    if (parts.length < 2) return null;
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + m;
  };

  for (const dept of targetDepts) {
    const config = txCollMap[dept];
    if (!config) continue;

    try {
      // 1. Fetch active staff users
      const usersSnap = await adminDb.collection(config.col).get();
      const activeUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((u: any) => {
        const r = String(u.role || '').toLowerCase();
        const desig = String(u.designation || '').toLowerCase();
        const n = String(u.name || u.displayName || '').toLowerCase();
        const e = String(u.email || '').toLowerCase();
        
        if (n.includes('super') || n.includes('network') || e.includes('super') || e.includes('network')) {
          return false;
        }

        const statusStr = String(u.status || '').toLowerCase().trim();

        if (n === 'vacant' || n.includes('vacant') || statusStr === 'vacant' || statusStr === 'active_vacancy') {
          return false;
        }

        const nameVal = (u.name || u.displayName || '').trim();
        if (!nameVal || nameVal === '—' || nameVal === '-') {
          return false;
        }

        const EXCLUDED_ROLES = ['patient', 'family', 'student', 'client', 'seeker', 'user', 'superadmin', 'donor', 'child', 'oldage', 'beneficiary', 'orphan'];
        if (EXCLUDED_ROLES.some(ex => r.includes(ex) || desig.includes(ex))) {
          return false;
        }

        const isActive = u.isActive !== false && 
          statusStr !== 'inactive' && 
          statusStr !== 'resigned' && 
          statusStr !== 'terminated' && 
          statusStr !== 'executive' && 
          statusStr !== 'hide';

        return isActive;
      });

      if (activeUsers.length === 0) continue;

      // 2. Fetch attendance logs, dress logs, and duty logs
      const [attSnap, dressSnap, dutySnap] = await Promise.all([
        adminDb.collection(`${config.prefix}_attendance`)
          .where('date', '>=', rawStart)
          .where('date', '<=', rawEnd)
          .get(),
        adminDb.collection(`${config.prefix}_dress_logs`)
          .where('date', '>=', rawStart)
          .where('date', '<=', rawEnd)
          .get(),
        adminDb.collection(`${config.prefix}_duty_logs`)
          .where('date', '>=', rawStart)
          .where('date', '<=', rawEnd)
          .get()
      ]);

      const attMap: Record<string, any> = {};
      attSnap.docs.forEach(doc => {
        const data = doc.data();
        let sid = data.staffId || doc.id;
        
        if (!data.staffId && sid.includes('_')) {
          const parts = sid.split('_');
          if (parts[parts.length - 1].includes('-') && parts[parts.length - 1].length === 10) {
            parts.pop(); // remove date suffix
          }
          if (parts[0] === config.prefix) {
            parts.shift(); // remove dept prefix
          }
          sid = parts.join('_');
        }

        attMap[sid] = data;
        const simpleSid = sid.includes('_') ? sid.split('_').slice(1).join('_') : sid;
        attMap[simpleSid] = data;
      });

      const dressMap: Record<string, any> = {};
      dressSnap.docs.forEach(doc => {
        const data = doc.data();
        let sid = data.staffId || doc.id;
        
        if (!data.staffId && sid.includes('_')) {
          const parts = sid.split('_');
          if (parts[parts.length - 1].includes('-') && parts[parts.length - 1].length === 10) {
            parts.pop(); // remove date suffix
          }
          if (parts[0] === config.prefix) {
            parts.shift(); // remove dept prefix
          }
          sid = parts.join('_');
        }

        dressMap[sid] = data;
        const simpleSid = sid.includes('_') ? sid.split('_').slice(1).join('_') : sid;
        dressMap[simpleSid] = data;
      });

      const dutyMap: Record<string, any> = {};
      dutySnap.docs.forEach(doc => {
        const data = doc.data();
        let sid = data.staffId || doc.id;
        
        if (!data.staffId && sid.includes('_')) {
          const parts = sid.split('_');
          if (parts[parts.length - 1].includes('-') && parts[parts.length - 1].length === 10) {
            parts.pop(); // remove date suffix
          }
          if (parts[0] === config.prefix) {
            parts.shift(); // remove dept prefix
          }
          sid = parts.join('_');
        }

        const existing = dutyMap[sid];
        if (!existing || (!existing.duties && data.duties)) {
          dutyMap[sid] = data;
          const simpleSid = sid.includes('_') ? sid.split('_').slice(1).join('_') : sid;
          dutyMap[simpleSid] = data;
        }
      });

      // 3. Match
      activeUsers.forEach((u: any) => {
        const simpleId = getSimpleId(u.id);
        const att = attMap[u.id] || attMap[simpleId] || attMap[u.customId] || attMap[u.employeeId];
        const dress = dressMap[u.id] || dressMap[simpleId] || dressMap[u.customId] || dressMap[u.employeeId];
        const duty = dutyMap[u.id] || dutyMap[simpleId] || dutyMap[u.customId] || dutyMap[u.employeeId];
        
        const name = u.name || u.displayName || 'Staff';
        const role = u.designation || u.role || 'Staff';
        const deptLabel = dept.toUpperCase();

        if (att) {
          const status = String(att.status || '').toLowerCase();
          const checkIn = att.checkInTime || att.checkinTime || att.time || att.arrivalTime;
          let isLate = status === 'late' || att.isLate || att.arrivedOnTime === false;

          // Check shift start time if status is present
          if (status === 'present') {
            const arrMin = timeToMinutes(checkIn);
            const startMin = timeToMinutes(u.dutyStartTime);
            if (arrMin !== null && startMin !== null) {
              if (arrMin > startMin) {
                isLate = true;
              }
            }
          }

          if (status === 'present' || isLate) {
            presentCount++;
            presentStaff.push({ name, role, dept: deptLabel, status: isLate ? 'Late' : 'Present' });
            
            if (isLate) {
              lateStaff.push({
                name,
                role,
                dept: deptLabel,
                time: checkIn || undefined
              });
            }
          } else if (status === 'absent') {
            absentCount++;
            absentStaff.push({ name, role, dept: deptLabel, status: 'Absent' });
          } else if (['leave', 'paid_leave', 'unpaid_leave'].includes(status)) {
            leaveCount++;
            leaveStaff.push({ name, role, dept: deptLabel, status: 'On Leave' });
          } else {
            unmarkedCount++;
            absentStaff.push({ name, role, dept: deptLabel, status: 'Unmarked' });
          }
        } else {
          unmarkedCount++;
          absentStaff.push({ name, role, dept: deptLabel, status: 'Unmarked' });
        }

        // Check dress code / uniform status if marked present or late
        const isPresent = att && (String(att.status || '').toLowerCase() === 'present' || String(att.status || '').toLowerCase() === 'late' || att.isLate);
        const dressCodeConfig = u.dressCodeConfig || [];

        if (isPresent && dressCodeConfig.length > 0) {
          const uniformItems = dress?.items || [];
          const missingItems = dressCodeConfig.filter((c: any) => {
            const item = uniformItems.find((i: any) => i.key === c.key);
            return !item || item.status === 'no';
          }).map((c: any) => c.label || c.key);

          if (missingItems.length > 0) {
            noUniformStaff.push({
              name,
              role,
              dept: deptLabel,
              missingItems
            });
          }
        }

        // Check duties if marked present or late
        if (isPresent) {
          const dutyConfig = u.dutyConfig && u.dutyConfig.length > 0 ? u.dutyConfig : [
            { key: 'morning', label: 'Morning Duty' },
            { key: 'afternoon', label: 'Afternoon Duty' },
            { key: 'evening', label: 'Evening Duty' }
          ];
          const dutyItems = duty?.duties || [];
          const pendingDuties = dutyConfig.filter((c: any) => {
            const item = dutyItems.find((d: any) => d.key === c.key);
            return !item || item.status !== 'done';
          }).map((c: any) => c.label || c.key);

          const dutyStatus = dutyConfig.length === 0 ? 'na' :
            (pendingDuties.length === 0 ? 'yes' :
              (pendingDuties.length === dutyConfig.length ? 'no' : 'incomplete'));

          if (dutyStatus === 'no' || dutyStatus === 'incomplete') {
            pendingDutyStaff.push({
              name,
              role,
              dept: deptLabel,
              dutyStatus: dutyStatus === 'no' ? 'No Duties Performed' : 'Incomplete Duties',
              pendingDuties
            });
          }
        }
      });
    } catch (e) {
      console.warn(`[voiceTools] getAttendanceSummary skipping ${dept}:`, e);
    }
  }

  const totalStaff = presentCount + absentCount + leaveCount + unmarkedCount;

  return {
    date: label,
    present: presentCount,
    absent: absentCount + unmarkedCount,
    leave: leaveCount,
    total: totalStaff,
    presentStaff,
    absentStaff,
    leaveStaff,
    lateStaff,
    noUniformStaff,
    pendingDutyStaff,
    department: department || 'all',
  };
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

// ─── TOOL 10: Pending transactions ─────────────────────────────────────────────
export async function getPendingTransactions(department: string | null) {
  await assertVoiceAccess();

  const txCollMap: Record<string, string> = {
    rehab: 'rehab_transactions',
    spims: 'spims_transactions',
    hospital: 'hospital_transactions',
    welfare: 'welfare_transactions',
    'job-center': 'jobcenter_transactions',
    sukoon: 'sukoon_transactions',
    'sukoon-center': 'sukoon_transactions',
  };

  const collections = department && txCollMap[department]
    ? [{ col: txCollMap[department], dept: department }]
    : Object.entries(txCollMap).map(([dept, col]) => ({ col, dept }));

  // Keep track of unique collections to avoid double-fetching (e.g. sukoon and sukoon-center map to the same)
  const uniqueCollections = Array.from(
    new Map(collections.map(item => [item.col, item])).values()
  );

  let totalPending = 0;
  const pendingByDept: Record<string, number> = {};
  const pendingDetails: { id: string; dept: string; amount: number; category: string; name: string }[] = [];
  const categoriesBreakdown: Record<string, Record<string, number>> = {};

  for (const { col, dept } of uniqueCollections) {
    try {
      const snap = await adminDb.collection(col)
        .where('status', 'in', ['pending', 'pending_cashier'])
        .get();

      if (!snap.empty) {
        const count = snap.size;
        totalPending += count;
        pendingByDept[dept] = count;
        categoriesBreakdown[dept] = {};

        snap.docs.forEach(doc => {
          const d = doc.data();
          const amount = Number(d.amount) || 0;
          const rawCat = d.category || d.feePaymentType || d.type || 'Other';
          
          let category = rawCat.replace(/_/g, ' ');
          category = category.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

          categoriesBreakdown[dept][category] = (categoriesBreakdown[dept][category] || 0) + 1;

          const name = d.patientName || d.studentName || d.seekerName || d.staffName || d.name || 'Unknown';

          pendingDetails.push({
            id: doc.id,
            dept,
            amount,
            category,
            name,
          });
        });
      }
    } catch (e) {
      console.warn(`[voiceTools] getPendingTransactions skipping ${col}:`, e);
    }
  }

  return {
    totalPending,
    pendingByDept,
    categoriesBreakdown,
    transactions: pendingDetails,
    department: department || 'all',
  };
}

// ─── TOOL 12: Staff performance ranking ──────────────────────────────────────────
export async function getStaffRanking(
  department: string | null,
  startDate: string | null,
  endDate: string | null,
  daysBack: number | null
) {
  await assertVoiceAccess();
  const { start, end, label, rawStart, rawEnd } = resolveDateRange(startDate, endDate, daysBack);

  const depts = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];
  const cleanedDept = department ? String(department).toLowerCase().trim() : null;
  const targetDepts = (cleanedDept && cleanedDept !== 'hq' && depts.includes(cleanedDept))
    ? [cleanedDept]
    : depts;

  const txCollMap: Record<string, { col: string; prefix: string }> = {
    hq: { col: 'hq_users', prefix: 'hq' },
    rehab: { col: 'rehab_users', prefix: 'rehab' },
    spims: { col: 'spims_users', prefix: 'spims' },
    hospital: { col: 'hospital_users', prefix: 'hospital' },
    sukoon: { col: 'sukoon_users', prefix: 'sukoon' },
    welfare: { col: 'welfare_users', prefix: 'welfare' },
    'job-center': { col: 'jobcenter_users', prefix: 'jobcenter' },
    'social-media': { col: 'media_users', prefix: 'media' },
    it: { col: 'it_users', prefix: 'it' }
  };

  const getSimpleId = (id: string) => {
    if (!id) return '';
    const prefixes = ['hq_', 'rehab_', 'spims_', 'hospital_', 'sukoon_', 'welfare_', 'jobcenter_', 'media_', 'it_'];
    for (const pref of prefixes) {
      if (id.startsWith(pref)) return id.substring(pref.length);
    }
    return id;
  };

  const getSeniorityRank = (seniority: string, desig: string) => {
    const s = String(seniority || '').toLowerCase();
    const d = String(desig || '').toLowerCase();
    if (s.includes('senior') || d.includes('senior') || d.includes('executive') || d.includes('director') || d.includes('head') || d.includes('admin') || d.includes('administrator')) return 10;
    if (d.includes('manager') || s.includes('managerial') || s.includes('lead') || d.includes('lead')) return 9;
    if (d.includes('supervisor') || s.includes('mid') || s.includes('supervisor')) return 8;
    if (d.includes('doctor') || d.includes('clinical') || d.includes('physiotherapist')) return 7;
    if (d.includes('nurse') || d.includes('teacher') || d.includes('lecturer') || d.includes('counselor') || d.includes('personnel')) return 6;
    if (d.includes('worker') || d.includes('junior') || s.includes('junior')) return 5;
    if (d.includes('contract')) return 4;
    if (d.includes('trial')) return 3;
    if (d.includes('internee') || d.includes('intern') || s.includes('internee') || s.includes('fresher')) return 2;
    if (d.includes('volunteer') || s.includes('volunteer')) return 1;
    return 5;
  };

  const daysToProcess: string[] = [];
  const dt = new Date(rawStart);
  const endDt = new Date(rawEnd);
  while (dt <= endDt) {
    daysToProcess.push(dt.toISOString().split('T')[0]);
    dt.setDate(dt.getDate() + 1);
  }

  const allStaff: any[] = [];
  
  // Maps to store logs
  const attMap = new Map<string, any>();
  const dressMap = new Map<string, any>();
  const dutyMap = new Map<string, any>();
  const growthPointsMap = new Map<string, any>();
  const fineMap = new Map<string, any[]>();

  // Fetch all in parallel
  await Promise.all(targetDepts.map(async (dept) => {
    const config = txCollMap[dept];
    if (!config) return;

    try {
      const usersSnap = await adminDb.collection(config.col).get();
      const activeUsers = usersSnap.docs.map(doc => ({ id: doc.id, department: dept, ...doc.data() })).filter((u: any) => {
        const r = String(u.role || '').toLowerCase();
        const desig = String(u.designation || '').toLowerCase();
        const n = String(u.name || u.displayName || '').toLowerCase();
        const e = String(u.email || '').toLowerCase();
        if (n.includes('super') || n.includes('network') || e.includes('super') || e.includes('network')) return false;
        const statusStr = String(u.status || '').toLowerCase().trim();
        if (n === 'vacant' || n.includes('vacant') || statusStr === 'vacant' || statusStr === 'active_vacancy') return false;
        const nameVal = (u.name || u.displayName || '').trim();
        if (!nameVal || nameVal === '—' || nameVal === '-') return false;
        const EXCLUDED_ROLES = ['patient', 'family', 'student', 'client', 'seeker', 'user', 'superadmin', 'donor', 'child', 'oldage', 'beneficiary', 'orphan'];
        if (EXCLUDED_ROLES.some(ex => r.includes(ex) || desig.includes(ex))) return false;
        return u.isActive !== false && statusStr !== 'inactive' && statusStr !== 'resigned' && statusStr !== 'terminated' && statusStr !== 'executive' && statusStr !== 'hide';
      });

      allStaff.push(...activeUsers);

      const [attSnap, dressSnap, dutySnap, gpSnap, fineSnap] = await Promise.all([
        adminDb.collection(`${config.prefix}_attendance`).where('date', '>=', rawStart).where('date', '<=', rawEnd).get(),
        adminDb.collection(`${config.prefix}_dress_logs`).where('date', '>=', rawStart).where('date', '<=', rawEnd).get(),
        adminDb.collection(`${config.prefix}_duty_logs`).where('date', '>=', rawStart).where('date', '<=', rawEnd).get(),
        adminDb.collection(`${config.prefix}_growth_points`).get(),
        adminDb.collection(`${config.prefix}_fines`).where('date', '>=', rawStart).where('date', '<=', rawEnd).get()
      ]);

      // Populate logs maps
      attSnap.docs.forEach(doc => {
        const d = doc.data();
        let sid = d.staffId || doc.id;
        const date = d.date;
        if (!d.staffId && sid.endsWith(`_${date}`)) sid = sid.slice(0, -(date.length + 1));
        const simpleSid = getSimpleId(sid);
        attMap.set(`${simpleSid}_${date}`, d);
      });

      dressSnap.docs.forEach(doc => {
        const d = doc.data();
        let sid = d.staffId || doc.id;
        const date = d.date;
        if (!d.staffId && sid.endsWith(`_${date}`)) sid = sid.slice(0, -(date.length + 1));
        const simpleSid = getSimpleId(sid);
        dressMap.set(`${simpleSid}_${date}`, d);
      });

      dutySnap.docs.forEach(doc => {
        const d = doc.data();
        let sid = d.staffId || doc.id;
        const date = d.date;
        if (!d.staffId && sid.endsWith(`_${date}`)) sid = sid.slice(0, -(date.length + 1));
        const simpleSid = getSimpleId(sid);
        dutyMap.set(`${simpleSid}_${date}`, d);
      });

      // Filter growth points by selected month (e.g. "2026-06")
      const monthStr = rawStart.substring(0, 7);
      gpSnap.docs.forEach(doc => {
        const d = doc.data();
        if (d.month === monthStr) {
          const sid = d.staffId;
          const simpleSid = getSimpleId(sid);
          growthPointsMap.set(sid, d);
          growthPointsMap.set(simpleSid, d);
        }
      });

      fineSnap.docs.forEach(doc => {
        const d = doc.data();
        let sid = d.staffId || doc.id;
        const date = d.date;
        if (!d.staffId && sid.endsWith(`_${date}`)) sid = sid.slice(0, -(date.length + 1));
        const simpleSid = getSimpleId(sid);
        const key = `${simpleSid}_${date}`;
        const existing = fineMap.get(key) || [];
        fineMap.set(key, [...existing, d]);
      });
    } catch (e) {
      console.warn(`[voiceTools] getStaffRanking skipping dept ${dept}:`, e);
    }
  }));

  const staffRankedList = allStaff.map(member => {
    const simpleSid = getSimpleId(member.id);
    const gpDoc = growthPointsMap.get(simpleSid) || growthPointsMap.get(member.id);
    const extraPoints = gpDoc ? Number(gpDoc.extra || 0) : 0;

    let presents = 0;
    let absents = 0;
    let lates = 0;
    let leaves = 0;
    let unmarked = 0;
    let finesTotal = 0;
    let totalDailyPointsSum = 0;

    daysToProcess.forEach(date => {
      const logKey = `${simpleSid}_${date}`;
      const att = attMap.get(logKey);
      const dress = dressMap.get(logKey);
      const duty = dutyMap.get(logKey);
      const fines = fineMap.get(logKey) || [];

      // Day Fines
      finesTotal += fines.reduce((acc, f) => acc + (Number(f.amount) || 0), 0);

      // Attendance
      let attStatus = 'unmarked';
      let isLate = false;
      if (att) {
        attStatus = att.status || 'unmarked';
        isLate = att.isLate === true || attStatus === 'late';
      }

      let attendanceStatus = 'unmarked';
      if (attStatus === 'paid_leave' || attStatus === 'unpaid_leave' || attStatus === 'leave') {
        attendanceStatus = 'leave';
      } else if (['present', 'absent', 'late', 'unmarked', 'leave'].includes(attStatus)) {
        attendanceStatus = attStatus;
      }
      if (isLate && attendanceStatus === 'present') {
        attendanceStatus = 'late';
      }

      if (attendanceStatus === 'present') presents++;
      else if (attendanceStatus === 'late') lates++;
      else if (attendanceStatus === 'absent') absents++;
      else if (attendanceStatus === 'leave') leaves++;
      else unmarked++;

      const onLeave = attendanceStatus === 'leave';

      // Dress
      let uniformStatus = 'no';
      if (onLeave) uniformStatus = 'na';
      else if (dress) uniformStatus = dress.status || 'no';
      else uniformStatus = 'unmarked';

      // Duty
      let dutyStatus = 'no';
      if (onLeave) dutyStatus = 'na';
      else if (duty) dutyStatus = duty.status || 'no';
      else dutyStatus = 'unmarked';

      // Daily points sum
      const attPoint = (attendanceStatus === 'present' || attendanceStatus === 'late') ? 1 : 0;
      const uniformPoint = (!onLeave && uniformStatus === 'yes') ? 1 : 0;
      const dutyPoint = (!onLeave && dutyStatus === 'yes') ? 1 : 0;
      totalDailyPointsSum += (attPoint + uniformPoint + dutyPoint);
    });

    const maxDailyPoints = daysToProcess.length * 3;
    const normalizedDaily = maxDailyPoints > 0 ? Math.round((totalDailyPointsSum / maxDailyPoints) * 90) : 0;
    const totalPoints = Math.min(100, normalizedDaily + extraPoints);

    return {
      id: member.id,
      name: member.name || member.displayName || 'Staff Member',
      department: member.department,
      designation: member.designation || 'Staff',
      seniority: member.seniority || '',
      presents,
      absents,
      lates,
      leaves,
      finesTotal,
      extraPoints,
      totalPoints
    };
  });

  // Sort by points descending, then seniority descending, then name alphabetically
  staffRankedList.sort((a, b) => 
    b.totalPoints - a.totalPoints ||
    getSeniorityRank(b.seniority, b.designation) - getSeniorityRank(a.seniority, a.designation) ||
    a.name.localeCompare(b.name)
  );

  return {
    dateRange: label,
    ranking: staffRankedList.map((s, index) => ({
      rank: index + 1,
      name: s.name,
      department: s.department,
      designation: s.designation,
      totalPoints: s.totalPoints,
      presents: s.presents,
      absents: s.absents,
      lates: s.lates,
      fines: s.finesTotal
    })).slice(0, 15)
  };
}

// ─── MEMORY & FEEDBACK SERVER ACTIONS ──────────────────────────────────────────
export async function updateVoiceMemoryResult(memoryDocId: string, resultData: any) {
  try {
    await assertVoiceAccess();
    if (!memoryDocId) return;

    let summary = 'No data';
    if (resultData) {
      if (Array.isArray(resultData)) {
        summary = `${resultData.length} records`;
      } else if (typeof resultData === 'object') {
        if (resultData.count !== undefined) {
          summary = `${resultData.count} records`;
        } else if (resultData.result !== undefined) {
          summary = Array.isArray(resultData.result) ? `${resultData.result.length} aggregated rows` : String(resultData.result);
        } else {
          summary = JSON.stringify(resultData).substring(0, 100);
        }
      } else {
        summary = String(resultData);
      }
    }

    await adminDb.collection('ai_memory').doc(memoryDocId).update({
      resultSummary: summary
    });
  } catch (err) {
    console.error('[updateVoiceMemoryResult] Failed to update memory:', err);
  }
}

export async function saveVoiceMemoryCorrection(memoryDocId: string, correctionText: string) {
  try {
    await assertVoiceAccess();
    if (!memoryDocId) return;

    await adminDb.collection('ai_memory').doc(memoryDocId).update({
      wasCorrect: false,
      correction: correctionText
    });
  } catch (err) {
    console.error('[saveVoiceMemoryCorrection] Failed to save correction:', err);
  }
}

export async function saveVoiceMemoryFeedback(memoryDocId: string, wasCorrect: boolean) {
  try {
    await assertVoiceAccess();
    if (!memoryDocId) return;

    await adminDb.collection('ai_memory').doc(memoryDocId).update({
      wasCorrect
    });
  } catch (err) {
    console.error('[saveVoiceMemoryFeedback] Failed to save feedback:', err);
  }
}

export async function runCustomQuery(
  transcript: string,
  department: string | null,
  startDate: string | null,
  endDate: string | null,
  daysBack: number | null
) {
  await assertVoiceAccess();
  const resolvedDateRange = resolveDateRange(startDate, endDate, daysBack);

  const prompt = `You are a database query generator for a Firebase Firestore database in the KhanHub ERP system.
Your job is to convert a user's natural language voice query into a structured array of Firestore queries.

Today's date context:
- Start Date: ${resolvedDateRange.start.toISOString()}
- End Date: ${resolvedDateRange.end.toISOString()}
- Date Label: ${resolvedDateRange.label}
- Target Department: ${department || 'All / Not specified'}

Collection Schema mapping:
${JSON.stringify(DEFAULT_KNOWLEDGE, null, 2)}

You can generate one or more query objects to fetch the necessary data.
Return ONLY a valid JSON object matching this schema:
{
  "queries": [
    {
      "collection": "collection_name",
      "where": [
        ["field", "==" | ">=" | "<=" | "array-contains", "value"]
      ],
      "orderBy": ["field", "asc" | "desc"],
      "limit": number
    }
  ]
}

Guidelines:
- Match collection names exactly from the schema mapping.
- If a collection has twin collections (e.g. primary vs twin), you can output queries for both.
- If the user asks about "yesterday's patients" or "patient count" in the hospital, query "hospital_patients" and/or "hospital_daily_stats" or other relevant collections based on the schema mapping.
- Make sure date filters are correct. If filtering by date, if the field is a Timestamp in Firestore, you can use Firestore query date range.
- Return ONLY JSON. Do not write any explanations or markdown formatting.`;

  try {
    const response = await getCompletion({
      systemPrompt: prompt,
      userMessage: transcript,
      temperature: 0.1,
      jsonMode: true
    });

    const raw = response.text || '{}';
    console.log(`[CUSTOM QUERY GENERATOR] parsed using ${response.provider}:`, raw);
    
    // helper to extract and clean JSON
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
      cleaned = cleaned.replace(/\s*```$/, '');
    }
    cleaned = cleaned.trim();
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }
    const parsed = JSON.parse(cleaned);

    const queries = parsed.queries || [];
    const results: any[] = [];

    // Helper to parse dates in query values
    const parseQueryValue = (value: any): any => {
      if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return new Date(value);
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          const [y, m, d] = value.split('-').map(Number);
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return value;
    };

    for (const q of queries) {
      if (!q.collection) continue;
      try {
        let queryRef: any = adminDb.collection(q.collection);
        if (q.where && Array.isArray(q.where)) {
          for (const condition of q.where) {
            if (Array.isArray(condition) && condition.length === 3) {
              const [field, op, val] = condition;
              queryRef = queryRef.where(field, op, parseQueryValue(val));
            }
          }
        }
        if (q.orderBy && Array.isArray(q.orderBy) && q.orderBy.length >= 1) {
          const [field, direction] = q.orderBy;
          queryRef = queryRef.orderBy(field, direction || 'asc');
        }
        if (typeof q.limit === 'number') {
          queryRef = queryRef.limit(Math.min(q.limit, 50));
        } else {
          queryRef = queryRef.limit(20); // safety limit
        }

        const snap = await queryRef.get();
        const docs = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        results.push({
          collection: q.collection,
          documents: docs
        });
      } catch (err: any) {
        console.error(`[runCustomQuery] Failed to query ${q.collection}:`, err);
        results.push({
          collection: q.collection,
          error: err.message || String(err)
        });
      }
    }

    return {
      query: transcript,
      dateLabel: resolvedDateRange.label,
      results
    };
  } catch (err) {
    console.error('[runCustomQuery] LLM generation or execution failed:', err);
    return {
      query: transcript,
      error: 'Failed to process custom system query.'
    };
  }
}
