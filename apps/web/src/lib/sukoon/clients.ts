// src/lib/sukoon/clients.ts

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
  Client, 
  FeeRecord, 
  CanteenRecord, 
  DailyActivityRecord, 
  TherapySession, 
  MedicationRecord, 
  WeeklyProgress 
} from '@/types/sukoon';

export interface ClientFinanceSummary {
  clientId: string;
  serialNumber: number;
  name: string;
  inpatientNumber: string;
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

// ─── CLIENT BASIC ───────────────────────────────────────────────────────────

export async function getClient(id: string): Promise<Client | null> {
  const snap = await getDoc(doc(db, 'sukoon_clients', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { 
    id: snap.id, 
    ...data,
    admissionDate: toDate(data.admissionDate),
    createdAt: toDate(data.createdAt),
    dischargeDate: data.dischargeDate ? toDate(data.dischargeDate) : undefined
  } as Client;
}

export async function getClients(): Promise<Client[]> {
  const q = query(collection(db, 'sukoon_clients'), orderBy('serialNumber', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data,
      admissionDate: toDate(data.admissionDate),
      createdAt: toDate(data.createdAt),
      dischargeDate: data.dischargeDate ? toDate(data.dischargeDate) : undefined
    } as Client;
  });
}

export async function createClient(data: Omit<Client, 'id' | 'createdAt'>): Promise<string> {
  const res = await addDoc(collection(db, 'sukoon_clients'), {
    ...data,
    admissionDate: Timestamp.fromDate(toDate(data.admissionDate)),
    createdAt: Timestamp.now(),
    isActive: true
  });
  return res.id;
}

export async function updateClient(id: string, data: Partial<Client>): Promise<void> {
  const updateData = { ...data };
  if (data.admissionDate) {
    updateData.admissionDate = Timestamp.fromDate(toDate(data.admissionDate)) as any;
  }
  if (data.dischargeDate) {
    updateData.dischargeDate = Timestamp.fromDate(toDate(data.dischargeDate)) as any;
  }
  await updateDoc(doc(db, 'sukoon_clients', id), updateData);
}

// ─── DAILY ACTIVITIES ────────────────────────────────────────────────────────

// Get daily activities for a client for a given month
export async function getDailyActivities(clientId: string, yearMonth: string): Promise<DailyActivityRecord[]> {
  // yearMonth = "2025-01"
  const start = `${yearMonth}-01`;
  const end = `${yearMonth}-31`;
  
  const q = query(
    collection(db, 'sukoon_daily_activities'),
    where('clientId', '==', clientId),
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
  clientId: string,
  date: string,
  activities: DailyActivityRecord['activities'],
  markedBy: string,
  extra?: { counsellingNotes?: string; vitalNotes?: string }
): Promise<void> {
  // Check if doc exists for this clientId+date
  const q = query(
    collection(db, 'sukoon_daily_activities'),
    where('clientId', '==', clientId),
    where('date', '==', date),
    limit(1)
  );
  
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    const docId = snap.docs[0].id;
    await updateDoc(doc(db, 'sukoon_daily_activities', docId), {
      activities,
      markedBy,
      updatedAt: Timestamp.now(),
      ...(extra?.counsellingNotes !== undefined && { counsellingSessionNotes: extra.counsellingNotes }),
      ...(extra?.vitalNotes !== undefined && { vitalSignNotes: extra.vitalNotes })
    });
  } else {
    await addDoc(collection(db, 'sukoon_daily_activities'), {
      clientId,
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

export async function getTherapySessions(clientId: string): Promise<TherapySession[]> {
  const q = query(
    collection(db, 'sukoon_therapy_sessions'),
    where('clientId', '==', clientId)
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
  const res = await addDoc(collection(db, 'sukoon_therapy_sessions'), {
    ...data,
    createdAt: Timestamp.now()
  });
  return res.id;
}

// ─── MEDICATION RECORDS ──────────────────────────────────────────────────────

export async function getMedicationRecords(clientId: string): Promise<MedicationRecord[]> {
  const q = query(
    collection(db, 'sukoon_medication_records'),
    where('clientId', '==', clientId)
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
  const res = await addDoc(collection(db, 'sukoon_medication_records'), {
    ...data,
    createdAt: Timestamp.now()
  });
  return res.id;
}

// ─── WEEKLY PROGRESS ──────────────────────────────────────────────────────────

export async function getWeeklyProgress(clientId: string): Promise<WeeklyProgress[]> {
  const q = query(
    collection(db, 'sukoon_weekly_progress'),
    where('clientId', '==', clientId)
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
  const res = await addDoc(collection(db, 'sukoon_weekly_progress'), {
    ...data,
    createdAt: Timestamp.now()
  });
  return res.id;
}

// ─── FINANCE HQ VIEW ──────────────────────────────────────────────────────────

export async function getAllClientsWithFinanceSummary(): Promise<ClientFinanceSummary[]> {
  // Load all active clients
  const clientsSnap = await getDocs(query(collection(db, 'sukoon_clients'), where('isActive', '==', true)));
  const clients = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
  
  // Load ALL fees
  const feesSnap = await getDocs(collection(db, 'sukoon_fees'));
  const allFees = feesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeRecord));
  
  // Load ALL canteen records
  const canteenSnap = await getDocs(collection(db, 'sukoon_canteen'));
  const allCanteen = canteenSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CanteenRecord));
  
  // Map fees/canteen by clientId
  const feesByClient: Record<string, FeeRecord[]> = {};
  allFees.forEach(f => {
    if (!feesByClient[f.clientId]) feesByClient[f.clientId] = [];
    feesByClient[f.clientId].push(f);
  });
  
  const canteenByClient: Record<string, CanteenRecord[]> = {};
  allCanteen.forEach(c => {
    if (!canteenByClient[c.clientId]) canteenByClient[c.clientId] = [];
    canteenByClient[c.clientId].push(c);
  });
  
  return clients.map(p => {
    const pFees = feesByClient[p.id] || [];
    const pCanteen = canteenByClient[p.id] || [];
    
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
      clientId: p.id,
      serialNumber: p.serialNumber,
      name: p.name,
      inpatientNumber: p.inpatientNumber,
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

export async function getClientFeeRecords(clientId: string): Promise<FeeRecord[]> {
  const q = query(collection(db, 'sukoon_fees'), where('clientId', '==', clientId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data,
      payments: (data.payments || []).map((p: any) => ({ ...p, date: toDate(p.date) }))
    } as FeeRecord;
  });
}
