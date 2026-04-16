// src/types/job-center.ts

import { Timestamp } from 'firebase/firestore';

export type JobCenterRole = 'admin' | 'staff' | 'seeker' | 'employer' | 'superadmin';

// ─── JOBCENTER USER (Auth) ───────────────────────────────────────────────────────

export interface JobCenterUser {
  uid: string;
  customId: string;
  name: string;
  displayName?: string;
  role: JobCenterRole;
  isActive: boolean;
  seekerId?: string;
  employerId?: string;
  createdAt?: Timestamp | Date;
}

export interface Transaction {
  id: string;
  seekerId?: string;   // Either seekerId or employerId
  employerId?: string;
  seekerName?: string;
  employerName?: string;
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

// ─── JOB SEEKER ─────────────────────────────────────────────────────────────

export interface JobSeeker {
  id: string;
  seekerNumber: string;            // e.g. "JC-S-058"
  serialNumber: number;
  
  // Basic Identity
  name: string;
  fatherName: string;
  dateOfBirth?: string;            // "YYYY-MM-DD"
  age?: number;
  gender: 'male' | 'female' | 'other';
  photoUrl?: string;

  // Education & Skills
  education: string;               // e.g. "Matric", "Masters in CS"
  skills: string[];                // e.g. ["Driving", "Tailoring", "React"]
  experience?: string;             // summary of work history
  
  // Job Preferences
  jobInterests: string[];          // what are they looking for?
  expectedSalary?: string;
  availability: 'immediate' | '1_week' | '2_plus_weeks';

  // Contact & Location
  address: string;
  contactNumber: string;
  whatsappNumber?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    number: string;
  };

  // Status
  isActive: boolean;
  isEmployed: boolean;             // whether they found a job through us
  employedAt?: string;             // Employer ID if employed
  createdAt: Timestamp | Date;
  createdBy?: string;               // admin uid
}

// Legacy alias for Seeker
export type Seeker = JobSeeker;

// ─── EMPLOYER / COMPANY ───────────────────────────────────────────────────

export interface Employer {
  id: string;
  loginId: string;                 // unique login identifier
  
  // Company Info
  companyName: string;
  industry: string;                // e.g. "IT", "Healthcare"
  address: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  companySize?: string;            // e.g. "1-10", "11-50"
  description?: string;

  // Contact Person
  contactPerson: {
    name: string;
    position?: string;
    phone: string;
  };

  // Status
  isActive: boolean;
  createdAt: Timestamp | Date;
  createdBy?: string;
}

// ─── JOB POSTING ─────────────────────────────────────────────────────────

export interface JobOpening {
  id: string;
  employerId: string;
  companyName: string;
  title: string;
  description: string;
  requirements: string[];          // e.g. ["Driving License", "3 Years Experience"]
  salaryRange?: string;
  vacancyCount: number;
  location?: string;               // if different from company address
  status: 'open' | 'closed';
  createdAt: Timestamp | Date;
}

// ─── STAFF & GROWTH (Keep mostly same but rename concepts if needed) ───────────

