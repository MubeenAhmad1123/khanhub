import { StaffDept } from "@/lib/hq/superadmin/staff";

export type HqRole = 'superadmin' | 'manager' | 'cashier';

export interface HqUser {
  uid: string;
  customId: string;
  name: string;
  role: HqRole;
  email: string;
  phone?: string;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

export interface HqSession {
  uid: string;
  customId: string;
  name: string;
  displayName?: string;
  role: HqRole;
  loginTime: number;
  portal?: string;
  email?: string;
}

export interface HqMeta {
  completed: boolean;
  completedAt?: string;
  superadminId?: string;
}

export interface HqStaff {
  id: string;
  employeeId: string; // The "Employee ID" the user wants to see/edit
  name: string;
  fatherName?: string;
  designation: string;
  department: StaffDept; // Primary department
  secondaryDepts?: StaffDept[]; // For multi-department support
  cnic: string;
  phone: string;
  address: string;
  dob?: string;
  gender: 'male' | 'female' | 'other';
  bloodGroup?: string;
  emergencyContact?: string;
  joiningDate: string;
  dutyStart: string; // 'HH:MM'
  dutyEnd: string;   // 'HH:MM'
  monthlySalary: number;
  photoUrl?: string;
  isActive: boolean;
  createdAt: string;
  loginUserId?: string;
  basicInfoExtras?: Record<string, string>; // For "any custom field as well"
}

export interface HqAttendance {
  id: string;
  staffId: string;
  date: string;
  arrivalTime?: string;
  departureTime?: string;
  status: 'present' | 'absent' | 'leave' | 'paid_leave' | 'unpaid_leave';
  isLate: boolean;
  fine?: number;
  markedBy: string;
  createdAt: string;
}

export interface HqDressCode {
  id: string;
  staffId: string;
  date: string;
  items: { name: string; status: 'wearing' | 'not_wearing' | 'na' }[];
  markedBy: string;
  createdAt: string;
}

export interface HqDuty {
  id: string;
  staffId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface HqDutyLog {
  id: string;
  staffId: string;
  dutyId: string;
  dutyName: string;
  date: string;
  status: 'done' | 'not_done' | 'na';
  markedBy: string;
  createdAt: string;
}

export interface HqTransaction {
  id: string;
  dept: 'rehab' | 'spims' | 'job-center';
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  patientId?: string;
  patientName?: string;
  studentId?: string;
  studentName?: string;
  seekerId?: string;
  seekerName?: string;
  note?: string;
  cashierId: string;
  cashierName: string;

  // Workflow
  workflowStage: 'pending_cashier' | 'rejected_cashier' | 'pending' | 'approved' | 'rejected';
  status: 'pending_cashier' | 'rejected_cashier' | 'pending' | 'approved' | 'rejected';

  // Proof
  proofRequired?: boolean;
  proofUrl?: string;
  proofMissingReason?: string;
  proofMeta?: {
    fileType: string;
    size: number;
    uploadedAt: string;
    uploadedBy: string;
  };

  // Cashier forwarding
  cashierForwardedAt?: string;
  cashierForwardedBy?: string;
  cashierForwardedByName?: string;

  // Cashier rejection (before forwarding)
  cashierRejectedAt?: string;
  cashierRejectedBy?: string;
  cashierRejectedByName?: string;
  cashierRejectReason?: string;

  // Approval / rejection
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  // Idempotency guard
  processedAt?: string;
  processedBy?: string;

