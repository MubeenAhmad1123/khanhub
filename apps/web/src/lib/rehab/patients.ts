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
import { getCached, setCached } from '../queryCache';

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
  rejoinHistory?: any[];
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
  const cacheKey = 'rehab_patients_list';
  const cached = getCached<Patient[]>(cacheKey);
  if (cached) return cached;

  const q = query(collection(db, 'rehab_patients'), orderBy('serialNumber', 'desc'), limit(100));
  const snap = await getDocs(q);
  const patients = snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data,
      admissionDate: toDate(data.admissionDate),
      createdAt: toDate(data.createdAt),
      dischargeDate: data.dischargeDate ? toDate(data.dischargeDate) : undefined
    } as Patient;
  });
  setCached(cacheKey, patients, 180); // 3 min cache
  return patients;
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
  const docId = `${patientId}_${date}`;
  const docRef = doc(db, 'rehab_daily_activities', docId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    await updateDoc(docRef, {
      activities,
      markedBy,
      updatedAt: Timestamp.now(),
      ...(extra?.counsellingNotes !== undefined && { counsellingSessionNotes: extra.counsellingNotes }),
      ...(extra?.vitalNotes !== undefined && { vitalSignNotes: extra.vitalNotes })
    });
  } else {
    await setDoc(docRef, {
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

export async function updateTherapySession(sessionId: string, sessionNotes: string, date?: string): Promise<void> {
  const updateData: any = {
    sessionNotes,
    updatedAt: Timestamp.now()
  };
  if (date) {
    updateData.date = date;
  }
  await updateDoc(doc(db, 'rehab_therapy_sessions', sessionId), updateData);
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
  const cacheKey = 'rehab_patients_finance_summary';
  const cached = getCached<PatientFinanceSummary[]>(cacheKey);
  if (cached) return cached;

  // Load limited patients
  const q = query(collection(db, 'rehab_patients'), orderBy('serialNumber', 'desc'), limit(100));
  const patientsSnap = await getDocs(q);
  const patients = patientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
  
  if (patients.length === 0) return [];

  const patientIds = patients.map(p => p.id);
  
  // Batch fetch fees and canteen records for THESE patients ONLY
  // Firestore 'in' limit is 30, so we chunk
  const fetchInChunks = async (col: string, ids: string[]) => {
    const results: any[] = [];
    for (let i = 0; i < ids.length; i += 30) {
      const chunk = ids.slice(i, i + 30);
      const q = query(collection(db, col), where('patientId', 'in', chunk));
      const snap = await getDocs(q);
      snap.docs.forEach(d => results.push({ id: d.id, ...d.data() }));
    }
    return results;
  };

  const [allFees, allCanteen] = await Promise.all([
    fetchInChunks('rehab_fees', patientIds),
    fetchInChunks('rehab_canteen', patientIds)
  ]);
  
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
  
  const summary = patients.map(p => {
    const pFees = feesByPatient[p.id] || [];
    const pCanteen = canteenByPatient[p.id] || [];
    
    const safeToDate = (val: any): Date => {
      if (!val) return new Date();
      if (typeof val.toDate === 'function') return val.toDate();
      if (typeof val.seconds === 'number') return new Date(val.seconds * 1000);
      if (typeof val._seconds === 'number') return new Date(val._seconds * 1000);
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) return parsed;
      return new Date();
    };

    const admission = toDate(p.admissionDate);
    const endDate = p.isActive === false && p.dischargeDate
      ? toDate(p.dischargeDate)
      : new Date();
    
    const diffMs = endDate.getTime() - admission.getTime();
    const daysStayed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const dailyRate = Math.round((p.packageAmount || 0) / 30);

    // Calculate billable months for active stay
    const rawMonths = (endDate.getFullYear() - admission.getFullYear()) * 12 + (endDate.getMonth() - admission.getMonth());
    let completedMonths = rawMonths;
    let hasExtraDays = false;

    if (endDate.getDate() < admission.getDate()) {
      completedMonths = rawMonths - 1;
      hasExtraDays = true;
    } else if (endDate.getDate() > admission.getDate()) {
      completedMonths = rawMonths;
      hasExtraDays = true;
    } else {
      completedMonths = rawMonths;
      hasExtraDays = false;
    }

    const billableMonths = Math.max(1, completedMonths + (hasExtraDays ? 1 : 0));
    const currentStayPackage = billableMonths * (p.packageAmount || p.monthlyPackage || 0);

    let historicalStayPackage = 0;
    const history = (p as any).rejoinHistory || [];
    history.forEach((stay: any) => {
      const sAdmission = safeToDate(stay.admissionDate);
      const sDischarge = stay.dischargeDate ? safeToDate(stay.dischargeDate) : new Date();
      const sMonthlyPkg = Number(stay.monthlyPackage || stay.packageAmount || 0);

      const sRawMonths = (sDischarge.getFullYear() - sAdmission.getFullYear()) * 12 + (sDischarge.getMonth() - sAdmission.getMonth());
      let sCompletedMonths = sRawMonths;
      let sHasExtraDays = false;

      if (sDischarge.getDate() < sAdmission.getDate()) {
        sCompletedMonths = sRawMonths - 1;
        sHasExtraDays = true;
      } else if (sDischarge.getDate() > sAdmission.getDate()) {
        sCompletedMonths = sRawMonths;
        sHasExtraDays = true;
      } else {
        sCompletedMonths = sRawMonths;
        sHasExtraDays = false;
      }

      const sBillableMonths = Math.max(1, sCompletedMonths + (sHasExtraDays ? 1 : 0));
      historicalStayPackage += sBillableMonths * sMonthlyPkg;
    });

    const totalFees = currentStayPackage + historicalStayPackage;
    const otherExpenses = p.otherExpenses || 0;
    const totalDues = totalFees + otherExpenses;
    
    const totalReceived = Number((p as any).totalReceived || (p as any).overallReceived || 0);
    
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
      isActive: p.isActive,
      rejoinHistory: (p as any).rejoinHistory || []
    };
  });

  setCached(cacheKey, summary, 180); // 3 min cache
  return summary;
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
