export type SpimsRole = 'student' | 'staff' | 'cashier' | 'admin' | 'superadmin';

export const SPIMS_COURSES = [
  { id: 'pharmacy-technician',   name: 'Pharmacy Technician (Category-B)', duration: 2, totalFee: 130000 },
  { id: 'post-rn-bsn',          name: 'Post RN BSN',                       duration: 2, totalFee: 100000 },
  { id: 'lhv',                  name: 'Lady Health Visitor (LHV)',          duration: 2, totalFee: 250000 },
  { id: 'cmw',                  name: 'Community Midwife (CMW)',            duration: 2, totalFee: 160000 },
  { id: 'cna',                  name: 'Certified Nursing Assistant (CNA)', duration: 2, totalFee: 100000 },
  { id: 'dispenser',            name: 'Dispenser',                         duration: 2, totalFee: 100000 },
  { id: 'ott',                  name: 'Operation Theater Technician (OTT)',duration: 2, totalFee: 100000 },
  { id: 'mlt',                  name: 'Medical Laboratory Technician (MLT)',duration: 2, totalFee: 100000 },
  { id: 'rit',                  name: 'Radiography & Imaging Technician',  duration: 2, totalFee: 100000 },
  { id: 'dental-tech',          name: 'Dental Technician',                 duration: 2, totalFee: 100000 },
  { id: 'dialysis-tech',        name: 'Dialysis Technician',               duration: 2, totalFee: 100000 },
  { id: 'anesthesia-tech',      name: 'Anesthesia Technician',             duration: 2, totalFee: 100000 },
] as const;

export type CourseId = typeof SPIMS_COURSES[number]['id'];

export interface SpimsUser {
  uid: string;
  customId: string;
  role: SpimsRole;
  displayName: string;
  studentId?: string;
  createdAt: any;
  isActive: boolean;
}

export interface Student {
  id: string;
  // Personal Info
  name: string;
  fatherName: string;
  dateOfBirth?: string;
  gender: 'male' | 'female' | 'other';
  cnic?: string;
  phone?: string;
  address?: string;
  photoUrl?: string;
  // Academic Info
  courseId: CourseId;
  courseName: string;
  totalCourseFee: number;
  enrollmentDate: any;
  expectedCompletionDate: any;
  year: 1 | 2;
  rollNumber?: string;
  // Referral
  referredBy?: string;
  referrerPhone?: string;
  // Status
  isActive: boolean;
  status: 'enrolled' | 'completed' | 'dropped' | 'suspended';
  createdAt: any;
  createdBy?: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  // Total course fee breakdown
  totalCourseFee: number;
  totalPaid: number;
  totalRemaining: number;
  // Individual payments
  payments: FeePayment[];
  lastPaymentDate?: any;
  lastPaymentAmount?: number;
  createdAt: any;
}

export interface FeePayment {
  amount: number;
  date: any;
  paymentType: 'monthly' | 'weekly' | 'semester' | 'annual' | 'partial';
  transactionId?: string;
  approvedBy?: string;
  note?: string;
}

export interface BoardFee {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  feeType: 'registration' | 'enrollment' | 'examination' | 'result_card' | 'other';
  amount: number;
  paidToBoard: string;
  receiptNumber?: string;
  date: any;
  status: 'pending' | 'paid';
  transactionId?: string;
  createdAt: any;
}

export interface ExamRecord {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  year: 1 | 2;
  examType: 'annual' | 'supplementary';
  examDate?: any;
  rollNumber: string;
  subjects: ExamSubject[];
  overallResult: 'pass' | 'fail' | 'supply' | 'absent' | 'pending';
  resultEnteredBy?: string;
  resultDate?: any;
  createdAt: any;
}

export interface ExamSubject {
  name: string;
  totalMarks: number;
  obtainedMarks?: number;
  result: 'pass' | 'fail' | 'supply' | 'pending';
}

export interface SpimsFeeTransaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: any;
  cashierId: string;
  cashierName: string;
  studentId?: string;
  studentName?: string;
  boardFeeId?: string;
  staffId?: string;
  staffName?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: any;
  createdAt: any;
}

export interface SpimsStaff {
  id: string;
  name: string;
  designation: string;
  department?: string;
  salary: number;
  phone?: string;
  cnic?: string;
  joiningDate: any;
  photoUrl?: string;
  isActive: boolean;
  loginUserId?: string;
}

export interface SpimsAttendance {
  id: string;
  staffId: string;
  date: string;
  status: 'present' | 'absent' | 'leave';
  checkInTime?: any;
  overriddenBy?: string;
}
