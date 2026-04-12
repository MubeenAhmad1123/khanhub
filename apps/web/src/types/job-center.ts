// src/types/job-center.ts

import { Timestamp } from 'firebase/firestore';

export type JobCenterRole = 'admin' | 'staff' | 'family' | 'cashier' | 'superadmin' | 'seeker';

// ─── JOBCENTER USER (Auth) ───────────────────────────────────────────────────────

export interface JobCenterUser {
  uid: string;
  customId: string;
  name: string;
  displayName?: string;
  role: JobCenterRole;
  isActive: boolean;
  seekerId?: string;
  createdAt?: Timestamp | Date;
}

export interface Transaction {
  id: string;
  seekerId?: string;
  seekerName?: string;
  staffId?: string;
  staffName?: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  txnDescription?: string;
  status: 'pending_cashier' | 'rejected_cashier' | 'pending' | 'approved' | 'rejected';
  createdBy?: string;
  createdByName?: string;
  cashierId?: string;
  cashierName?: string;
  proofUrl?: string;
  proofMissingReason?: string;
  proofRequired?: boolean;
  cashierRejectedAt?: Timestamp | Date;
  cashierRejectedBy?: string;
  cashierRejectedByName?: string;
  cashierRejectReason?: string;
  approvedBy?: string;
  approvedAt?: Timestamp | Date;
  date: Date | Timestamp;
  createdAt?: Timestamp | Date;
}

export interface StaffDuty {
  id: string;
  dutyDescription: string;
  startTime?: string;
  endTime?: string;
}

// Update StaffContribution to add approval:
export interface StaffContribution {
  id: string;
  staffId: string;
  date: string;                 // "YYYY-MM-DD"
  content?: string;             // support both 'content' and 'description'
  description?: string;
  contributionDescription?: string;
  isApproved?: boolean;         // undefined = pending, true = approved, false = rejected
  approvedBy?: string;          // manager uid
  approvedAt?: any;             // support Timestamp or string
  createdAt: any;               // support Timestamp or string
  points?: number;
  type?: 'service' | 'creative' | 'other';
}

// ─── SEEKER (Full Admission Form Data) ─────────────────────────────────────

export interface Seeker {
  id: string;

  // Basic Identity
  seekerNumber: string;            // e.g. "JOBCENTER-058"
  inpatientNumber?: string;        // Legacy field (Seeker Number preferred)
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
  previousCenter?: string;

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
// One document per seeker per date
// Collection: jobcenter_daily_activities

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
  seekerId: string;
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
// Collection: jobcenter_therapy_sessions

export interface TherapySession {
  id: string;
  seekerId: string;
  sessionNumber: number;           // 1, 2, 3, 4, 5, 6, 7...
  date: string;                    // "YYYY-MM-DD"
  therapistName?: string;
  clinicalPsychologist?: string;
  sessionNotes: string;            // main text area — what happened in session
  seekerMood?: string;
  progressRating?: 1 | 2 | 3 | 4; // 1=Static, 2=Slow, 3=Good, 4=Max
  createdBy: string;               // admin uid
  createdAt: Timestamp | Date;
}

// ─── MEDICATION ASSISTED THERAPY ─────────────────────────────────────────────
// Collection: jobcenter_medication_records

export interface MedicationRecord {
  id: string;
  seekerId: string;
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
// Collection: jobcenter_weekly_progress

export interface WeeklyProgress {
  id: string;
  seekerId: string;
  weekNumber: number;              // 1, 2, 3, 4...
  weekStartDate: string;           // "YYYY-MM-DD"
  weekEndDate: string;             // "YYYY-MM-DD"
  score: 1 | 2 | 3 | 4;           // 1=Static, 2=Slow Progress, 3=Good Progress, 4=Max Progress
  notes?: string;
  createdBy: string;
  createdAt: Timestamp | Date;
}

// ─── FEE RECORD (already exists, keep compatible) ────────────────────────────
// Collection: jobcenter_fees

export interface FeeRecord {
  id: string;
  seekerId: string;
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
// Collection: jobcenter_canteen

export interface CanteenRecord {
  id: string;
  seekerId: string;
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

// ─── STAFF MEMBER (Full Profile) ─────────────────────────────────────────────

export type StaffGender = 'male' | 'female';

export interface DressCodeItem {
  id: string;           // unique within this staff's dress code
  name: string;         // e.g. "Dress Pant", "Tie", "Employee Card", "Abaya"
  required: boolean;    // always true — all assigned items are required
  isCustom: boolean;    // false = from preset list, true = manually added
}

export interface StaffDutyAssigned {
  id: string;
  name: string;             // e.g. "Clean all rooms before 8am"
  description?: string;
  assignedAt: string;       // ISO date string
  assignedBy: string;       // manager uid
  isActive: boolean;        // can be deactivated without deletion
}

export interface StaffMember {
  id: string;

