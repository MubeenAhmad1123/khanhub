// apps/web/src/lib/hq/superadmin/staff.ts

import { collection, getDocs, limit, orderBy, query, where, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDate, formatDateDMY } from '@/lib/utils';

export type StaffDept = 'hq' | 'rehab' | 'spims' | 'hospital' | 'sukoon' | 'welfare' | 'job-center' | 'social-media' | 'it';
export type StaffRole = 'admin' | 'staff' | 'cashier' | 'superadmin' | 'manager' | 'doctor' | 'nurse' | 'counselor' | 'personnel' | 'student' | 'other';
export type StaffStatus = 'active' | 'inactive' | 'resigned' | 'terminated' | 'active_vacancy' | 'executive';

export function getDeptCollection(dept: StaffDept): string {
  if (dept === 'hq') return 'hq_users';
  if (dept === 'job-center') return 'jobcenter_users';
  if (dept === 'social-media') return 'media_users';
  const slug = dept.replace('-', '_');
  return `${slug}_users`;
}

export function getDeptPrefix(dept: StaffDept): string {
  const d = String(dept || '').toLowerCase();
  if (d === 'job-center') return 'jobcenter';
  if (d === 'social-media') return 'media';
  return d.replace('-', '_');
}

export type StaffCardRow = {
  id: string;
  dept: StaffDept;
  staffId: string;
  name: string;
  role: StaffRole;
  isActive: boolean;
  status: StaffStatus;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  growthPointsTotal: number;
  totalFines: number;
  employeeId?: string;
  designation?: string;
  photoUrl?: string;
  monthlySalary?: number;
  lastDutyLabel?: string;
  emergencyContactName?: string;
  emergencyPhone?: string;
  seniority?: string;
  // Daily Stats for Today
  todayUniformStatus?: 'yes' | 'no' | 'incomplete' | 'na';
  todayDutyStatus?: 'yes' | 'no' | 'incomplete' | 'na';
  todayDailyScore?: number;
  isPresentToday?: boolean;
  todayAttendanceStatus?: 'present' | 'absent' | 'late' | 'leave' | 'unmarked';
  dutyConfig?: { key: string; label: string }[];
  dressCodeConfig?: { key: string; label: string }[];
  dutyStartTime?: string;
  dutyEndTime?: string;
};

function normalizeRole(raw: any): StaffRole {
  const r = String(raw || '').toLowerCase();
  
  if (r.includes('internee')) return 'internee' as any;
  if (r.includes('trial')) return 'trial' as any;
  if (r.includes('contract')) return 'contract' as any;
  if (r.includes('worker') || r.includes('junior')) return 'worker' as any;

  const STAFF_WHITELIST = ['admin', 'staff', 'cashier', 'superadmin', 'manager', 'doctor', 'nurse', 'counselor', 'personnel', 'worker', 'internee', 'trial', 'contract', 'volunteer', 'supervisor', 'executive'];
  if (STAFF_WHITELIST.includes(r)) return r as StaffRole;
  return 'other';
}

function getSimpleId(id: string) {
  if (!id) return '';
  const prefixes = ['hq_', 'rehab_', 'spims_', 'hospital_', 'sukoon_', 'welfare_', 'jobcenter_', 'media_', 'it_', 'job-center_', 'social-media_'];
  for (const pref of prefixes) {
    if (id.startsWith(pref)) {
      return id.substring(pref.length);
    }
  }
  return id;
}

async function loadAttendanceMonth(dept: StaffDept, staffId: string, monthKey: string) {
  const prefix = getDeptPrefix(dept);
  const col = `${prefix}_attendance`;
  const simpleId = getSimpleId(staffId);

  const q1 = getDocs(
    query(collection(db, col), where('staffId', '==', staffId))
  ).catch(() => ({ docs: [] } as any));
  const promises = [q1];
  if (simpleId && simpleId !== staffId) {
    const q2 = getDocs(
      query(collection(db, col), where('staffId', '==', simpleId))
    ).catch(() => ({ docs: [] } as any));
    promises.push(q2);
  }
  const snaps = await Promise.all(promises);
  const seenDocIds = new Set<string>();
  const rows: any[] = [];
  snaps.forEach(snap => {
    snap.docs.forEach((docSnap: any) => {
      if (!seenDocIds.has(docSnap.id)) {
        seenDocIds.add(docSnap.id);
        const data = docSnap.data();
        if (data.date && data.date.startsWith(monthKey)) {
          rows.push(data);
        }
      }
    });
  });

  let present = 0, absent = 0, late = 0;
  for (const r of rows) {
    const s = String(r.status || r.state || '').toLowerCase();
    if (s.includes('present')) {
      if (r.isLate === true) late++;
      else present++;
    }
    else if (s.includes('late')) late++;
    else if (s.includes('absent')) absent++;
  }
  return { present, absent, late };
}

