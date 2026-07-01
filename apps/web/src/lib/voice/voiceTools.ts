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