  // Basic Info
  name: string;
  fatherName: string;
  employeeId: string;           // e.g. "JOBCENTER-STF-001"
  designation: string;          // e.g. "Counselor", "Security Guard", "Nurse"
  department: 'job-center';          // for now always job-center
  gender: StaffGender;
  phone?: string;
  photoUrl?: string;

  // Duty Timing
  dutyStartTime: string;        // "08:00" 24hr
  dutyEndTime: string;          // "20:00" 24hr

  // Dress Code (assigned per staff, differs by gender + custom)
  dressCode: DressCodeItem[];

  // Duties (assigned list — manager adds/removes)
  duties: StaffDutyAssigned[];

  // Financial
  salary: number;               // monthly PKR

  // Status
  isActive: boolean;
  joiningDate: string;          // "YYYY-MM-DD"
  loginUserId?: string;         // uid in jobcenter_users for portal login
  role: JobCenterRole;              // used for UI role indicators
  customId?: string;            // unique staff identifier
  createdAt: string;            // ISO
  createdBy?: string;           // manager uid
}

// ─── DAILY DUTY LOG ────────────────────────────────────────────────────────────
// One doc per staff per date
// Collection: jobcenter_duty_logs

export interface DailyDutyLog {
  id: string;
  staffId: string;
  date: string;                 // "YYYY-MM-DD"
  duties: {
    dutyId: string;
    dutyName: string;
    status: 'done' | 'not_done' | 'na';
    note?: string;              // optional performance note per duty
  }[];
  // UI helper fields for summaries:
  totalItems?: number;
  completedItems?: number;
  items?: { description: string; completed: boolean }[]; // alias for component compatibility
  overallPerformanceNote?: string;  // manager's general note for the day
  markedBy: string;             // manager uid
  createdAt: string;
  updatedAt?: string;
}

// ─── DAILY DRESS CODE LOG ─────────────────────────────────────────────────────
// One doc per staff per date
// Collection: jobcenter_dress_logs

export interface DailyDressLog {
  id: string;
  staffId: string;
  date: string;                 // "YYYY-MM-DD"
  items: {
    itemId: string;
    itemName: string;
    wearing: boolean;           // true = wearing, false = not wearing
  }[];
  isPerfect?: boolean;
  remarks?: string;
  markedBy: string;
  createdAt: any;
}

// ─── MONTHLY GROWTH POINTS ────────────────────────────────────────────────────
// Auto-calculated and stored monthly
// Collection: jobcenter_growth_points
// One doc per staff per month

export interface MonthlyGrowthPoints {
  id: string;
  staffId: string;
  month: string;                // "2025-01"

  // Point breakdown (each = 0 or 1 per day, summed for month)
  attendance: number;           // +1 per day present
  punctuality: number;          // +1 per day on time (not late)
  duties: number;               // +1 per day all duties done
  dressCode: number;            // +1 per day full dress code followed
  contributions: number;        // points from approved contributions
  extra: number;                // bonus points from admin

  total: number;                // sum of all above
  totalPossible: number;        // max possible for the month
  percentage: number;           // total / totalPossible * 100

  lastCalculatedAt: string;     // ISO — recalculate on every mark action
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  status: 'present' | 'absent' | 'leave';
  arrivalTime?: string;        // "09:15" — 24hr
  departureTime?: string;      // "20:05"
  isLate?: boolean;            // auto: arrivalTime > dutyStartTime
  leftEarly?: boolean;         // auto: departureTime < dutyEndTime
  checkInTime?: any;
  checkOutTime?: any;
  lateByMinutes?: number;
  overriddenBy?: string;
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

