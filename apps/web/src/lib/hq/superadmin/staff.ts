// apps/web/src/lib/hq/superadmin/staff.ts

import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDate, formatDateDMY } from '@/lib/utils';

export type StaffDept = 'hq' | 'rehab' | 'spims' | 'hospital' | 'sukoon' | 'welfare' | 'job-center' | 'social-media' | 'it';
export type StaffRole = 'admin' | 'staff' | 'cashier' | 'superadmin' | 'manager' | 'doctor' | 'nurse' | 'counselor' | 'personnel' | 'student' | 'other';
export type StaffStatus = 'active' | 'inactive' | 'resigned' | 'terminated';

export function getDeptCollection(dept: StaffDept): string {
  if (dept === 'hq') return 'hq_users';
  if (dept === 'job-center') return 'jobcenter_users';
  if (dept === 'social-media') return 'media_users';
  const slug = dept.replace('-', '_');
  return `${slug}_users`;
}

export function getDeptPrefix(dept: StaffDept): string {
  if (dept === 'job-center') return 'jobcenter';
  if (dept === 'social-media') return 'media';
  return dept.replace('-', '_');
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

async function loadAttendanceMonth(dept: StaffDept, staffId: string, monthKey: string) {
  if (dept === 'hq') return { present: 0, absent: 0, late: 0 };
  const prefix = getDeptPrefix(dept);
  const col = `${prefix}_attendance`;
  const snap = await getDocs(
    query(collection(db, col), where('staffId', '==', staffId), where('month', '==', monthKey))
  ).catch(() => ({ docs: [] } as any));
  const rows = snap.docs.map((d: any) => d.data());
  let present = 0, absent = 0, late = 0;
  for (const r of rows) {
    const s = String(r.status || r.state || '').toLowerCase();
    if (s.includes('present')) present++;
    else if (s.includes('late')) late++;
    else if (s.includes('absent')) absent++;
  }
  return { present, absent, late };
}

async function loadGrowthPoints(dept: StaffDept, staffId: string) {
  if (dept === 'hq') return 0;
  const prefix = getDeptPrefix(dept);
  const col = `${prefix}_growth_points`;
  const snap = await getDocs(query(collection(db, col), where('staffId', '==', staffId), orderBy('createdAt', 'desc'), limit(200))).catch(
    () => ({ docs: [] } as any)
  );
  return snap.docs.reduce((acc: number, d: any) => acc + (Number(d.data()?.points) || 0), 0);
}

async function loadFinesTotal(dept: StaffDept, staffId: string) {
  if (dept === 'hq') return 0;
  const prefix = getDeptPrefix(dept);
  const col = `${prefix}_fines`;
  const snap = await getDocs(query(collection(db, col), where('staffId', '==', staffId), where('status', '==', 'unpaid'))).catch(() => ({ docs: [] } as any));
  return snap.docs.reduce((acc: number, d: any) => acc + (Number(d.data()?.amount) || 0), 0);
}

async function loadLastDuty(dept: StaffDept, staffId: string) {
  if (dept === 'hq') return undefined;
  const prefix = getDeptPrefix(dept);
  const col = `${prefix}_duty_logs`;
  const snap = await getDocs(query(collection(db, col), where('staffId', '==', staffId), orderBy('createdAt', 'desc'), limit(1))).catch(
    () => ({ docs: [] } as any)
  );
  if (!snap.docs.length) return undefined;
  const d = snap.docs[0].data();
  const when = toDate(d.createdAt || d.date);
  if (isNaN(when.getTime())) return 'No Date • Duty Log';
  return `${formatDateDMY(when)} • ${String(d.title || d.note || d.action || 'Duty log')}`;
}

async function loadTodayStats(dept: StaffDept, staffId: string, date: string, s: any) {
  if (dept === 'hq') return { uniform: 'na' as const, duty: 'na' as const, score: 0 };
  const prefix = getDeptPrefix(dept);
  
  const [attSnap, dressSnap, dutySnap, contribSnap] = await Promise.all([
    getDocs(query(collection(db, `${prefix}_attendance`), where('staffId', '==', staffId), where('date', '==', date))).catch(() => ({ docs: [] } as any)),
    getDocs(query(collection(db, `${prefix}_dress_logs`), where('staffId', '==', staffId), where('date', '==', date))).catch(() => ({ docs: [] } as any)),
    getDocs(query(collection(db, `${prefix}_duty_logs`), where('staffId', '==', staffId), where('date', '==', date))).catch(() => ({ docs: [] } as any)),
    getDocs(query(collection(db, `${prefix}_contributions`), where('staffId', '==', staffId), where('date', '==', date), where('isApproved', '==', true))).catch(() => ({ docs: [] } as any)),
  ]);

  const att = attSnap?.docs[0]?.data();
  const dress = dressSnap?.docs[0]?.data();
  const duty = dutySnap?.docs[0]?.data();
  const contribCount = contribSnap?.docs.length || 0;

  const attPoint = (att?.status === 'present' || att?.isLate) ? 1 : 0;
  
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

  return {
    uniform: uniformStatus as any,
    duty: dutyStatus as any,
    score: attPoint + uniformPoint + dutyPoint + contribPoint
  };
}

export async function listStaffCards({
  dept,
  status,
  role,
}: {
  dept: 'all' | StaffDept;
  status: 'all' | 'active' | 'inactive';
  role: 'all' | 'admin' | 'staff' | 'cashier' | 'personnel';
}): Promise<StaffCardRow[]> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const targetDepts: StaffDept[] = dept === 'all' 
    ? ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'] 
    : [dept];

  const base = await Promise.all(
    targetDepts.map(async (d) => {
      const col = getDeptCollection(d);
      const snap = await getDocs(query(collection(db, col), limit(500))).catch(() => ({ docs: [] } as any));
      return snap.docs.map((docSnap: any) => ({ ...docSnap.data(), _dept: d, id: docSnap.id }));
    })
  );

  const rows = base.flat().filter((s: any) => {
    const active = s.isActive !== false;
    const staffStatus = s.status || (active ? 'active' : 'inactive');

    if (status === 'active' && staffStatus !== 'active') return false;
    if (status === 'inactive' && (staffStatus === 'active')) return false;

    const normalizedRole = normalizeRole(s.role);
    if (normalizedRole === 'superadmin') return false;

    if (role === 'personnel') {
      // Personnel should exclude students, api tests, and clients
      if (normalizedRole === 'other' || normalizedRole === 'student') return false;
    } else if (role !== 'all' && normalizedRole !== role) {
      return false;
    }

    return true;
  });

  const enriched = await Promise.all(
    rows.map(async (s: any) => {
      const d = s._dept as StaffDept;
      const staffId = String(s.id);
      const [att, gp, fines, lastDuty, today] = await Promise.all([
        loadAttendanceMonth(d, staffId, monthKey),
        loadGrowthPoints(d, staffId),
        loadFinesTotal(d, staffId),
        loadLastDuty(d, staffId),
        loadTodayStats(d, staffId, now.toISOString().split('T')[0], s),
      ]);

      return {
        id: `${d}_${s.id}`,
        dept: d,
        staffId: s.id,
        name: String(s.name || s.displayName || '—'),
        role: normalizeRole(s.role),
        isActive: s.isActive !== false,
        status: s.status || (s.isActive !== false ? 'active' : 'inactive'),
        presentCount: att.present,
        absentCount: att.absent,
        lateCount: att.late,
        growthPointsTotal: gp,
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
      } as StaffCardRow;
    })
  );

  return enriched;
}

