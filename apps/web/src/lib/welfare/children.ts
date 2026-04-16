// src/lib/welfare/children.ts

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  setDoc,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { toDate } from '../utils';
import type { 
  Child, 
  FeeRecord, 
  CanteenRecord, 
  DailyActivityRecord, 
  TherapySession, 
  MedicationRecord, 
  WeeklyProgress 
} from '@/types/welfare';

export interface ChildFinanceSummary {
  childId: string;
  serialNumber: number;
  name: string;
  admissionNumber: string;
  admissionDate: Date;
  packageAmount: number;
  durationMonths: number;
  totalFees: number;       // packageAmount × durationMonths
  otherExpenses: number;
  totalDues: number;       // totalFees + otherExpenses
  totalReceived: number;
  remaining: number;       // totalDues - totalReceived
  canteenDeposit: number;
  canteenSpent: number;
  canteenBalance: number;
  guardianNumber: string;
  isActive: boolean;
}

// ─── CHILD BASIC ───────────────────────────────────────────────────────────

export async function getChild(id: string): Promise<Child | null> {
  const snap = await getDoc(doc(db, 'welfare_children', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { 
    id: snap.id, 
    ...data,
    admissionDate: toDate(data.admissionDate),
    createdAt: toDate(data.createdAt),
    dischargeDate: data.dischargeDate ? toDate(data.dischargeDate) : undefined
  } as Child;
}

export async function getChildren(): Promise<Child[]> {
  const q = query(collection(db, 'welfare_children'), orderBy('serialNumber', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data,
      admissionDate: toDate(data.admissionDate),
      createdAt: toDate(data.createdAt),
      dischargeDate: data.dischargeDate ? toDate(data.dischargeDate) : undefined
    } as Child;
  });
}

export async function createChild(data: Omit<Child, 'id' | 'createdAt'>): Promise<string> {
  const res = await addDoc(collection(db, 'welfare_children'), {
    ...data,
    admissionDate: Timestamp.fromDate(toDate(data.admissionDate)),
    createdAt: Timestamp.now(),
    isActive: true
  });
  return res.id;
}

export async function updateChild(id: string, data: Partial<Child>): Promise<void> {
  const updateData = { ...data };
  if (data.admissionDate) {
    updateData.admissionDate = Timestamp.fromDate(toDate(data.admissionDate)) as any;
  }
  if (data.dischargeDate) {
    updateData.dischargeDate = Timestamp.fromDate(toDate(data.dischargeDate)) as any;
  }
  await updateDoc(doc(db, 'welfare_children', id), updateData);
}

// ─── DAILY ACTIVITIES ────────────────────────────────────────────────────────

// Get daily activities for a child for a given month
export async function getDailyActivities(childId: string, yearMonth: string): Promise<DailyActivityRecord[]> {
  // yearMonth = "2025-01"
  const start = `${yearMonth}-01`;
  const end = `${yearMonth}-31`;
  
  const q = query(
    collection(db, 'welfare_daily_activities'),
    where('childId', '==', childId),
    where('date', '>=', start),
    where('date', '<=', end)
  );
  
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: data.updatedAt ? toDate(data.updatedAt) : undefined
    } as DailyActivityRecord;
  }).sort((a, b) => a.date.localeCompare(b.date)); // client-side sort to avoid index
}

// Save/update a single day's activity record
export async function saveDailyActivity(
  childId: string,
  date: string,
  activities: DailyActivityRecord['activities'],
  markedBy: string,
  extra?: { generalNotes?: string }
): Promise<void> {
  // Check if doc exists for this childId+date
  const q = query(
    collection(db, 'welfare_daily_activities'),
    where('childId', '==', childId),
    where('date', '==', date),
    limit(1)
  );
  
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    const docId = snap.docs[0].id;
    await updateDoc(doc(db, 'welfare_daily_activities', docId), {
      activities,
      markedBy,
      updatedAt: Timestamp.now(),
      ...(extra?.generalNotes !== undefined && { generalNotes: extra.generalNotes })
    });
  } else {
    await addDoc(collection(db, 'welfare_daily_activities'), {
      childId,
      date,
      activities,
      markedBy,
      createdAt: Timestamp.now(),
      generalNotes: extra?.generalNotes || ''
    });
  }
}

// ─── THERAPY SESSIONS ──────────────────────────────────────────────────────────

export async function getTherapySessions(childId: string): Promise<TherapySession[]> {
  const q = query(
    collection(db, 'welfare_therapy_sessions'),
    where('childId', '==', childId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt)
    } as TherapySession;
  }).sort((a, b) => a.sessionNumber - b.sessionNumber);
}

export async function addTherapySession(data: Omit<TherapySession, 'id' | 'createdAt'>): Promise<string> {
  const res = await addDoc(collection(db, 'welfare_therapy_sessions'), {
    ...data,
    createdAt: Timestamp.now()
  });
  return res.id;
}

// ─── MEDICATION RECORDS ──────────────────────────────────────────────────────