async function loadGrowthPoints(dept: StaffDept, staffId: string, monthKey?: string) {
  const prefix = getDeptPrefix(dept);
  const simpleId = getSimpleId(staffId);
  const candidateIds = [staffId, simpleId].filter(Boolean);

  // 1. Fetch contributions from ${prefix}_contributions
  const contribCol = `${prefix}_contributions`;
  const contribSnaps = await Promise.all(
    candidateIds.map(id =>
      getDocs(query(collection(db, contribCol), where('staffId', '==', id))).catch(() => ({ docs: [] } as any))
    )
  );
  
  const contribDocs = contribSnaps.flatMap(snap => snap.docs);
  const seenContribIds = new Set<string>();
  let contribPoints = 0;

  contribDocs.forEach((d: any) => {
    if (seenContribIds.has(d.id)) return;
    seenContribIds.add(d.id);
    const data = d.data();
    if (monthKey) {
      const itemMonth = data.date ? data.date.substring(0, 7) : '';
      if (itemMonth !== monthKey) return;
    }
    const status = String(data.status || '').toLowerCase();
    if (status === 'yes' || data.isApproved === true) {
      contribPoints++;
    }
  });

  // 2. Fetch extra/bonus points from ${prefix}_growth_points
  const gpCol = `${prefix}_growth_points`;
  const gpSnaps = await Promise.all(
    candidateIds.map(id =>
      getDocs(query(collection(db, gpCol), where('staffId', '==', id))).catch(() => ({ docs: [] } as any))
    )
  );

  const gpDocs = gpSnaps.flatMap(snap => snap.docs);
  const seenGpIds = new Set<string>();
  let extraPoints = 0;

  gpDocs.forEach((d: any) => {
    if (seenGpIds.has(d.id)) return;
    seenGpIds.add(d.id);
    const data = d.data();
    if (monthKey) {
      const itemMonth = data.month || (data.date ? data.date.substring(0, 7) : '');
      if (itemMonth === monthKey) {
        extraPoints += (Number(data.extra || data.points || 0));
      }
    } else {
      extraPoints += (Number(data.extra || data.points || 0));
    }
  });

  // Also check direct document read fallback for total/extra
  if (monthKey) {
    const ids = [`${simpleId}_${monthKey}`, `${staffId}_${monthKey}`];
    for (const docId of ids) {
      const docRef = doc(db, gpCol, docId);
      const snap = await getDoc(docRef).catch(() => null);
      if (snap && snap.exists()) {
        const data = snap.data();
        if (data && typeof data.extra === 'number') {
          extraPoints = Math.max(extraPoints, data.extra);
        }
      }
    }
  }

  return contribPoints + extraPoints;
}

async function loadFinesTotal(dept: StaffDept, staffId: string) {
  const prefix = getDeptPrefix(dept);
  const col = `${prefix}_fines`;
  const simpleId = getSimpleId(staffId);

  const q1 = getDocs(query(collection(db, col), where('staffId', '==', staffId), where('status', '==', 'unpaid'))).catch(() => ({ docs: [] } as any));
  const promises = [q1];
  if (simpleId && simpleId !== staffId) {
    const q2 = getDocs(query(collection(db, col), where('staffId', '==', simpleId), where('status', '==', 'unpaid'))).catch(() => ({ docs: [] } as any));
    promises.push(q2);
  }
  const snaps = await Promise.all(promises);
  const seenDocIds = new Set<string>();
  let total = 0;
  snaps.forEach(snap => {
    snap.docs.forEach((docSnap: any) => {
      if (!seenDocIds.has(docSnap.id)) {
        seenDocIds.add(docSnap.id);
        total += (Number(docSnap.data()?.amount) || 0);
      }
    });
  });
  return total;
}

