// src/lib/rehab/patients.ts

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
  Patient, 
  FeeRecord, 
  CanteenRecord, 
  DailyActivityRecord, 
  TherapySession, 
  MedicationRecord, 
  WeeklyProgress 
} from '@/types/rehab';

export interface PatientFinanceSummary {
  patientId: string;
  serialNumber: number;
  name: string;
  inpatientNumber: string;
  admissionDate: Date;
  packageAmount: number;
  dailyRate: number;       // packageAmount / 30
  daysStayed: number;
  totalFees: number;       // dailyRate × daysStayed
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

// ─── PATIENT BASIC ───────────────────────────────────────────────────────────

export async function getPatient(id: string): Promise<Patient | null> {
  const snap = await getDoc(doc(db, 'rehab_patients', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { 
    id: snap.id, 
    ...data,
    admissionDate: toDate(data.admissionDate),
    createdAt: toDate(data.createdAt),
    dischargeDate: data.dischargeDate ? toDate(data.dischargeDate) : undefined
  } as Patient;
}

export async function getPatients(): Promise<Patient[]> {
  const q = query(collection(db, 'rehab_patients'), orderBy('serialNumber', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data,
      admissionDate: toDate(data.admissionDate),
      createdAt: toDate(data.createdAt),
      dischargeDate: data.dischargeDate ? toDate(data.dischargeDate) : undefined
    } as Patient;
  });
}

export async function createPatient(data: Omit<Patient, 'id' | 'createdAt'>): Promise<string> {
  const res = await addDoc(collection(db, 'rehab_patients'), {
    ...data,
    admissionDate: Timestamp.fromDate(toDate(data.admissionDate)),
    createdAt: Timestamp.now(),
    isActive: true
  });
  return res.id;
}

export async function updatePatient(id: string, data: Partial<Patient>): Promise<void> {
  const updateData = { ...data };
  if (data.admissionDate) {
    updateData.admissionDate = Timestamp.fromDate(toDate(data.admissionDate)) as any;
  }
  if (data.dischargeDate) {
    updateData.dischargeDate = Timestamp.fromDate(toDate(data.dischargeDate)) as any;
  }
  await updateDoc(doc(db, 'rehab_patients', id), updateData);
}

// ─── DAILY ACTIVITIES ────────────────────────────────────────────────────────

// Get daily activities for a patient for a given month
export async function getDailyActivities(patientId: string, yearMonth: string): Promise<DailyActivityRecord[]> {
  // yearMonth = "2025-01"
  const start = `${yearMonth}-01`;
  const end = `${yearMonth}-31`;
  
  const q = query(
    collection(db, 'rehab_daily_activities'),
    where('patientId', '==', patientId),
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
  patientId: string,
  date: string,
  activities: DailyActivityRecord['activities'],
  markedBy: string,
  extra?: { counsellingNotes?: string; vitalNotes?: string }
): Promise<void> {
  // Check if doc exists for this patientId+date
  const q = query(
    collection(db, 'rehab_daily_activities'),
    where('patientId', '==', patientId),
    where('date', '==', date),
    limit(1)
  );
  
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    const docId = snap.docs[0].id;
    await updateDoc(doc(db, 'rehab_daily_activities', docId), {
      activities,
      markedBy,
      updatedAt: Timestamp.now(),
      ...(extra?.counsellingNotes !== undefined && { counsellingSessionNotes: extra.counsellingNotes }),
      ...(extra?.vitalNotes !== undefined && { vitalSignNotes: extra.vitalNotes })
    });
  } else {
    await addDoc(collection(db, 'rehab_daily_activities'), {
      patientId,
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

export async function getTherapySessions(patientId: string): Promise<TherapySession[]> {
  const q = query(
    collection(db, 'rehab_therapy_sessions'),
    where('patientId', '==', patientId)
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
  const res = await addDoc(collection(db, 'rehab_therapy_sessions'), {
    ...data,
    createdAt: Timestamp.now()
  });
  return res.id;
}

// ─── MEDICATION RECORDS ──────────────────────────────────────────────────────

export async function getMedicationRecords(patientId: string): Promise<MedicationRecord[]> {
  const q = query(
    collection(db, 'rehab_medication_records'),
    where('patientId', '==', patientId)
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
  const res = await addDoc(collection(db, 'rehab_medication_records'), {
    ...data,
    createdAt: Timestamp.now()
  });
  return res.id;
}

// ─── WEEKLY PROGRESS ──────────────────────────────────────────────────────────

export async function getWeeklyProgress(patientId: string): Promise<WeeklyProgress[]> {
  const q = query(
    collection(db, 'rehab_weekly_progress'),
    where('patientId', '==', patientId)
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
  const res = await addDoc(collection(db, 'rehab_weekly_progress'), {
    ...data,
    createdAt: Timestamp.now()
  });
  return res.id;
}

// ─── FINANCE HQ VIEW ──────────────────────────────────────────────────────────

export async function getAllPatientsWithFinanceSummary(): Promise<PatientFinanceSummary[]> {
  // Load all active patients
  const patientsSnap = await getDocs(query(collection(db, 'rehab_patients'), where('isActive', '==', true)));
  const patients = patientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
  
  // Load ALL fees
  const feesSnap = await getDocs(collection(db, 'rehab_fees'));
  const allFees = feesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeRecord));
  
  // Load ALL canteen records
  const canteenSnap = await getDocs(collection(db, 'rehab_canteen'));
  const allCanteen = canteenSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CanteenRecord));
  
  // Map fees/canteen by patientId
  const feesByPatient: Record<string, FeeRecord[]> = {};
  allFees.forEach(f => {
    if (!feesByPatient[f.patientId]) feesByPatient[f.patientId] = [];
    feesByPatient[f.patientId].push(f);
  });
  
  const canteenByPatient: Record<string, CanteenRecord[]> = {};
  allCanteen.forEach(c => {
    if (!canteenByPatient[c.patientId]) canteenByPatient[c.patientId] = [];
    canteenByPatient[c.patientId].push(c);
  });
  
  return patients.map(p => {
    const pFees = feesByPatient[p.id] || [];
    const pCanteen = canteenByPatient[p.id] || [];
    
    const admission = toDate(p.admissionDate);
    const diffMs = new Date().getTime() - admission.getTime();
    const daysStayed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const dailyRate = Math.round((p.packageAmount || 0) / 30);
    const totalFees = dailyRate * daysStayed;
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
      patientId: p.id,
      serialNumber: p.serialNumber,
      name: p.name,
      inpatientNumber: p.inpatientNumber,
      admissionDate: toDate(p.admissionDate),
      packageAmount: p.packageAmount,
      dailyRate,
      daysStayed,
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

export async function getPatientFeeRecords(patientId: string): Promise<FeeRecord[]> {
  const q = query(collection(db, 'rehab_fees'), where('patientId', '==', patientId));
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
