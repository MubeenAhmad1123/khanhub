// src/types/rehab.ts

import { Timestamp } from 'firebase/firestore';

export type RehabRole = 'admin' | 'staff' | 'family';

// ─── PATIENT (Full Admission Form Data) ─────────────────────────────────────

export interface Patient {
  id: string;

  // Basic Identity
  inpatientNumber: string;         // e.g. "REHAB-058"
  serialNumber: number;            // 58, 60, 61 etc from records
  name: string;
  fatherName: string;
  dateOfBirth?: string;            // "YYYY-MM-DD"
  age?: number;
  gender: 'male' | 'female' | 'other';
  ethnicity?: string;
  photoUrl?: string;

  // Education & Work
  education?: string;
  institution?: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  profession?: string;
  employerInfo?: string;
  income?: string;

  // Addiction Info
  substanceOfAddiction: string;    // main substance
  presentingComplaints?: string;
  averageDailyIntake?: string;
  durationOfUse?: string;

  // Previous Treatment
  previousTreatmentDuration?: string;
  previousHospital?: string;

  // Location
  townPoliceStation?: string;
  address?: string;

  // Guardian / Family Contact
  guardianName: string;
  guardianRelationship: string;
  contactNumber: string;
  whatsappNumber?: string;
  nameOfVisitors?: string;

  // Admission Details
  admissionDate: Timestamp | Date;
  timeOfAdmission?: string;        // "14:30"
  typeOfFacility?: string;
  durationOfCurrentTreatment?: string;  // "3 months"
  durationMonths: number;          // 1, 2, 3, 4 — for fee calculation

  // Financial
  packageAmount: number;           // monthly PKR fee (Total PKG)
  otherExpenses?: number;          // extra charges like transport

  // Health Status
  healthStatus?: {
    hasAsthma?: boolean;
    hasFits?: boolean;
    otherCondition?: string;
    majorIllnessLast12Months?: boolean;
    majorIllnessDetails?: string;
    hivStatus?: 'positive' | 'negative' | 'not_known';
    hbsagStatus?: 'positive' | 'negative' | 'not_known';
    hcvStatus?: 'positive' | 'negative' | 'not_known';
    tbStatus?: 'positive' | 'negative' | 'not_known';
    stiStatus?: 'positive' | 'negative' | 'not_known';
    hasDisability?: boolean;
    disabilityCondition?: string;
    everHospitalized?: boolean;
    hospitalizationReason?: string;
    hasBloodDonation?: boolean;
  };

  // Psychiatric Evaluation
  psychiatricEvaluation?: {
    generalAptitude?: string;
    thoughtDisorder?: boolean;
    moodEmotions?: string[];       // ['high', 'fear', 'appropriate', ...]
    obsessiveThoughts?: boolean;
    hallucinations?: boolean;
    delusions?: boolean;
    insights?: boolean;
    insightsDetails?: string;
    attentionConcentration?: string;
    memory?: string;
    intelligence?: string;
    feelings?: string;
    sensing?: string;
    intuition?: string;
  };

  // Psychological Assessment
  psychologicalAssessment?: {
    physicalCondition?: string;
    bodyAches?: string;
    relapseAfterWeeks?: number;
    abilityToSleep?: string;
    mentalConditionOthers?: string;
    problemsWithSpouse?: string;
    problemsWithParents?: string;
    problemsWithSiblings?: string;
  };

  // Status
  isActive: boolean;
  dischargeDate?: Timestamp | Date;
  dischargeReason?: string;
  assignedStaffId?: string;
  createdAt: Timestamp | Date;
  createdBy?: string;               // admin uid who created
}

// ─── DAILY ACTIVITY RECORD ───────────────────────────────────────────────────
// One document per patient per date
// Collection: rehab_daily_activities

export const DAILY_ACTIVITIES = [
  { id: 1,  name: 'Fajar Prayer' },
  { id: 2,  name: 'Tilawat-e-Quran' },
  { id: 3,  name: 'Morning Fitness Exercise' },
  { id: 4,  name: 'Shower' },
  { id: 5,  name: 'Break Fast' },
  { id: 6,  name: 'Morning Medication' },
  { id: 7,  name: 'Islamic Lecture' },
  { id: 8,  name: 'Counselling Session' },
  { id: 9,  name: 'Zohar Prayer' },
  { id: 10, name: 'Lunch' },
  { id: 11, name: 'Vital Sign Check' },
  { id: 12, name: 'Day Medication' },
  { id: 13, name: 'Game' },
  { id: 14, name: 'Exercise' },
  { id: 15, name: 'Dars-e-Quran' },
  { id: 16, name: 'Asar Prayer' },
  { id: 17, name: 'Maghrib Prayer' },
  { id: 18, name: 'Dinner' },
  { id: 19, name: 'Night Medication' },
  { id: 20, name: 'Isha Prayer' },
  { id: 21, name: 'Sleep' },
] as const;

