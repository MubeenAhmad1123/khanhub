// src/lib/job-center/seekers.ts

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
  Seeker, 
  FeeRecord, 
  CanteenRecord, 
  DailyActivityRecord, 
  TherapySession, 
  MedicationRecord, 
  WeeklyProgress 
} from '@/types/job-center';

export interface SeekerFinanceSummary {
  seekerId: string;
  serialNumber: number;
  name: string;
  seekerNumber: string;
  inpatientNumber?: string;
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

// ─── SEEKER BASIC ───────────────────────────────────────────────────────────

export async function getSeeker(id: string): Promise<Seeker | null> {
  const snap = await getDoc(doc(db, 'jobcenter_seekers', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { 
    id: snap.id, 
    ...data,
    admissionDate: toDate(data.admissionDate),
    createdAt: toDate(data.createdAt),
    dischargeDate: data.dischargeDate ? toDate(data.dischargeDate) : undefined
  } as Seeker;
}

export async function getSeekers(): Promise<Seeker[]> {
  const q = query(collection(db, 'jobcenter_seekers'), orderBy('serialNumber', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data,
      admissionDate: toDate(data.admissionDate),
      createdAt: toDate(data.createdAt),
      dischargeDate: data.dischargeDate ? toDate(data.dischargeDate) : undefined
    } as Seeker;
  });
}

export async function createSeeker(data: Omit<Seeker, 'id' | 'createdAt'>): Promise<string> {
  const res = await addDoc(collection(db, 'jobcenter_seekers'), {
    ...data,
    admissionDate: Timestamp.fromDate(toDate(data.admissionDate)),
    createdAt: Timestamp.now(),
    isActive: true
  });
  return res.id;
}

export async function updateSeeker(id: string, data: Partial<Seeker>): Promise<void> {
  const updateData = { ...data };
  if (data.admissionDate) {
    updateData.admissionDate = Timestamp.fromDate(toDate(data.admissionDate)) as any;
  }
  if (data.dischargeDate) {
    updateData.dischargeDate = Timestamp.fromDate(toDate(data.dischargeDate)) as any;
  }
  await updateDoc(doc(db, 'jobcenter_seekers', id), updateData);
}

// ─── DAILY ACTIVITIES ────────────────────────────────────────────────────────

// Get daily activities for a seeker for a given month
export async function getDailyActivities(seekerId: string, yearMonth: string): Promise<DailyActivityRecord[]> {
  // yearMonth = "2025-01"
  const start = `${yearMonth}-01`;
  const end = `${yearMonth}-31`;
  
  const q = query(
    collection(db, 'jobcenter_daily_activities'),
    where('seekerId', '==', seekerId),
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
  seekerId: string,
  date: string,
  activities: DailyActivityRecord['activities'],
  markedBy: string,
  extra?: { counsellingNotes?: string; vitalNotes?: string }
): Promise<void> {
  // Check if doc exists for this seekerId+date
  const q = query(
    collection(db, 'jobcenter_daily_activities'),
    where('seekerId', '==', seekerId),
    where('date', '==', date),
    limit(1)
  );
  
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    const docId = snap.docs[0].id;
    await updateDoc(doc(db, 'jobcenter_daily_activities', docId), {
      activities,
      markedBy,
      updatedAt: Timestamp.now(),
      ...(extra?.counsellingNotes !== undefined && { counsellingSessionNotes: extra.counsellingNotes }),
      ...(extra?.vitalNotes !== undefined && { vitalSignNotes: extra.vitalNotes })
    });
  } else {
    await addDoc(collection(db, 'jobcenter_daily_activities'), {
      seekerId,
      date,
      activities,
      markedBy,
      createdAt: Timestamp.now(),
      counsellingSessionNotes: extra?.counsellingNotes || '',
      vitalSignNotes: extra?.vitalNotes || ''
    });
  }
}

// ─── THERAPY SESSIONS ──────────────────────────────────────────────────────────

export async function getTherapySessions(seekerId: string): Promise<TherapySession[]> {
  const q = query(
    collection(db, 'jobcenter_therapy_sessions'),
    where('seekerId', '==', seekerId)
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
  const res = await addDoc(collection(db, 'jobcenter_therapy_sessions'), {
    ...data,
    createdAt: Timestamp.now()
  });
  return res.id;
}

// ─── MEDICATION RECORDS ──────────────────────────────────────────────────────

export async function getMedicationRecords(seekerId: string): Promise<MedicationRecord[]> {
  const q = query(
    collection(db, 'jobcenter_medication_records'),
    where('seekerId', '==', seekerId)
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
  const res = await addDoc(collection(db, 'jobcenter_medication_records'), {
    ...data,
    createdAt: Timestamp.now()
  });
  return res.id;
}

// ─── WEEKLY PROGRESS ──────────────────────────────────────────────────────────

export async function getWeeklyProgress(seekerId: string): Promise<WeeklyProgress[]> {
  const q = query(
    collection(db, 'jobcenter_weekly_progress'),
    where('seekerId', '==', seekerId)
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
  const res = await addDoc(collection(db, 'jobcenter_weekly_progress'), {
    ...data,
    createdAt: Timestamp.now()
  });
  return res.id;
}

// ─── FINANCE HQ VIEW ──────────────────────────────────────────────────────────

export async function getAllSeekersWithFinanceSummary(): Promise<SeekerFinanceSummary[]> {
  // Load all active seekers
  const seekersSnap = await getDocs(query(collection(db, 'jobcenter_seekers'), where('isActive', '==', true)));
  const seekers = seekersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seeker));
  
  // Load ALL fees
  const feesSnap = await getDocs(collection(db, 'jobcenter_fees'));
  const allFees = feesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeRecord));
  
  // Load ALL canteen records
  const canteenSnap = await getDocs(collection(db, 'jobcenter_canteen'));
  const allCanteen = canteenSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CanteenRecord));
  
  // Map fees/canteen by seekerId
  const feesBySeeker: Record<string, FeeRecord[]> = {};
  allFees.forEach(f => {
    if (!feesBySeeker[f.seekerId]) feesBySeeker[f.seekerId] = [];
    feesBySeeker[f.seekerId].push(f);
  });
  
  const canteenBySeeker: Record<string, CanteenRecord[]> = {};
  allCanteen.forEach(c => {
    if (!canteenBySeeker[c.seekerId]) canteenBySeeker[c.seekerId] = [];
    canteenBySeeker[c.seekerId].push(c);
  });
  
  return seekers.map(s => {
    const sFees = feesBySeeker[s.id] || [];
    const sCanteen = canteenBySeeker[s.id] || [];
    
    const totalFees = (s.packageAmount || 0) * (s.durationMonths || 1);
    const otherExpenses = s.otherExpenses || 0;
    const totalDues = totalFees + otherExpenses;
    
    const totalReceived = sFees.reduce((acc, f) => {
      const approvedPayments = (f.payments || []).filter(pay => pay.status === 'approved');
      return acc + approvedPayments.reduce((sacc, pay) => sacc + pay.amount, 0);
    }, 0);
    
    const totalCanteenDeposited = sCanteen.reduce((acc, c) => acc + (c.totalDeposited || 0), 0);
    const totalCanteenSpent = sCanteen.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
    const canteenBalance = totalCanteenDeposited - totalCanteenSpent;
    
    return {
      seekerId: s.id,
      serialNumber: s.serialNumber,
      name: s.name,
      seekerNumber: s.seekerNumber,
      inpatientNumber: s.inpatientNumber,
      admissionDate: toDate(s.admissionDate),
      packageAmount: s.packageAmount,
      durationMonths: s.durationMonths,
      totalFees,
      otherExpenses,
      totalDues,
      totalReceived,
      remaining: totalDues - totalReceived,
      canteenDeposit: totalCanteenDeposited,
      canteenSpent: totalCanteenSpent,
      canteenBalance,
      guardianNumber: s.contactNumber,
      isActive: s.isActive
    };
  }).sort((a, b) => b.serialNumber - a.serialNumber);
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

export async function getSeekerFeeRecords(seekerId: string): Promise<FeeRecord[]> {
  const q = query(collection(db, 'jobcenter_fees'), where('seekerId', '==', seekerId));
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
