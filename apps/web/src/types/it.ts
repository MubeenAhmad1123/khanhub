export type ItRole = 'admin' | 'staff' | 'student' | 'client' | 'superadmin';

export type StaffStatus = 'active' | 'inactive' | 'resigned' | 'terminated';

export interface ItUser {
  uid: string;
  id: string;
  customId: string;
  name: string;
  role: ItRole;
  dept: 'it' | 'social-media';
  isActive: boolean;
  loginTime: number;
  email?: string;
  photoUrl?: string;
  designation?: string;
  forceLogoutAt?: string;
  studentId?: string;
  clientId?: string;
  staffId?: string;
}

export interface ItStaffMember {
  id: string;
  customId: string;
  name: string;
  role: ItRole;
  dept: 'it' | 'social-media';
  status: StaffStatus;
  isActive: boolean;
  email?: string;
  phone?: string;
  designation?: string;
  joiningDate?: any;
  createdAt?: any;
}

export interface ItStudent {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  course?: string;
  batch?: string;
  status: 'active' | 'completed' | 'dropped';
  joiningDate: any;
  feePaid?: number;
  totalFee?: number;
}

export interface ItClient {
  id: string;
  companyName: string;
  contactPerson: string;
  email?: string;
  phone?: string;
  activeProjects: number;
  totalPaid: number;
  status: 'active' | 'inactive';
}
