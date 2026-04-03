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
  patientId?: string;
  patientName?: string;
  note?: string;
  cashierId: string;
  cashierName: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  date: string;
  createdAt: string;
}