export async function getMedicationRecords(childId: string): Promise<MedicationRecord[]> {
  const q = query(
    collection(db, 'welfare_medication_records'),
    where('childId', '==', childId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt)
    } as MedicationRecord;
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export async function addMedicationRecord(data: Omit<MedicationRecord, 'id' | 'createdAt'>): Promise<string> {
  const res = await addDoc(collection(db, 'welfare_medication_records'), {
    ...data,
    createdAt: Timestamp.now()
  });
  return res.id;
}

// ─── WEEKLY PROGRESS ──────────────────────────────────────────────────────────

export async function getWeeklyProgress(childId: string): Promise<WeeklyProgress[]> {
  const q = query(
    collection(db, 'welfare_weekly_progress'),
    where('childId', '==', childId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt)
    } as WeeklyProgress;
  }).sort((a, b) => a.weekNumber - b.weekNumber);
}

export async function addWeeklyProgress(data: Omit<WeeklyProgress, 'id' | 'createdAt'>): Promise<string> {
  const res = await addDoc(collection(db, 'welfare_weekly_progress'), {
    ...data,
    createdAt: Timestamp.now()
  });
  return res.id;
}

// ─── FINANCE HQ VIEW ──────────────────────────────────────────────────────────

export async function getAllChildrenWithFinanceSummary(): Promise<ChildFinanceSummary[]> {
  // Load all active children
  const childrenSnap = await getDocs(query(collection(db, 'welfare_children'), where('isActive', '==', true)));
  const children = childrenSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Child));
  
  // Load ALL fees
  const feesSnap = await getDocs(collection(db, 'welfare_fees'));
  const allFees = feesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeRecord));
  
  // Load ALL canteen records
  const canteenSnap = await getDocs(collection(db, 'welfare_canteen'));
  const allCanteen = canteenSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CanteenRecord));
  
  // Map fees/canteen by childId
  const feesByChild: Record<string, FeeRecord[]> = {};
  allFees.forEach(f => {
    if (!feesByChild[f.childId]) feesByChild[f.childId] = [];
    feesByChild[f.childId].push(f);
  });
  
  const canteenByChild: Record<string, CanteenRecord[]> = {};
  allCanteen.forEach(c => {
    if (!canteenByChild[c.childId]) canteenByChild[c.childId] = [];
    canteenByChild[c.childId].push(c);
  });
  
  return children.map(p => {
    const pFees = feesByChild[p.id] || [];
    const pCanteen = canteenByChild[p.id] || [];
    
    const totalFees = (p.packageAmount || 0) * (p.durationMonths || 1);
    const otherExpenses = p.otherExpenses || 0;
    const totalDues = totalFees + otherExpenses;
    
    const totalReceived = pFees.reduce((acc, f) => {
      const approvedPayments = (f.payments || []).filter(pay => pay.status === 'approved');
      return acc + approvedPayments.reduce((pacc, pay) => pacc + pay.amount, 0);
    }, 0);
    
    const totalCanteenDeposited = pCanteen.reduce((acc, c) => acc + (c.totalDeposited || 0), 0);
    const totalCanteenSpent = pCanteen.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
    const canteenBalance = totalCanteenDeposited - totalCanteenSpent;
    
    return {
      childId: p.id,
      serialNumber: p.serialNumber,
      name: p.name,
      admissionNumber: p.admissionNumber,
      admissionDate: toDate(p.admissionDate),
      packageAmount: p.packageAmount,
      durationMonths: p.durationMonths,
      totalFees,
      otherExpenses,
      totalDues,
      totalReceived,
      remaining: totalDues - totalReceived,
      canteenDeposit: totalCanteenDeposited,
      canteenSpent: totalCanteenSpent,
      canteenBalance,
      guardianNumber: p.contactNumber,
      isActive: p.isActive
    };
  }).sort((a, b) => b.serialNumber - a.serialNumber);
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

export async function getChildFeeRecords(childId: string): Promise<FeeRecord[]> {
  const q = query(collection(db, 'welfare_fees'), where('childId', '==', childId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data,
      payments: data.payments.map((p: any) => ({ ...p, date: toDate(p.date) }))
    } as FeeRecord;
  });
}

// ─── DONORS ────────────────────────────────────────────────────────────────────

export interface WelfareDonor {
  id: string;
  serialNumber: number;
  name: string;
  contactNumber?: string;
  isActive: boolean;
  createdAt: any;
  [key: string]: any;
}

export async function getWelfareDonors(): Promise<WelfareDonor[]> {
  const q = query(collection(db, 'welfare_donors'), orderBy('serialNumber', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WelfareDonor));
}

export async function getWelfareDonor(id: string): Promise<WelfareDonor | null> {
  const snap = await getDoc(doc(db, 'welfare_donors', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WelfareDonor;
}

export async function createWelfareDonor(data: Omit<WelfareDonor, 'id' | 'createdAt'>): Promise<string> {
  const res = await addDoc(collection(db, 'welfare_donors'), {
    ...data,
    createdAt: Timestamp.now(),
    isActive: true
  });
  return res.id;
}

export async function updateWelfareDonor(id: string, data: Partial<WelfareDonor>): Promise<void> {
  await updateDoc(doc(db, 'welfare_donors', id), data);
}