  date: string;
  createdAt: string;
  createdBy?: string;
}

// ─── Salary ───────────────────────────────────────────────────────────────────

/** Per-day salary deduction amount (PKR) for each day absent without approval. */
export const ABSENTEE_DEDUCTION_PER_DAY = 500;

/** A generated monthly salary slip for a staff member. */
export interface SalarySlip {
  id: string;
  staffId: string;
  employeeId: string;
  staffName: string;
  department: string;
  /** Format: 'YYYY-MM' */
  month: string;
  /** Basic salary amount (PKR) */
  basicSalary: number;
  /** Pro-rated basic based on presence */
  dailyWage: number;
  /** Number of working days in the month */
  workingDays: number;
  /** Number of days staff was present */
  presentDays: number;
  /** Number of absent days (unauthorised) */
  absentDays: number;
  /** Number of approved leave days */
  leaveDays: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  /** Total deduction = absentDays * ABSENTEE_DEDUCTION_PER_DAY */
  absentDeduction: number;
  /** Any additional bonuses or overtime */
  bonus: number;
  bonusReason?: string;
  /** Any other approved deductions */
  otherDeductions: number;
  deductionReason?: string;
  /** Net payable = ((basicSalary / 30) * presentDays) - otherDeductions + bonus */
  netSalary: number;
  /** 'draft' until approved by manager/superadmin */
  status: 'draft' | 'approved' | 'paid';
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  note?: string;
  createdAt: string;
  createdBy: string;
}

/** Summary view used in staff list tables */
export interface SalarySlipSummary {
  id: string;
  staffId: string;
  staffName: string;
  month: string;
  netSalary: number;
  status: SalarySlip['status'];
}

// ─── Monthly Attendance Grid ────────────────────────────────────────────────

export interface HqDailyAttendanceRecord {
  staffId: string;
  date: string; // 'YYYY-MM-DD'
  status: 'present' | 'absent' | 'leave' | 'unmarked' | 'paid_leave' | 'unpaid_leave';
  arrivalTime?: string;   // 'HH:MM'
  departureTime?: string; // 'HH:MM'
  isLate?: boolean;
  arrivedOnTime?: boolean;
  departedOnTime?: boolean;
  markedBy?: string;
  markedByName?: string;
  updatedAt?: string;
  note?: string;
}

export interface HqDailyDressCodeRecord {
  staffId: string;
  date: string; // 'YYYY-MM-DD'
  items: HqDressCodeItem[];
  growthPointAwarded?: boolean;
  markedBy?: string;
  updatedAt?: string;
}

export interface HqDressCodeItem {
  key: string;   // e.g. 'pant', 'shirt', 'shoes', 'id_card'
  label: string; // e.g. 'Dress Pant'
  status: 'yes' | 'no' | 'na';
}

export interface HqDailyDutyRecord {
  staffId: string;
  date: string;
  duties: HqDutyItem[];
  markedBy?: string;
  updatedAt?: string;
}

export interface HqDutyItem {
  key: string;
  label: string;
  status: 'done' | 'not_done' | 'na';
}

// Staff-level dress code config (set once, used every day)
export interface HqStaffDressCodeConfig {
  staffId: string;
  items: { key: string; label: string }[];
  updatedAt?: string;
}

// Staff-level duty config
export interface HqStaffDutyConfig {
  staffId: string;
  duties: { key: string; label: string }[];
  updatedAt?: string;
}

// ─── Canonical Ledger ────────────────────────────────────────────────────────

/**
 * Immutable ledger entry written on every superadmin approval.
 * Source of truth for all financial reports.
 * Never updated or deleted from client side.
 */
export interface HqLedgerEntry {
  id: string;
  sourceCollection: 'rehab_transactions' | 'spims_transactions' | 'jobcenter_transactions';
  sourceTxId: string;
  departmentCode: 'rehab' | 'spims' | 'job-center';
  entityType: 'patient' | 'student' | 'seeker' | 'staff' | 'general';
  entityId?: string;
  entityName?: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  cashierId: string;
  cashierName: string;
  approvedBy: string;
  approvedAt: string;
  proofUrl?: string;
  proofMissingReason?: string;
  date: string; // 'YYYY-MM-DD'
  createdAt: string;
}

// ─── Reconciliation ──────────────────────────────────────────────────────────

export interface HqReconciliation {
  id: string;
  date: string; // 'YYYY-MM-DD'
  cashierId: string;
  cashierName: string;
  openingBalance: number;
  totalInflow: number;
  totalOutflow: number;
  expectedClosing: number;
  actualClosing: number;
  variance: number;
  varianceNote?: string;
  status: 'submitted' | 'verified' | 'flagged';
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface HqSpecialTask {
  id?: string;
  staffId: string; // The user UID the task is assigned to
  description: string;
  status: 'assigned' | 'acknowledged' | 'completed';
  assignedBy: string; // manager/superadmin uid
  assignedByName?: string;
  createdAt: string; // ISO string 
  completedAt?: string; // ISO string
}