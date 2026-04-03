// src/types/rehab.ts
import { Timestamp } from 'firebase/firestore';

export type RehabRole = 'admin' | 'staff' | 'family';

export interface RehabUser {
  uid: string;
  customId: string;
  role: RehabRole;
  displayName: string;
  patientId?: string;
  createdAt: Timestamp | Date;
  isActive: boolean;
}

export interface Patient {
  id: string;
  name: string;
  fatherName: string;
  cnic?: string;
  phone?: string;
  address?: string;
  photoUrl?: string;
  admissionDate: Timestamp | Date;
  packageAmount: number;
  diagnosis?: string;
  addictionType?: string;
  assignedStaffId?: string;
  isActive: boolean;
  createdAt: Timestamp | Date;
  dailySchedule?: DailyActivity[];
}

export interface DailyActivity {
  id: string;
  name: string;           // e.g. "Fajr Prayer", "Therapy Session"
  time: string;           // "05:00"
  days: ('mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun')[];
  isCompleted?: boolean;  // for today's tracking
  notes?: string;
}

export interface FeeRecord {
  id: string;
  patientId: string;
  month: string;
  packageAmount: number;
  amountPaid: number;
  amountRemaining: number;
  payments: Payment[];
}

export interface CanteenRecord {
  id: string;
  patientId: string;
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
  date: Date;
  cashierId: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: Date;
  cashierId: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: Date;
  cashierId: string;
  patientId?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
}

export interface StaffDuty {
  id: string;
  description: string; // e.g. "Clean all rooms daily before 8am"
}

export interface StaffFine {
  id: string;
  staffId: string;
  amount: number;
  reason: string;
  date: string;       // "2025-01"
  recordedBy: string; // admin uid
  createdAt: Date;
}

export interface LeaveRecord {
  id: string;
  staffId: string;
  fromDate: string;   // "2025-01-10"
  toDate: string;     // "2025-01-12"
  days: number;
  reason: string;
  type: 'paid' | 'unpaid';
  recordedBy: string; // admin uid
  createdAt: Date;
}

export interface StaffContribution {
  id: string;
  staffId: string;
  date: string;       // "2025-01-15"
  content: string;    // what they did / idea / feedback
  createdAt: Date;
}

export interface StaffMember {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  role: string;           // department role e.g. "Counselor"
  duties: StaffDuty[];    // list of assigned duties
  photoUrl?: string;
  salary: number;         // monthly salary in PKR
  phone?: string;
  joiningDate: Date;
  isActive: boolean;
  loginUserId?: string;   // uid in rehab_users (for login link)
  dutyStartTime: string;   // "08:00" — 24hr format HH:MM
  dutyEndTime: string;     // "20:00" — 24hr format HH:MM
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;           // "2025-01-15"
  status: 'present' | 'absent' | 'leave';
  checkInTime?: Date;
  checkOutTime?: Date;
  overriddenBy?: string;
  isLate?: boolean;        // true if checked in after dutyStartTime
  lateByMinutes?: number;  // how many minutes late
  autoFineApplied?: boolean; // true if 200 PKR fine was auto-created
}

// Salary calculation helper (use in reports)
// dailyRate = salary / workingDaysInMonth (default 26)
// netSalary = salary - (absentDays * dailyRate) - totalFines

// FIRESTORE COLLECTIONS:
// rehab_users         — all portal users
// rehab_patients      — patient profiles
// rehab_fees          — monthly fee records per patient
// rehab_canteen       — monthly canteen wallet per patient
// rehab_videos        — videos uploaded per patient
// rehab_staff         — staff member profiles
// rehab_attendance    — daily attendance records
// rehab_transactions  — all financial transactions
// rehab_fines         — staff fine records
// rehab_leaves        — staff leave records
// rehab_contributions — staff daily contributions/feedback