export interface StaffDuty {
  id: string;
  dutyDescription: string;
  startTime?: string;
  endTime?: string;
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

export interface StaffMember {
  id: string;
  name: string;
  fatherName: string;
  employeeId: string;
  designation: string;
  department: 'job-center';
  gender: 'male' | 'female';
  phone?: string;
  photoUrl?: string;
  dutyStartTime: string;
  dutyEndTime: string;
  dressCode: { id: string; name: string; required: boolean; isCustom: boolean }[];
  duties: { id: string; name: string; description?: string; assignedAt: string; assignedBy: string; isActive: boolean }[];
  salary: number;
  isActive: boolean;
  joiningDate: string;
  loginUserId?: string;
  role: JobCenterRole;
  customId?: string;
  createdAt: string;
  createdBy?: string;
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

// ─── DAILY ACTIVITY RECORD ───────────────────────────────────────────────────
// One document per seeker per date
// Collection: jobcenter_daily_activities

export const DAILY_ACTIVITIES = [
  { id: 1,  name: 'Morning Prep & Grooming' },
  { id: 2,  name: 'Job Search / Portals Check' },
  { id: 3,  name: 'Skill Development (Course/Lab)' },
  { id: 4,  name: 'Interview Prep / Mock Session' },
  { id: 5,  name: 'CV / Portfolio Refinement' },
  { id: 6,  name: 'New Applications Submitted' },
  { id: 7,  name: 'Soft Skills Training' },
  { id: 8,  name: 'Career Counselling' },
  { id: 9,  name: 'Zohar Prayer / Break' },
  { id: 10, name: 'Lunch' },
  { id: 11, name: 'Placement Status Check' },
  { id: 12, name: 'Employer Communication' },
  { id: 13, name: 'Networking / Industry Research' },
  { id: 14, name: 'Mock Interview / Assessment' },
  { id: 15, name: 'Digital Literacy Lab' },
  { id: 16, name: 'Asar Prayer' },
  { id: 17, name: 'Maghrib Prayer' },
  { id: 18, name: 'Dinner' },
  { id: 19, name: 'Self-Reflection / Daily Review' },
  { id: 20, name: 'Isha Prayer' },
  { id: 21, name: 'Rest / Personal Time' },
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
  careerCounsellingNotes?: string;  // text area for counselling session (#8)
  placementStatusNotes?: string;    // notes for status check (#11)
  markedBy: string;                 // admin uid
  createdAt?: any;
  updatedAt?: any;
}

// ─── LEGACY / COMPATIBILITY TYPES (Adapted for Job Center) ───────────────────

export interface FeeRecord {
  id: string;
  seekerId: string;
  month: string;              // "YYYY-MM"
  packageAmount: number;
  amountPaid: number;
  amountRemaining: number;
  status: 'pending' | 'active' | 'completed';
  payments: {
    id: string;
    amount: number;
    date: any;
    note?: string;
    receivedBy: string;
    status: 'pending' | 'approved' | 'rejected';
  }[];
  createdAt: any;
}

export interface CanteenRecord {
  id: string;
  seekerId: string;
  month: string;
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  transactions: {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    description: string;
    date: any;
    status: 'approved' | 'pending';
  }[];
}

export interface TherapySession {
  id: string;
  seekerId: string;
  date: string;
  therapistId?: string;
  notes?: string;
  sessionNumber: number;        // Added
  sessionNotes?: string;        // Added for JobTrainingTab
  therapistName?: string;       // Added for JobTrainingTab
  progressRating?: number;      // Added for JobTrainingTab
  duration?: string;
  createdBy?: string;
  createdAt?: any;               // Added
}

export interface MedicationRecord {
  id: string;
  seekerId: string;
  date: string;
  morning?: string;
  afternoon?: string;
  evening?: string;
  night?: string;
  notes?: string;           // Added for SupportRecordTab
  medicalOfficerSig?: string; // Added for SupportRecordTab
  timing?: string;            // Added for SupportRecordTab
  medications?: string;       // Added for SupportRecordTab
  dispenserSig?: string;      // Added for SupportRecordTab
  createdBy?: string;
  createdAt?: any;
}

export interface WeeklyProgress {
  id: string;
  seekerId: string;
  weekStarting?: string;
  weekNumber: number;          // Added
  metrics?: {
    [key: string]: number;
  };
  comments?: string;
  notes?: string;
  weekStartDate?: string;
  weekEndDate?: string;
  score?: number;
  createdBy?: string;
  createdAt?: any;              // Added
}

export interface MonthlyGrowthPoints {
  id: string;
  seekerId: string;
  month: string;
  totalPoints: number;
  breakdown: {
    [category: string]: number;
  };
  staffId?: string;
  attendance?: number; // Added for growthPoints.ts
  punctuality?: number; // Added for growthPoints.ts
  duties?: number;
  dressCode?: number;
  contributions?: number;
  extra?: number;
  total?: number;
}

export interface DressCodeItem {
  id: string;
  name: string;
  required: boolean;
  isCustom: boolean;
}
