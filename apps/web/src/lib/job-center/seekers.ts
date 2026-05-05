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
import { getCached, setCached } from '../queryCache';

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
  admissionDate: Date;
  registrationFee: number;
  totalReceived: number;
  remaining: number;
  canteenDeposit: number;
  canteenSpent: number;
  canteenBalance: number;
  contactNumber: string;
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
    createdAt: toDate(data.createdAt),
  } as Seeker;
}

export async function getSeekers(): Promise<Seeker[]> {
  const cacheKey = 'jobcenter_seekers_list';
  const cached = getCached<Seeker[]>(cacheKey);
  if (cached) return cached;

  const q = query(collection(db, 'jobcenter_seekers'), orderBy('serialNumber', 'desc'), limit(100));
  const snap = await getDocs(q);
  const seekers = snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data,
      createdAt: toDate(data.createdAt),
    } as Seeker;
  });
  setCached(cacheKey, seekers, 180); // 3 min cache
  return seekers;
}


export async function createSeeker(data: Omit<Seeker, 'id' | 'createdAt'>): Promise<string> {
  const res = await addDoc(collection(db, 'jobcenter_seekers'), {
    ...data,
    createdAt: Timestamp.now(),
    isActive: true
  });
  return res.id;
}

export async function updateSeeker(id: string, data: Partial<Seeker>): Promise<void> {
  await updateDoc(doc(db, 'jobcenter_seekers', id), data as any);
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
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    updatedAt: doc.data().updatedAt ? toDate(doc.data().updatedAt) : undefined
  } as any)).sort((a: any, b: any) => a.date.localeCompare(b.date));
}

// Save/update a single day's activity record
export async function saveDailyActivity(
  seekerId: string,
  date: string,
  activities: DailyActivityRecord['activities'],
  markedBy: string,
  extra?: { careerCounsellingNotes?: string; placementStatusNotes?: string }
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
      ...(extra?.careerCounsellingNotes !== undefined && { careerCounsellingNotes: extra.careerCounsellingNotes }),
      ...(extra?.placementStatusNotes !== undefined && { placementStatusNotes: extra.placementStatusNotes })
    });
  } else {
    await addDoc(collection(db, 'jobcenter_daily_activities'), {
      seekerId,
      date,
      activities,
      markedBy,
      createdAt: Timestamp.now(),
      careerCounsellingNotes: extra?.careerCounsellingNotes || '',
      placementStatusNotes: extra?.placementStatusNotes || ''
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
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt)
  } as any)).sort((a: any, b: any) => (a.sessionNumber || 0) - (b.sessionNumber || 0));
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
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt)
  } as any)).sort((a: any, b: any) => b.date.localeCompare(a.date));
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
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt)
  } as any)).sort((a: any, b: any) => (a.weekNumber || 0) - (b.weekNumber || 0));
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
  const cacheKey = 'jobcenter_seekers_finance_summary';
  const cached = getCached<SeekerFinanceSummary[]>(cacheKey);
  if (cached) return cached;

  // Load limited seekers
  const q = query(collection(db, 'jobcenter_seekers'), orderBy('serialNumber', 'desc'), limit(100));
  const seekersSnap = await getDocs(q);
  const seekers = seekersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seeker));
  
  if (seekers.length === 0) return [];

  const seekerIds = seekers.map(s => s.id);
  
  // Batch fetch fees and canteen records for THESE seekers ONLY
  const fetchInChunks = async (col: string, ids: string[]) => {
    const results: any[] = [];
    for (let i = 0; i < ids.length; i += 30) {
      const chunk = ids.slice(i, i + 30);
      const q = query(collection(db, col), where('seekerId', 'in', chunk));
      const snap = await getDocs(q);
      snap.docs.forEach(d => results.push({ id: d.id, ...d.data() }));
    }
    return results;
  };

  const [allFees, allCanteen] = await Promise.all([
    fetchInChunks('jobcenter_fees', seekerIds),
    fetchInChunks('jobcenter_canteen', seekerIds)
  ]);
  
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
  
  const summary = seekers.map(s => {
    const sFees = feesBySeeker[s.id] || [];
    const sCanteen = canteenBySeeker[s.id] || [];
    
    const registrationFee = 0; // Job Center registration fee (if any)
    
    const totalReceived = sFees.reduce((acc, f) => {
      const approvedPayments = (f.payments || []).filter((pay: any) => pay.status === 'approved');
      return acc + approvedPayments.reduce((sacc: any, pay: any) => sacc + pay.amount, 0);
    }, 0);
    
    const totalCanteenDeposited = sCanteen.reduce((acc, c) => acc + (c.totalDeposited || 0), 0);
    const totalCanteenSpent = sCanteen.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
    const canteenBalance = totalCanteenDeposited - totalCanteenSpent;
    
    return {
      seekerId: s.id,
      serialNumber: s.serialNumber,
      name: s.name,
      seekerNumber: s.seekerNumber,
      admissionDate: toDate(s.createdAt),
      registrationFee,
      totalReceived,
      remaining: registrationFee - totalReceived,
      canteenDeposit: totalCanteenDeposited,
      canteenSpent: totalCanteenSpent,
      canteenBalance,
      contactNumber: s.contactNumber,
      isActive: s.isActive
    };
  });

  setCached(cacheKey, summary, 180); // 3 min cache
  return summary;
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
