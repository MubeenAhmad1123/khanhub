// apps/web/src/types/it.ts

import { StaffDept, StaffRole, StaffStatus } from '@/lib/hq/superadmin/staff';

export interface ItUser {
  uid: string;
  id: string;
  customId: string;
  name: string;
  role: StaffRole;
  dept: 'it' | 'social-media';
  isActive: boolean;
  loginTime: number;
  email?: string;
  photoUrl?: string;
  designation?: string;
  forceLogoutAt?: string;
}

export interface ItStaffMember {
  id: string;
  customId: string;
  name: string;
  role: StaffRole;
  dept: 'it' | 'social-media';
  status: StaffStatus;
  isActive: boolean;
  email?: string;
  phone?: string;
  designation?: string;
  joiningDate?: any;
  createdAt?: any;
}