export type StaffProfile = StaffCardRow & {
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
};

export async function fetchStaffProfile(compositeId: string): Promise<StaffProfile | null> {
  const idx = compositeId.indexOf('_');
  if (idx <= 0) return null;
  const dept = compositeId.slice(0, idx) as StaffDept;
  const uid = compositeId.slice(idx + 1);

  if (!['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'].includes(dept)) return null;

  const col = getDeptCollection(dept);
  const { getDoc, doc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, col, uid)).catch(() => null);
  if (!snap || !snap.exists()) return null;

  const data = snap.data() as any;
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [att, gp, fines, lastDuty] = await Promise.all([
    loadAttendanceMonth(dept, uid, monthKey),
    loadGrowthPoints(dept, uid),
    loadFinesTotal(dept, uid),
    loadLastDuty(dept, uid),
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
    employeeId: data.employeeId || data.customId, // Visual ID, fallback to customId
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
    presentCount: att.present,
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
    dutyEndTime: data.dutyEndTime || '17:00',
    secondaryDepts: data.secondaryDepts || [],
    basicInfoExtras: data.basicInfoExtras || {},
    seniority: data.seniority,
  };
}

export async function updateStaffProfile(
  compositeId: string,
  updates: any
): Promise<{ success: boolean; error?: string }> {
  const idx = compositeId.indexOf('_');
  if (idx <= 0) return { success: false, error: 'Invalid ID' };
  const dept = compositeId.slice(0, idx) as StaffDept;
  const uid = compositeId.slice(idx + 1);

  if (!['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'].includes(dept)) return { success: false, error: 'Invalid department' };

  const col = getDeptCollection(dept);
  const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore');

  try {
    const docRef = firestoreDoc(db, col, uid);
    await updateDoc(docRef, updates);
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
  const uid = compositeId.slice(idx + 1);

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
    // The hq_staff record often has the same ID as the UID or composite ID.
    // Based on listStaffCards, the hq_staff might be a separate collection or just a mirror.
    // Let's also check hq_staff just in case.
    const hqStaffRef = firestoreDoc(db, 'hq_staff', uid);
    await deleteDoc(hqStaffRef).catch(() => null); // Silently fail if doesn't exist

    return { success: true };
  } catch (err: any) {
    console.error('Delete failed:', err);
    return { success: false, error: err.message };
  }
}


