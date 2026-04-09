// src/types/spims.ts

import { Timestamp } from 'firebase/firestore';

export type SpimsRole = 'admin' | 'staff' | 'student' | 'cashier' | 'superadmin';

// ─── SPIMS USER (Auth) ───────────────────────────────────────────────────────

export interface SpimsUser {
  uid: string;
  customId: string;
  name?: string;
  displayName?: string;
  role: SpimsRole;
  isActive: boolean;
  /** Linked spims_students document id */
  studentId?: string | null;
  /** @deprecated migrated to studentId */
  patientId?: string | null;
  password?: string;
  createdAt?: Timestamp | Date;
}

// ─── SPIMS STUDENT (College admission record) ────────────────────────────────

export type SpimsStudentStatus =
  | 'Active'
  | 'Pass'
  | '1st Year Supply'
  | '2nd Year Supply'
  | 'Fail'
  | 'Left';

export type SpimsAnnualResult = 'Pass' | 'Fail' | 'Supply';

export type SpimsDegreeStatus = 'Not Applied' | 'Applied' | 'Received';

export type SpimsFeePaymentStatus =
  | 'pending_cashier'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'rejected_cashier';

export type SpimsFeePaymentType =
  | 'monthly'
  | 'admission'
  | 'registration'
  | 'examination'
  | 'other';

export const SPIMS_COURSES = [
  // Pharmacy
  'Pharm-D (Doctor of Pharmacy) — 5 Years',
  'Pharmacy Technician (Category-B) — 2 Years (Diploma)',

  // Nursing
  'BS Nursing — 4 Years',
  'Post-RN BSN — 2 Years',
  'LHV (Lady Health Visitor) — 2 Years (Diploma)',
  'CMW (Community Midwife) — 2 Years (Diploma)',
  'CNA (Certified Nursing Assistant) — 2 Years (Diploma)',

  // Allied Health Sciences & Technology (4 Years)
  'BS Optometry — 4 Years',
  'BS Forensic Science — 4 Years',
  'BS Clinical Psychology — 4 Years',
  'BS Human Nutrition & Dietetics — 4 Years',
  'BS Food Science & Technology — 4 Years',
  'BS Operation Theater Technology — 4 Years',
  'BS Cosmetology & Dermatological — 4 Years',
  'BS Medical Laboratory Technology — 4 Years',
  'BS Radiology & Imaging Technology — 4 Years',

  // Physical Therapy
  'DPT (Doctor of Physical Therapy) — 5 Years',

  // FSC Paramedical Courses (2 Years)
  'Dispenser — 2 Years (Diploma, equal to FSC Pre-Medical)',
  'Operation Theater Technician — 2 Years (Diploma, equal to FSC Pre-Medical)',
  'Medical Laboratory Technician — 2 Years (Diploma, equal to FSC Pre-Medical)',
  'Radiography & Imaging Technician — 2 Years (Diploma, equal to FSC Pre-Medical)',
  'Dental Technician — 2 Years (Diploma)',
  'Dialysis Technician — 2 Years (Diploma)',
  'Anesthesia Technician — 2 Years (Diploma)',
] as const;

export interface SpimsStudent {
  id: string;

  // Personal
  rollNo: string;
  name: string;
  fatherName: string;
  cnic: string;
  contact: string;
  fatherContact: string;
  address: string;
  dateOfBirth: Timestamp | Date | string;
  studentOccupation?: string;
  fatherOccupation?: string;
  photoUrl?: string;

  // Academic (Matric / Inter)
  qualification: 'Matric' | 'Inter';
  subjectPhysics_marks: number;
  subjectChemistry_marks: number;
  subjectBiology_marks: number;
  board: string;
  totalMarks: number;
  percentage: number;

  // Course
  course: string;
  session: string;
  admissionDate: Timestamp | Date;
  status: SpimsStudentStatus;

  // Fee structure (set at admission)
  totalPackage: number;
  monthlyFee: number;
  admissionFee: number;
  registrationFee: number;
  examinationFee: number;
  admissionFeePaid: number;
  registrationFeePaid: number;
  examinationFeePaid: number;
  /** Sum of all approved fee payments toward package */
  totalReceived: number;
  /** totalPackage - totalReceived (maintained on approve) */
  remaining: number;

  // Optional dates when initial portions were marked paid at admission
  admissionFeePaidOn?: Timestamp | Date | null;
  registrationFeePaidOn?: Timestamp | Date | null;
  examinationFeePaidOn?: Timestamp | Date | null;

  // Referral
  referredBy?: string;
  referralSheetAmount?: number;

  // Year 1 exams
  year1_rollNo?: string;
  year1_examDate?: Timestamp | Date | null;
  year1_annualResult?: string;
  year1_supplementaryResult1?: string;
  year1_supplementaryResult2?: string;
  year1_passDate?: Timestamp | Date | null;

  // Year 2 exams
  year2_rollNo?: string;
  year2_examDate?: Timestamp | Date | null;
  year2_annualResult?: string;
  year2_supplementaryResult1?: string;
  year2_supplementaryResult2?: string;
  year2_passDate?: Timestamp | Date | null;

  degreeStatus?: SpimsDegreeStatus;

  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
}

/** One row in spims_fees (monthly / fee ledger) */
export interface SpimsFeePayment {
  id: string;
  studentId: string;
  studentName: string;
  course: string;
  session: string;
  date: Timestamp | Date;
  amount: number;
  remaining: number;
  receivedBy: string;
  type: SpimsFeePaymentType;
  note?: string;
  status: SpimsFeePaymentStatus;
  createdBy: string;
  createdAt: Timestamp | Date;
  /** Linked HQ workflow doc when routed through Cashier Station */
  linkedTransactionId?: string | null;
}

/** Uploaded files for Documents tab — collection spims_student_documents */
export interface SpimsStudentDocument {
  id: string;
  studentId: string;
  title: string;
  fileUrl: string;
  createdAt: Timestamp | Date;
  createdBy?: string;
}

/** Aggregate shape used by FeeTracker.tsx */
export interface SpimsFeeTrackerRecord {
  totalPaid: number;
  totalCourseFee: number;
  totalRemaining: number;
  payments: { amount: number; date: Timestamp | Date; paymentType: string }[];
}

export interface Transaction {
  id: string;
  patientId?: string;
  patientName?: string;
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

// ─── PATIENT (Full Admission Form Data) ─────────────────────────────────────

export interface Patient {
  id: string;

  // Basic Identity
  inpatientNumber: string;         // e.g. "SPIMS-058"
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
// Collection: spims_daily_activities

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
// Collection: spims_therapy_sessions

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
// Collection: spims_medication_records

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
// Collection: spims_weekly_progress

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
// Collection: spims_fees

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
// Collection: spims_canteen

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
  employeeId: string;           // e.g. "SPIMS-STF-001"
  designation: string;          // e.g. "Counselor", "Security Guard", "Nurse"
  department: 'spims';          // for now always spims
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
  loginUserId?: string;         // uid in spims_users for portal login
  role: SpimsRole;              // used for UI role indicators
  customId?: string;            // unique staff identifier
  createdAt: string;            // ISO
  createdBy?: string;           // manager uid
}

// ─── DAILY DUTY LOG ────────────────────────────────────────────────────────────
// One doc per staff per date
// Collection: spims_duty_logs

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
// Collection: spims_dress_logs

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
// Collection: spims_growth_points
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