export type ActivityStatus = 'done' | 'not_done' | 'na';

export interface DailyActivityRecord {
  id: string;
  patientId: string;
  date: string;                    // "YYYY-MM-DD"
  activities: {
    activityId: number;
    status: ActivityStatus;        // 'done' | 'not_done' | 'na'
    note?: string;                 // optional note per activity
  }[];
  counsellingSessionNotes?: string; // text area for counselling session (#8)
  vitalSignNotes?: string;          // notes for vital sign check (#11)
  markedBy: string;                 // admin uid
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// ─── INDIVIDUAL THERAPY SESSION ───────────────────────────────────────────────
// Collection: rehab_therapy_sessions

export interface TherapySession {
  id: string;
  patientId: string;
  sessionNumber: number;           // 1, 2, 3, 4, 5, 6, 7...
  date: string;                    // "YYYY-MM-DD"
  therapistName?: string;
  clinicalPsychologist?: string;
  sessionNotes: string;            // main text area — what happened in session
  patientMood?: string;
  progressRating?: 1 | 2 | 3 | 4; // 1=Static, 2=Slow, 3=Good, 4=Max
  createdBy: string;               // admin uid
  createdAt: Timestamp | Date;
}

// ─── MEDICATION ASSISTED THERAPY ─────────────────────────────────────────────
// Collection: rehab_medication_records

export interface MedicationRecord {
  id: string;
  patientId: string;
  date: string;                    // "YYYY-MM-DD"
  timing: string;                  // "Morning", "Afternoon", "Night"
  medications: string;             // list of meds as text
  notes?: string;
  medicalOfficerSig?: string;      // name of medical officer
  dispenserSig?: string;           // name of dispenser
  createdBy: string;
  createdAt: Timestamp | Date;
}

// ─── WEEKLY PROGRESS RECORD ───────────────────────────────────────────────────
// Collection: rehab_weekly_progress

export interface WeeklyProgress {
  id: string;
  patientId: string;
  weekNumber: number;              // 1, 2, 3, 4...
  weekStartDate: string;           // "YYYY-MM-DD"
  weekEndDate: string;             // "YYYY-MM-DD"
  score: 1 | 2 | 3 | 4;           // 1=Static, 2=Slow Progress, 3=Good Progress, 4=Max Progress
  notes?: string;
  createdBy: string;
  createdAt: Timestamp | Date;
}

// ─── FEE RECORD (already exists, keep compatible) ────────────────────────────
// Collection: rehab_fees

export interface FeeRecord {
  id: string;
  patientId: string;
  month: string;                   // "2025-01"
  packageAmount: number;           // monthly fee
  amountPaid: number;
  amountRemaining: number;
  payments: Payment[];
}

export interface Payment {
  id: string;
  amount: number;
  date: Timestamp | Date;
  cashierId: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
}

// ─── CANTEEN RECORD (already exists, keep compatible) ────────────────────────
// Collection: rehab_canteen

export interface CanteenRecord {
  id: string;
  patientId: string;
  month: string;                   // "2025-01"
  totalDeposited: number;
  totalSpent: number;
  balance: number;
  transactions: CanteenTransaction[];
}

export interface CanteenTransaction {
  id: string;
  type: 'deposit' | 'expense';
  amount: number;
  description: string;
  date: Timestamp | Date;
  cashierId: string;
}

export interface StaffMember {
  id: string;
  name?: string;
  gender?: string;
  role?: string;
  phone?: string;
  salary?: number;
  joiningDate?: Timestamp | Date;
  isActive?: boolean;
  photoUrl?: string;
  [key: string]: any;
}

export interface AttendanceRecord {
  id: string;
  staffId?: string;
  date?: string;
  status?: 'present' | 'absent' | 'leave';
  checkInTime?: any;
  [key: string]: any;
}

export interface StaffFine {
  id: string;
  staffId?: string;
  amount?: number;
  reason?: string;
  date?: any;
  createdAt?: any;
  [key: string]: any;
}

export interface LeaveRecord {
  id: string;
  staffId?: string;
  startDate?: any;
  endDate?: any;
  type?: string;
  status?: string;
  [key: string]: any;
}
