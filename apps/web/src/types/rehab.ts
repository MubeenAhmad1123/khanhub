export type RehabRole = 'family' | 'staff' | 'cashier' | 'admin' | 'superadmin';

export interface RehabUser {
  uid: string;
  customId: string;         // e.g. "REHAB-FAM-001", "REHAB-STAFF-003"
  role: RehabRole;
  displayName: string;
  patientId?: string;       // only for family role
  createdAt: Date;
  isActive: boolean;
}

export interface Patient {
  id: string;
  name: string;
  photoUrl?: string;
  admissionDate: Date;
  packageAmount: number;    // e.g. 60000 PKR/month
  diagnosis?: string;
  assignedStaffId?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface FeeRecord {
  id: string;
  patientId: string;
  month: string;            // "2025-01"
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
  category: string;   // 'patient_fee' | 'canteen' | 'rent' | 'electricity' | 'salary' | 'medicine' | 'other'
  amount: number;
  description: string;
  date: Date;
  cashierId: string;
  patientId?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  photoUrl?: string;
  salary: number;
  phone?: string;
  joiningDate: Date;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;       // "2025-01-15"
  status: 'present' | 'absent' | 'leave';
  checkInTime?: Date;
  overriddenBy?: string;
}

// FIRESTORE COLLECTIONS:
// rehab_users        — all portal users (family, staff, cashier, admin, superadmin)
// rehab_patients     — patient profiles
// rehab_fees         — monthly fee records per patient
// rehab_canteen      — monthly canteen wallet per patient
// rehab_videos       — videos uploaded per patient
// rehab_staff        — staff member profiles
// rehab_attendance   — daily attendance records
// rehab_transactions — all financial transactions (income + expenses)
