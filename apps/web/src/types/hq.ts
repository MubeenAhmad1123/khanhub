export type HqRole = 'superadmin' | 'manager' | 'cashier';

export interface HqUser {
  uid: string;
  customId: string;
  name: string;
  role: HqRole;
  password: string;
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
}

export interface HqMeta {
  completed: boolean;
  completedAt?: string;
  superadminId?: string;
}

export interface HqStaff {
  id: string;
  employeeId: string;
  name: string;
  fatherName: string;
  designation: string;
  department: 'rehab' | 'spims' | 'hq';
  cnic: string;
  phone: string;
  address: string;
  joiningDate: string;
  dutyStart: string;
  dutyEnd: string;
  monthlySalary: number;
  gender: 'male' | 'female';
  photoUrl?: string;
  isActive: boolean;
  createdAt: string;
  loginUserId?: string;
}

export interface HqAttendance {
  id: string;
  staffId: string;
  date: string;
  arrivalTime?: string;
  departureTime?: string;
  status: 'present' | 'absent' | 'leave';
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
  dept: 'rehab' | 'spims';
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  patientId?: string;
  patientName?: string;
  studentId?: string;
  studentName?: string;
  note?: string;
  cashierId: string;
  cashierName: string;

  // Workflow
  workflowStage: 'pending_cashier' | 'pending' | 'approved' | 'rejected';
  status: 'pending_cashier' | 'pending' | 'approved' | 'rejected';

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
  /** Number of working days in the month */
  workingDays: number;
  /** Number of days staff was present */
  presentDays: number;
  /** Number of absent days (unauthorised) */
  absentDays: number;
  /** Number of approved leave days */
  leaveDays: number;
  /** Total deduction = absentDays * ABSENTEE_DEDUCTION_PER_DAY */
  absentDeduction: number;
  /** Any additional bonuses or overtime */
  bonus: number;
  /** Any other approved deductions */
  otherDeductions: number;
  /** Net payable = basicSalary – absentDeduction – otherDeductions + bonus */
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
  status: 'present' | 'absent' | 'leave' | 'unmarked';
  arrivalTime?: string;   // 'HH:MM'
  departureTime?: string; // 'HH:MM'
  isLate?: boolean;
  markedBy?: string;
  markedByName?: string;
  updatedAt?: string;
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
  sourceCollection: 'rehab_transactions' | 'spims_transactions';
  sourceTxId: string;
  departmentCode: 'rehab' | 'spims';
  entityType: 'patient' | 'student' | 'staff' | 'general';
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