async function loadLastDuty(dept: StaffDept, staffId: string) {
  const prefix = getDeptPrefix(dept);
  const col = `${prefix}_duty_logs`;
  const simpleId = getSimpleId(staffId);

  const q1 = getDocs(query(collection(db, col), where('staffId', '==', staffId), orderBy('createdAt', 'desc'), limit(1))).catch(
    () => ({ docs: [] } as any)
  );
  const promises = [q1];
  if (simpleId && simpleId !== staffId) {
    const q2 = getDocs(query(collection(db, col), where('staffId', '==', simpleId), orderBy('createdAt', 'desc'), limit(1))).catch(
      () => ({ docs: [] } as any)
    );
    promises.push(q2);
  }
  const snaps = await Promise.all(promises);
  let latestDoc: any = null;
  snaps.forEach(snap => {
    if (snap.docs.length > 0) {
      const d = snap.docs[0];
      if (!latestDoc || toDate(d.data().createdAt || d.data().date) > toDate(latestDoc.data().createdAt || latestDoc.data().date)) {
        latestDoc = d;
      }
    }
  });

  if (!latestDoc) return undefined;
  const d = latestDoc.data();
  const when = toDate(d.createdAt || d.date);
  if (isNaN(when.getTime())) return 'No Date • Duty Log';
  return `${formatDateDMY(when)} • ${String(d.title || d.note || d.action || 'Duty log')}`;
}

async function loadDeptTodayStats(dept: StaffDept, date: string, staffConfigs: Record<string, any>) {
  const prefix = getDeptPrefix(dept);
  
  const [attSnap, dressSnap, dutySnap, contribSnap] = await Promise.all([
    getDocs(query(collection(db, `${prefix}_attendance`), where('date', '==', date))).catch(() => ({ docs: [] } as any)),
    getDocs(query(collection(db, `${prefix}_dress_logs`), where('date', '==', date))).catch(() => ({ docs: [] } as any)),
    getDocs(query(collection(db, `${prefix}_duty_logs`), where('date', '==', date))).catch(() => ({ docs: [] } as any)),
    getDocs(query(collection(db, `${prefix}_contributions`), where('date', '==', date), where('isApproved', '==', true))).catch(() => ({ docs: [] } as any)),
  ]);

  const attMap: Record<string, any> = {};
  attSnap.docs.forEach((d: any) => {
    const data = d.data();
    let sid = data.staffId || d.id;
    if (!data.staffId && sid.endsWith(`_${date}`)) {
      sid = sid.slice(0, -(date.length + 1));
    }
    const simpleSid = getSimpleId(sid);
    attMap[sid] = data;
    attMap[simpleSid] = data;
  });
  
  const dressMap: Record<string, any> = {};
  dressSnap.docs.forEach((d: any) => {
    const data = d.data();
    let sid = data.staffId || d.id;
    if (!data.staffId && sid.endsWith(`_${date}`)) {
      sid = sid.slice(0, -(date.length + 1));
    }
    const simpleSid = getSimpleId(sid);
    dressMap[sid] = data;
    dressMap[simpleSid] = data;
  });
  
  const dutyMap: Record<string, any> = {};
  dutySnap.docs.forEach((d: any) => {
    const data = d.data();
    let sid = data.staffId || d.id;
    if (!data.staffId && sid.endsWith(`_${date}`)) {
      sid = sid.slice(0, -(date.length + 1));
    }
    const simpleSid = getSimpleId(sid);
    const existing = dutyMap[sid] || dutyMap[simpleSid];
    if (!existing || (!existing.duties && data.duties)) {
      dutyMap[sid] = data;
      dutyMap[simpleSid] = data;
    }
  });

  const contribCounts: Record<string, number> = {};
  contribSnap.docs.forEach((d: any) => {
    const data = d.data();
    let sid = data.staffId || d.id;
    if (!data.staffId && sid.endsWith(`_${date}`)) {
      sid = sid.slice(0, -(date.length + 1));
    }
    const simpleSid = getSimpleId(sid);
    contribCounts[sid] = (contribCounts[sid] || 0) + 1;
    contribCounts[simpleSid] = (contribCounts[simpleSid] || 0) + 1;
  });

  const results: Record<string, any> = {};
  Object.keys(staffConfigs).forEach(staffId => {
    const s = staffConfigs[staffId];
    const simpleStaffId = getSimpleId(staffId);
    
    const att = attMap[staffId] || attMap[simpleStaffId];
    const dress = dressMap[staffId] || dressMap[simpleStaffId];
    const duty = dutyMap[staffId] || dutyMap[simpleStaffId];
    const contribCount = contribCounts[staffId] || contribCounts[simpleStaffId] || 0;

    const attPoint = (att?.status === 'present' || att?.isLate || att?.status === 'late') ? 1 : 0;
    
    const uniformConfig = s.dressCodeConfig || [];
    const uniformItems = dress?.items || [];
    const uniformMissing = uniformConfig.filter((c: any) => {
      const item = uniformItems.find((i: any) => i.key === c.key);
      return !item || item.status === 'no';
    });
    const uniformStatus = uniformConfig.length === 0 ? 'na' : (uniformMissing.length === 0 ? 'yes' : (uniformMissing.length === uniformConfig.length ? 'no' : 'incomplete'));
    const uniformPoint = uniformStatus === 'yes' ? 1 : 0;

    const dutyConfig = s.dutyConfig || [];
    const dutyItems = duty?.duties || [];
    const dutiesPending = dutyConfig.filter((c: any) => {
      const item = dutyItems.find((d: any) => d.key === c.key);
      return !item || item.status === 'not_done';
    });
    const dutyStatus = dutyConfig.length === 0 ? 'na' : (dutiesPending.length === 0 ? 'yes' : (dutiesPending.length === dutyConfig.length ? 'no' : 'incomplete'));
    const dutyPoint = dutyStatus === 'yes' ? 1 : 0;

    const contribPoint = contribCount > 0 ? 1 : 0;

    results[staffId] = {
      uniform: uniformStatus,
      duty: dutyStatus,
      score: attPoint + uniformPoint + dutyPoint + contribPoint,
      attendance: att?.status || 'unmarked'
    };
  });

  return results;
}

