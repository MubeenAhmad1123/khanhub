export type RehabRole = 'family' | 'staff' | 'cashier' | 'admin' | 'superadmin';

export interface RehabUser {
  uid: string;
  customId: string;
  role: RehabRole;
  displayName: string;
  patientId?: string;
  createdAt: Date;
  isActive: boolean;
}

export interface Patient {
  id: string;
  name: string;
  photoUrl?: string;
  admissionDate: Date;
  packageAmount: number;
  diagnosis?: string;
  assignedStaffId?: string;
  isActive: boolean;
  createdAt: Date;
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

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  photoUrl?: string;
  salary: number;
  phone?: string;
  joiningDate: Date;
  isActive: boolean;
  loginUserId?: string; // uid in rehab_users (for login)
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;       // "2025-01-15"
  status: 'present' | 'absent' | 'leave';
  checkInTime?: Date;
  checkOutTime?: Date;
  overriddenBy?: string;
}
