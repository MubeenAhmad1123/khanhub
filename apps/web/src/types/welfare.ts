// src/types/welfare.ts

import { Timestamp } from 'firebase/firestore';

export type WelfareRole = 'admin' | 'staff' | 'family' | 'donor' | 'cashier' | 'superadmin';

// ─── WELFARE USER ─────────────────────────────────────────────────────────────

export interface WelfareUser {
  uid: string;
  customId: string;
  name: string;
  displayName?: string;
  role: WelfareRole;
  isActive: boolean;
  childId?: string;       // for family role
  donorId?: string;       // for donor role
  createdAt?: Timestamp | Date;
}

// ─── DONOR ────────────────────────────────────────────────────────────────────
// Collection: welfare_donors

export interface Donor {
  id: string;
  donorNumber: string;          // e.g. "WLF-DNR-001"
  serialNumber: number;
  fullName: string;
  fatherName?: string;
  cnic?: string;                // "XXXXX-XXXXXXX-X"
  contactNumber: string;
  whatsappNumber?: string;
  address?: string;
  email?: string;

  // Donation Preference
  donationScope: 'whole_welfare' | 'specific_child';
  linkedChildId?: string;       // set if donationScope === 'specific_child'
  linkedChildName?: string;     // denormalized for display

  donationType: 'monthly_retainer' | 'one_time' | 'variable';
  monthlyAmount?: number;       // set if donationType === 'monthly_retainer'
  notes?: string;

  isActive: boolean;
  loginUserId?: string;         // uid in welfare_users if they have portal login
  createdAt: Timestamp | Date;
  createdBy?: string;
}

// ─── CHILD (Welfare Children's Home Admission) ────────────────────────────────
// Collection: welfare_children

export interface Child {
  id: string;

  // Identity
  admissionNumber: string;          // e.g. "WLF-058"
  serialNumber: number;
  name: string;
  fatherName: string;
  motherName?: string;
  dateOfBirth?: string;             // "YYYY-MM-DD"
  age?: number;
  gender: 'male' | 'female';
  photoUrl?: string;

  // Background
  religion?: string;
  caste?: string;
  address?: string;
  city?: string;
  district?: string;

  // Education
  educationLevel?: 'none' | 'primary' | 'middle' | 'secondary' | 'higher_secondary' | 'other';
  currentClass?: string;            // e.g. "Class 5"
  school?: string;

  // Parent / Guardian Status
  fatherStatus: 'alive' | 'deceased' | 'unknown';
  motherStatus: 'alive' | 'deceased' | 'unknown';
  parentsSeparated?: boolean;
  guardianName?: string;
  guardianRelationship?: string;   // e.g. "Uncle", "Maternal Aunt"
  contactNumber: string;
  whatsappNumber?: string;

  // Admission Reason
  reasonForAdmission?: string;     // free text — why they're in welfare home
  admissionCategory?: 'orphan' | 'semi_orphan' | 'destitute' | 'abandoned' | 'other';

  // Health
  healthCondition?: 'healthy' | 'minor_issues' | 'chronic_condition' | 'disability';
  healthNotes?: string;
  hasDisability?: boolean;
  disabilityDetails?: string;
  bloodGroup?: string;

  // Admission Details
  admissionDate: Timestamp | Date;
  durationMonths: number;           // planned stay duration
  packageAmount: number;            // monthly support cost in PKR (internal — not paid by child)
  otherExpenses?: number;

  // Sponsor / Donor link
  sponsorDonorId?: string;          // if a specific donor sponsors this child
  sponsorDonorName?: string;        // denormalized

  // Status
  isActive: boolean;
  dischargeDate?: Timestamp | Date;
  dischargeReason?: string;
  assignedStaffId?: string;
  createdAt: Timestamp | Date;
  createdBy?: string;
}

// ─── DAILY ACTIVITIES ─────────────────────────────────────────────────────────
// Collection: welfare_daily_activities

export const DAILY_ACTIVITIES = [
  { id: 1,  name: 'Fajar Prayer' },
  { id: 2,  name: 'Tilawat-e-Quran' },
  { id: 3,  name: 'Morning Exercise' },
  { id: 4,  name: 'Shower & Hygiene' },
  { id: 5,  name: 'Breakfast' },
  { id: 6,  name: 'Morning Medication' },
  { id: 7,  name: 'School / Study Time' },
  { id: 8,  name: 'Islamic Lecture' },
  { id: 9,  name: 'Zohar Prayer' },
  { id: 10, name: 'Lunch' },
  { id: 11, name: 'Rest / Nap' },
  { id: 12, name: 'Asar Prayer' },
  { id: 13, name: 'Play / Recreation' },
  { id: 14, name: 'Homework / Tuition' },
  { id: 15, name: 'Dars-e-Quran' },
  { id: 16, name: 'Maghrib Prayer' },
  { id: 17, name: 'Dinner' },
  { id: 18, name: 'Night Medication' },
  { id: 19, name: 'Isha Prayer' },
  { id: 20, name: 'Sleep' },
] as const;