export async function listStaffCards({
  dept,
  status,
  role,
  fullEnrichment = false,
  includeTodayStats = true,
}: {
  dept: 'all' | StaffDept;
  status: 'all' | 'active' | 'inactive' | 'active_vacancy' | 'executive';
  role: 'all' | 'admin' | 'staff' | 'cashier' | 'personnel';
  fullEnrichment?: boolean;
  includeTodayStats?: boolean;
}): Promise<StaffCardRow[]> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const targetDepts: StaffDept[] = dept === 'all' 
    ? ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'] 
    : [dept];

  // 1. Fetch Basic Personnel Docs (Capped at 200 per dept for safety)
  const base = await Promise.all(
    targetDepts.map(async (d) => {
      const col = getDeptCollection(d);
      const snap = await getDocs(query(collection(db, col), limit(200))).catch(() => ({ docs: [] } as any));
      return snap.docs.map((docSnap: any) => ({ ...docSnap.data(), _dept: d, id: docSnap.id }));
    })
  );

  const rows = base.flat().filter((s: any) => {
    // 1. Exclude system accounts (super, network)
    const n = String(s.name || s.displayName || '').toLowerCase();
    const e = String(s.email || '').toLowerCase();
    if (n.includes('super') || n.includes('network') || e.includes('super') || e.includes('network')) {
      return false;
    }

    // 2. Strict Active Check
    const statusStr = String(s.status || '').toLowerCase();
    const isActuallyActive = s.isActive !== false && statusStr !== 'inactive' && statusStr !== 'resigned' && statusStr !== 'terminated' && statusStr !== 'active_vacancy';
    
    if (status === 'active') {
      if (!isActuallyActive || statusStr === 'active_vacancy' || statusStr === 'executive' || statusStr === 'hide') return false;
    } else if (status === 'inactive') {
      if (isActuallyActive || statusStr === 'active_vacancy') return false;
    } else if (status === 'active_vacancy') {
      if (statusStr !== 'active_vacancy') return false;
    } else if (status === 'executive') {
      if (statusStr !== 'executive' && statusStr !== 'hide') return false;
    } else if (status === 'all') {
      if (statusStr === 'active_vacancy') return false;
    }

    const normalizedRole = normalizeRole(s.role);
    if (normalizedRole === 'superadmin') return false;

    if (role === 'personnel') {
      if (normalizedRole === 'other' || normalizedRole === 'student') return false;
    } else if (role !== 'all' && normalizedRole !== role) {
      return false;
    }

    return true;
  });

  // 2. Batch Fetch Today's Stats per Department
  const deptTodayStats: Record<string, Record<string, any>> = {};
  if (includeTodayStats) {
    await Promise.all(targetDepts.map(async (d) => {
      const staffConfigs: Record<string, any> = {};
      rows.filter(r => r._dept === d).forEach(r => staffConfigs[r.id] = r);
      deptTodayStats[d] = await loadDeptTodayStats(d, todayStr, staffConfigs);
    }));
  }

  // 3. Batch Fetch Monthly Stats per Department
  const deptMonthlyAttendance: Record<string, Record<string, any[]>> = {};
  const deptMonthlyDressLogs: Record<string, Record<string, any[]>> = {};
  const deptMonthlyDutyLogs: Record<string, Record<string, any[]>> = {};
  const deptMonthlyContributions: Record<string, Record<string, any[]>> = {};
  const deptMonthlyFines: Record<string, Record<string, number>> = {};
  const deptMonthlyExtra: Record<string, Record<string, number>> = {};

  await Promise.all(
    targetDepts.map(async (d) => {
      const prefix = getDeptPrefix(d);

      // Batch fetch attendance for current month
      const attSnap = await getDocs(
        query(
          collection(db, `${prefix}_attendance`),
          where('date', '>=', `${monthKey}-01`),
          where('date', '<=', `${monthKey}-31`)
        )
      ).catch(() => ({ docs: [] } as any));

      const attMap: Record<string, any[]> = {};
      attSnap.docs.forEach((docSnap: any) => {
        const data = docSnap.data();
        const sid = data.staffId;
        if (!sid) return;
        const simpleSid = getSimpleId(sid);
        if (!attMap[simpleSid]) attMap[simpleSid] = [];
        attMap[simpleSid].push(data);
      });
      deptMonthlyAttendance[d] = attMap;

      // Batch fetch dress logs for current month
      const dressSnap = await getDocs(
        query(
          collection(db, `${prefix}_dress_logs`),
          where('date', '>=', `${monthKey}-01`),
          where('date', '<=', `${monthKey}-31`)
        )
      ).catch(() => ({ docs: [] } as any));

      const dressMap: Record<string, any[]> = {};
      dressSnap.docs.forEach((docSnap: any) => {
        const data = docSnap.data();
        const sid = data.staffId;
        if (!sid) return;
        const simpleSid = getSimpleId(sid);
        if (!dressMap[simpleSid]) dressMap[simpleSid] = [];
        dressMap[simpleSid].push(data);
      });
      deptMonthlyDressLogs[d] = dressMap;

      // Batch fetch duty logs for current month
      const dutySnap = await getDocs(
        query(
          collection(db, `${prefix}_duty_logs`),
          where('date', '>=', `${monthKey}-01`),
          where('date', '<=', `${monthKey}-31`)
        )
      ).catch(() => ({ docs: [] } as any));

      const dutyMap: Record<string, any[]> = {};
      dutySnap.docs.forEach((docSnap: any) => {
        const data = docSnap.data();
        const sid = data.staffId;
        if (!sid) return;
        const simpleSid = getSimpleId(sid);
        if (!dutyMap[simpleSid]) dutyMap[simpleSid] = [];
        dutyMap[simpleSid].push(data);
      });
      deptMonthlyDutyLogs[d] = dutyMap;

      // Batch fetch contributions for current month
      const contribSnap = await getDocs(
        query(
          collection(db, `${prefix}_contributions`),
          where('date', '>=', `${monthKey}-01`),
          where('date', '<=', `${monthKey}-31`)
        )
      ).catch(() => ({ docs: [] } as any));

      const contribMap: Record<string, any[]> = {};
      contribSnap.docs.forEach((docSnap: any) => {
        const data = docSnap.data();
        const sid = data.staffId;
        if (!sid) return;
        const simpleSid = getSimpleId(sid);
        if (!contribMap[simpleSid]) contribMap[simpleSid] = [];
        contribMap[simpleSid].push(data);
      });
      deptMonthlyContributions[d] = contribMap;

      // Batch fetch unpaid fines
      const finesSnap = await getDocs(
        query(
          collection(db, `${prefix}_fines`),
          where('status', '==', 'unpaid')
        )
      ).catch(() => ({ docs: [] } as any));

      const finesMap: Record<string, number> = {};
      finesSnap.docs.forEach((docSnap: any) => {
        const data = docSnap.data();
        const sid = data.staffId;
        if (!sid) return;
        const simpleSid = getSimpleId(sid);
        finesMap[simpleSid] = (finesMap[simpleSid] || 0) + (Number(data.amount) || 0);
      });
      deptMonthlyFines[d] = finesMap;

      // Batch fetch growth points to get the 'extra' points
      const gpSnap = await getDocs(
        query(
          collection(db, `${prefix}_growth_points`),
          where('month', '==', monthKey)
        )
      ).catch(() => ({ docs: [] } as any));

      const extraMap: Record<string, number> = {};
      gpSnap.docs.forEach((docSnap: any) => {
        const data = docSnap.data();
        const sid = data.staffId;
        if (!sid) return;
        const simpleSid = getSimpleId(sid);
        extraMap[simpleSid] = data.extra || 0;
      });
      deptMonthlyExtra[d] = extraMap;
    })
  );

  // 4. Enrich Rows
  const enriched = await Promise.all(
    rows.map(async (s: any) => {
      const d = s._dept as StaffDept;
      const staffId = String(s.id);
      const simpleId = getSimpleId(staffId);
      const today = deptTodayStats[d]?.[staffId] || { uniform: 'na', duty: 'na', score: 0 };

      // Get batch-fetched monthly data
      const rawAtt = deptMonthlyAttendance[d]?.[simpleId] || [];
      const rawDress = deptMonthlyDressLogs[d]?.[simpleId] || [];
      const rawDuty = deptMonthlyDutyLogs[d]?.[simpleId] || [];
      const rawContrib = deptMonthlyContributions[d]?.[simpleId] || [];
      const fines = deptMonthlyFines[d]?.[simpleId] || 0;
      const extra = deptMonthlyExtra[d]?.[simpleId] || 0;

      // Calculate attendance counts
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;

      rawAtt.forEach((r: any) => {
        const status = String(r.status || r.state || '').toLowerCase();
        if (status.includes('present')) {
          if (r.isLate === true) lateCount++;
          else presentCount++;
        }
        else if (status.includes('late')) lateCount++;
        else if (status.includes('absent')) absentCount++;
      });

      // Calculate daily scores in-memory
      const [yearStr, monthStr] = monthKey.split('-');
      const year = parseInt(yearStr);
      const monthNum = parseInt(monthStr);
      const daysInMonth = new Date(year, monthNum, 0).getDate();

      let growthPointsTotal = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = `${monthKey}-${String(day).padStart(2, '0')}`;
        
        // Find attendance for this day
        const att = rawAtt.find((r: any) => r.date === dayStr);
        let attPoint = 0;
        if (att) {
          const status = String(att.status || '').toLowerCase();
          const isLate = att.isLate === true || status === 'late';
          if (status === 'present' && !isLate) {
            attPoint = 1;
          }
        }

        // Find dress for this day
        const dress = rawDress.find((r: any) => r.date === dayStr);
        let uniformPoint = 0;
        if (dress) {
          const status = String(dress.status || '').toLowerCase();
          if (status === 'yes') {
            uniformPoint = 1;
          }
        }

        // Find duty for this day
        const duty = rawDuty.find((r: any) => r.date === dayStr);
        let dutyPoint = 0;
        if (duty) {
          const status = String(duty.status || '').toLowerCase();
          if (status === 'yes') {
            dutyPoint = 1;
          }
        }

        // Find contribution for this day
        const contrib = rawContrib.find((r: any) => r.date === dayStr);
        let contribPoint = 0;
        if (contrib) {
          const status = String(contrib.status || '').toLowerCase();
          if (status === 'yes' || contrib.isApproved === true) {
            contribPoint = 1;
          }
        }

        growthPointsTotal += (attPoint + uniformPoint + dutyPoint + contribPoint);
      }
      growthPointsTotal += extra;

      // Only fetch expensive individual logs if fullEnrichment is enabled (like lastDuty)
      const lastDuty = fullEnrichment ? await loadLastDuty(d, staffId) : undefined;

      return {
        id: `${d}_${s.id}`,
        dept: d,
        staffId: s.id,
        name: String(s.name || s.displayName || '—'),
        role: normalizeRole(s.role),
        isActive: s.isActive !== false,
        status: s.status || (s.isActive !== false ? 'active' : 'inactive'),
        presentCount: presentCount + lateCount, // Include late days as present
        absentCount,
        lateCount,
        growthPointsTotal,
        totalFines: fines,
        employeeId: s.employeeId || s.customId || '—',
        designation: s.designation || s.role || 'Staff Member',
        photoUrl: s.photoUrl || s.photoURL,
        monthlySalary: Number(s.monthlySalary || 0),
        lastDutyLabel: lastDuty,
        seniority: s.seniority || 'Staff',
        todayUniformStatus: today.uniform,
        todayDutyStatus: today.duty,
        todayDailyScore: today.score,
        isPresentToday: today.score > 0 || today.attendance === 'present' || today.attendance === 'late',
        todayAttendanceStatus: today.attendance || 'unmarked',
        dutyConfig: s.dutyConfig || [],
        dressCodeConfig: s.dressCodeConfig || [],
        dutyStartTime: s.dutyStartTime || '09:00',
        dutyEndTime: s.dutyEndTime || '17:00',
      } as StaffCardRow;
    })
  );

  return enriched;
}

