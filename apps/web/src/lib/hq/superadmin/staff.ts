// apps/web/src/lib/hq/superadmin/staff.ts

import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDate } from '@/lib/utils';

export type StaffDept = 'hq' | 'rehab' | 'spims' | 'hospital' | 'sukoon' | 'welfare' | 'job-center';
export type StaffRole = 'admin' | 'staff' | 'cashier' | 'superadmin' | 'manager' | 'other';

export type StaffCardRow = {
  id: string;
  dept: StaffDept;
  staffId: string;
  name: string;
  role: StaffRole;
  isActive: boolean;
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
};

function normalizeRole(raw: any): StaffRole {
  const r = String(raw || '').toLowerCase();
  if (r === 'admin' || r === 'staff' || r === 'cashier' || r === 'superadmin' || r === 'manager') return r as StaffRole;
  return 'other';
}

async function loadAttendanceMonth(dept: StaffDept, staffId: string, monthKey: string) {
  if (dept === 'hq') return { present: 0, absent: 0, late: 0 };
  const slug = dept.replace('-', '_');
  const col = `${slug}_attendance`;
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
  const slug = dept.replace('-', '_');
  const col = `${slug}_growth_points`;
  const snap = await getDocs(query(collection(db, col), where('staffId', '==', staffId), orderBy('createdAt', 'desc'), limit(200))).catch(
    () => ({ docs: [] } as any)
  );
  return snap.docs.reduce((acc: number, d: any) => acc + (Number(d.data()?.points) || 0), 0);
}

async function loadFinesTotal(dept: StaffDept, staffId: string) {
  if (dept === 'hq') return 0;
  const slug = dept.replace('-', '_');
  const col = `${slug}_fines`;
  const snap = await getDocs(query(collection(db, col), where('staffId', '==', staffId))).catch(() => ({ docs: [] } as any));
  return snap.docs.reduce((acc: number, d: any) => acc + (Number(d.data()?.amount) || 0), 0);
}

async function loadLastDuty(dept: StaffDept, staffId: string) {
  if (dept === 'hq') return undefined;
  const slug = dept.replace('-', '_');
  const col = `${slug}_duty_logs`;
  const snap = await getDocs(query(collection(db, col), where('staffId', '==', staffId), orderBy('createdAt', 'desc'), limit(1))).catch(
    () => ({ docs: [] } as any)
  );
  if (!snap.docs.length) return undefined;
  const d = snap.docs[0].data();
  const when = toDate(d.createdAt);
  return `${when.toISOString().slice(0, 10)} • ${String(d.title || d.note || d.action || 'Duty log')}`;
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
    ? ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center'] 
    : [dept];

  const base = await Promise.all(
    targetDepts.map(async (d) => {
      const slug = d.replace('-', '_');
      const col = d === 'hq' ? 'hq_users' : `${slug}_users`;
      const snap = await getDocs(query(collection(db, col), orderBy('createdAt', 'desc'), limit(500))).catch(() => ({ docs: [] } as any));
      return snap.docs.map((docSnap: any) => ({ _dept: d, id: docSnap.id, ...docSnap.data() }));
    })
  );

  const rows = base.flat().filter((s: any) => {
    const active = s.isActive !== false;
    if (status === 'active' && !active) return false;
    if (status === 'inactive' && active) return false;
    const normalizedRole = normalizeRole(s.role);
    if (role === 'personnel') {
      if (normalizedRole === 'other' || normalizedRole === 'superadmin') return false;
    } else if (role !== 'all' && normalizedRole !== role) {
      return false;
    }
    return true;
  });

  const enriched = await Promise.all(
    rows.map(async (s: any) => {
      const d = s._dept as StaffDept;
      const staffId = String(s.id);
      const [att, gp, fines, lastDuty] = await Promise.all([
        loadAttendanceMonth(d, staffId, monthKey),
        loadGrowthPoints(d, staffId),
        loadFinesTotal(d, staffId),
        loadLastDuty(d, staffId),
      ]);

      return {
        id: `${d}_${s.id}`,
        dept: d,
        staffId: s.id,
        name: String(s.name || s.displayName || '—'),
        role: normalizeRole(s.role),
        isActive: s.isActive !== false,
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
      } as StaffCardRow;
    })
  );

  return enriched;
}

export type StaffProfile = StaffCardRow & {
  email?: string;
  phone?: string;
  customId?: string;
  address?: string;
  cnic?: string;
  joiningDate?: any;
  lastLoginAt?: any;
  photoUrl?: string;
  defaultPassword?: string;
  dutyConfig?: { key: string; label: string }[];
  dressCodeConfig?: { key: string; label: string }[];
};

export async function fetchStaffProfile(compositeId: string): Promise<StaffProfile | null> {
  const idx = compositeId.indexOf('_');
  if (idx <= 0) return null;
  const dept = compositeId.slice(0, idx) as StaffDept;
  const uid = compositeId.slice(idx + 1);

  if (!['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center'].includes(dept)) return null;

  const slug = dept.replace('-', '_');
  const col = dept === 'hq' ? 'hq_users' : `${slug}_users`;
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
    email: data.email,
    phone: data.phone,
    customId: data.customId,
    address: data.address,
    cnic: data.cnic,
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

  if (!['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center'].includes(dept)) return { success: false, error: 'Invalid department' };

  const slug = dept.replace('-', '_');
  const col = dept === 'hq' ? 'hq_users' : `${slug}_users`;
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