export type ActivityStatus = 'done' | 'not_done' | 'na';

export interface DailyActivityRecord {
  id: string;
  childId: string;
  date: string;
  activities: {
    activityId: number;
    status: ActivityStatus;
    note?: string;
  }[];
  generalNotes?: string;
  markedBy: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// ─── THERAPY / COUNSELLING SESSIONS ──────────────────────────────────────────
// Collection: welfare_therapy_sessions

export interface TherapySession {
  id: string;
  childId: string;
  sessionNumber: number;
  date: string;
  therapistName?: string;
  sessionNotes: string;
  childMood?: string;
  progressRating?: 1 | 2 | 3 | 4;
  createdBy: string;
  createdAt: Timestamp | Date;
}

// ─── MEDICATION RECORDS ───────────────────────────────────────────────────────
// Collection: welfare_medication_records

export interface MedicationRecord {
  id: string;
  childId: string;
  date: string;
  timing: string;
  medications: string;
  notes?: string;
  createdBy: string;
  createdAt: Timestamp | Date;
}

// ─── WEEKLY PROGRESS ──────────────────────────────────────────────────────────
// Collection: welfare_weekly_progress

export interface WeeklyProgress {
  id: string;
  childId: string;
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  score: 1 | 2 | 3 | 4;
  notes?: string;
  createdBy: string;
  createdAt: Timestamp | Date;
}

// ─── TRANSACTION ──────────────────────────────────────────────────────────────
// Collection: welfare_transactions

export interface Transaction {
  id: string;
  childId?: string;
  childName?: string;
  donorId?: string;
  donorName?: string;
  staffId?: string;
  staffName?: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categoryName?: string;
  txnDescription?: string;
  // Donation-specific
  donationScope?: 'whole_welfare' | 'specific_child';
  donationType?: 'monthly_retainer' | 'one_time' | 'variable';
  donationMonth?: string;           // "2026-04" — for monthly retainer tracking
  status: 'pending_cashier' | 'rejected_cashier' | 'pending' | 'approved' | 'rejected';
  createdBy?: string;
  createdByName?: string;
  cashierId?: string;
  cashierName?: string;
  proofUrl?: string;
  proofMissingReason?: string;
  proofRequired?: boolean;
  approvedBy?: string;
  approvedAt?: Timestamp | Date;
  date: Date | Timestamp;
  createdAt?: Timestamp | Date;
}

// ─── FEE RECORD ───────────────────────────────────────────────────────────────
// Collection: welfare_fees

export interface FeeRecord {
  id: string;
  childId: string;
  month: string;
  packageAmount: number;
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

// ─── CANTEEN ──────────────────────────────────────────────────────────────────
// Collection: welfare_canteen

export interface CanteenRecord {
  id: string;
  childId: string;
  month: string;
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

// ─── STAFF TYPES (keep existing — no change needed) ───────────────────────────

export type StaffGender = 'male' | 'female';

export interface DressCodeItem {
  id: string;
  name: string;
  required: boolean;
  isCustom: boolean;
}

export interface StaffDutyAssigned {
  id: string;
  name: string;
  description?: string;
  assignedAt: string;
  assignedBy: string;
  isActive: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  fatherName: string;
  employeeId: string;
  designation: string;
  department: 'welfare';
  gender: StaffGender;
  phone?: string;
  photoUrl?: string;
  dutyStartTime: string;
  dutyEndTime: string;
  dressCode: DressCodeItem[];
  duties: StaffDutyAssigned[];
  salary: number;
  isActive: boolean;
  joiningDate: string;
  loginUserId?: string;
  role: WelfareRole;
  customId?: string;
  createdAt: string;
  createdBy?: string;
}

export interface StaffContribution {
  id: string;
  staffId: string;
  date: string;
  content?: string;
  description?: string;
  contributionDescription?: string;
  isApproved?: boolean;
  approvedBy?: string;
  approvedAt?: any;
  createdAt: any;
  points?: number;
  type?: 'service' | 'creative' | 'other';
}

export interface DailyDutyLog {
  id: string;
  staffId: string;
  date: string;
  duties: { dutyId: string; dutyName: string; status: 'done' | 'not_done' | 'na'; note?: string }[];
  totalItems?: number;
  completedItems?: number;
  items?: { description: string; completed: boolean }[];
  overallPerformanceNote?: string;
  markedBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DailyDressLog {
  id: string;
  staffId: string;
  date: string;
  items: { itemId: string; itemName: string; wearing: boolean }[];
  isPerfect?: boolean;
  remarks?: string;
  markedBy: string;
  createdAt: any;
}

export interface MonthlyGrowthPoints {
  id: string;
  staffId: string;
  month: string;
  attendance: number;
  punctuality: number;
  duties: number;
  dressCode: number;
  contributions: number;
  extra: number;
  total: number;
  totalPossible: number;
  percentage: number;
  lastCalculatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  status: 'present' | 'absent' | 'leave';
  arrivalTime?: string;
  departureTime?: string;
  isLate?: boolean;
  leftEarly?: boolean;
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