export async function fetchStaffProfile(compositeId: string): Promise<StaffProfile | null> {
  const idx = compositeId.indexOf('_');
  if (idx <= 0) return null;
  const dept = compositeId.slice(0, idx) as StaffDept;
  const uid = getSimpleId(compositeId.slice(idx + 1));

  if (!['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'].includes(dept)) return null;

  const col = getDeptCollection(dept);
  const snap = await getDoc(doc(db, col, uid)).catch((err) => {
    console.error(`[fetchStaffProfile] Error fetching base doc from ${col}/${uid}:`, err);
    return null;
  });
  if (!snap || !snap.exists()) return null;

  const data = snap.data() as any;
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [att, gp, fines, lastDuty] = await Promise.all([
    loadAttendanceMonth(dept, uid, monthKey).catch(() => ({ present: 0, absent: 0, late: 0 })),
    loadGrowthPoints(dept, uid, monthKey).catch(() => 0),
    loadFinesTotal(dept, uid).catch(() => 0),
    loadLastDuty(dept, uid).catch(() => undefined),
  ]);

  return {
    id: compositeId,
    dept,
    staffId: uid,
    name: String(data.name || data.displayName || '—'),
    role: normalizeRole(data.role),
    isActive: data.isActive !== false,
    status: data.status || (data.isActive !== false ? 'active' : 'inactive'),
    email: data.email,
    phone: data.phone,
    customId: data.customId, // Login ID
    employeeId: data.employeeId, // Visual ID (KH-STAFF-001 etc)
    address: data.address,
    cnic: data.cnic,
    dob: data.dob,
    gender: data.gender,
    fatherName: data.fatherName,
    bloodGroup: data.bloodGroup,
    emergencyContact: data.emergencyContact,
    emergencyContactName: data.emergencyContactName || data.emergencyContact,
    emergencyPhone: data.emergencyPhone,
    joiningDate: data.createdAt || data.joiningDate,
    lastLoginAt: data.lastLoginAt,
    photoUrl: data.photoUrl || data.photoURL,
    presentCount: att.present + att.late, // Redefined to include late days as present
    absentCount: att.absent,
    lateCount: att.late,
    growthPointsTotal: gp,
    totalFines: fines,
    lastDutyLabel: lastDuty,
    monthlySalary: Number(data.monthlySalary || 0),
    defaultPassword: data.defaultPassword || data.password || undefined,
    dutyConfig: data.dutyConfig || [],
    dressCodeConfig: data.dressCodeConfig || [],
    designation: data.designation || data.role || 'Staff Member',
    dutyStartTime: data.dutyStartTime || '09:00',
    dutyEndTime: data.dutyEndTime || '17:05',
    secondaryDepts: data.secondaryDepts || [],
    basicInfoExtras: data.basicInfoExtras || {},
    seniority: data.seniority,
    visibleSections: data.visibleSections || undefined,
    loginUserId: data.loginUserId || undefined,
    documents: data.documents || [],
    education: data.education || [],
    experience: data.experience || [],
    skills: data.skills || [],
  };
}

export type StaffProfile = StaffCardRow & {
  loginUserId?: string;
  email?: string;
  phone?: string;
  customId?: string; // This is the Login ID
  employeeId?: string; // This is the Visual ID
  address?: string;
  cnic?: string;
  dob?: string;
  gender?: string;
  fatherName?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyPhone?: string;
  joiningDate?: any;
  lastLoginAt?: any;
  photoUrl?: string;
  defaultPassword?: string;
  dutyConfig?: { key: string; label: string }[];
  dressCodeConfig?: { key: string; label: string }[];
  dutyStartTime?: string;
  dutyEndTime?: string;
  secondaryDepts?: StaffDept[];
  basicInfoExtras?: Record<string, string>;
  seniority?: string;
  visibleSections?: Record<string, boolean>;
  documents?: { title: string; url: string }[];
  education?: { degree: string; institution: string; year: string }[];
  experience?: { title: string; company: string; duration: string }[];
  skills?: string[];
};

export async function updateStaffProfile(
  compositeId: string,
  updates: any
): Promise<{ success: boolean; error?: string; newId?: string }> {
  const idx = compositeId.indexOf('_');
  if (idx <= 0) return { success: false, error: 'Invalid ID' };
  const currentDept = compositeId.slice(0, idx) as StaffDept;
  const uid = getSimpleId(compositeId.slice(idx + 1));

  if (!['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'].includes(currentDept)) {
    return { success: false, error: 'Invalid department' };
  }

  const { updateDoc, setDoc, getDoc, deleteDoc, doc: firestoreDoc } = await import('firebase/firestore');

  try {
    const oldCol = getDeptCollection(currentDept);
    const oldDocRef = firestoreDoc(db, oldCol, uid);

    const pass = updates.defaultPassword || updates.password;
    if (pass) {
      try {
        const { resetPortalUserPassword } = await import('@/app/hq/actions/resetPortalUserPassword');
        await resetPortalUserPassword(uid, currentDept, pass);
      } catch (e) {
        console.warn('Auth password reset via server action skipped or failed:', e);
      }
    }

    // Handle department change (Migration)
    const targetDept = updates.dept || updates.department;
    if (targetDept && targetDept !== currentDept) {
      const newDept = targetDept as StaffDept;
      const newCol = getDeptCollection(newDept);
      const newDocRef = firestoreDoc(db, newCol, uid);

      // 1. Get current data to preserve fields not in updates
      const snap = await getDoc(oldDocRef);
      if (!snap.exists()) return { success: false, error: 'Staff member not found' };
      const currentData = snap.data();

      // 2. Create new document in target collection
      await setDoc(newDocRef, {
        ...currentData,
        ...updates,
        dept: newDept,
        department: newDept,
        updatedAt: new Date()
      });

      // 3. Delete old document
      await deleteDoc(oldDocRef);

      // 4. Return new composite ID
      return { success: true, newId: `${newDept}_${uid}` };
    }

    // Standard update within same collection
    const finalUpdates = {
      ...updates,
      ...(updates.department ? { dept: updates.department } : {}),
      ...(updates.dept ? { department: updates.dept } : {})
    };
    await updateDoc(oldDocRef, finalUpdates);
    return { success: true };
  } catch (err: any) {
    console.error('Update failed:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteStaffProfile(
  compositeId: string
): Promise<{ success: boolean; error?: string }> {
  const idx = compositeId.indexOf('_');
  if (idx <= 0) return { success: false, error: 'Invalid ID' };
  const dept = compositeId.slice(0, idx) as StaffDept;
  const uid = getSimpleId(compositeId.slice(idx + 1));

  if (!['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'].includes(dept)) {
    return { success: false, error: 'Invalid department' };
  }

  const deptCol = getDeptCollection(dept);
  const { deleteDoc, doc: firestoreDoc } = await import('firebase/firestore');

  try {
    // 1. Delete from departmental users collection
    const deptDocRef = firestoreDoc(db, deptCol, uid);
    await deleteDoc(deptDocRef);

    // 2. Delete from global hq_staff collection (if it exists)
    const hqStaffRef = firestoreDoc(db, 'hq_staff', uid);
    await deleteDoc(hqStaffRef).catch(() => null); // Silently fail if doesn't exist

    return { success: true };
  } catch (err: any) {
    console.error('Delete failed:', err);
    return { success: false, error: err.message };
  }
}
