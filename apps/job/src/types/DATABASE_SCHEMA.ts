import {
    User,
    UserRole,
    JobSeekerProfile,
    CompanyProfile,
    WorkExperience,
    Education,
    Certification,
    PointsHistoryEntry
} from './user';
import { Payment, PaymentType, PaymentMethod } from './payment';
import { Connection, ConnectionStatus } from './connection';
import { AdminDashboardData } from './admin';

// Re-export all types
export * from './user';
export * from './payment';
export * from './connection';
export * from './admin';

// Re-export specific types that might be missing from * exports due to isolation
export type { PaymentStatus } from './payment';
export type { Connection, ConnectionStatus } from './connection';

// Aliases for backward compatibility or clarity
export type BaseUser = User;

export type PointsHistory = PointsHistoryEntry;

// Placement Type (Kept for historical hiring tracking)
export interface Placement {
    id: string;
    candidateId: string;
    employerId: string;
    connectionId?: string; // Links to the connection that led to this placement

    // Details
    candidateName: string;
    companyName: string;

    // Financials
    firstMonthSalary: number;
    commissionAmount: number;
    commissionStatus: 'pending' | 'collected' | 'failed';
    commissionPaidAt?: any;

    // Dates
    hiredAt: any; // Date | Timestamp
    createdAt: any; // Date | Timestamp
    updatedAt: any; // Date | Timestamp

    status?: 'active' | 'completed' | 'disputed';
}

// Database Collection Names
export const COLLECTIONS = {
    USERS: 'users',
    CONNECTIONS: 'connections',
    PAYMENTS: 'payments',
    PLACEMENTS: 'placements',
    ADMIN_ACTIONS: 'admin_actions',
    NOTIFICATIONS: 'notifications',
    REPORTS: 'reports',
    SETTINGS: 'settings',
    POINTS_HISTORY: 'points_history',
} as const;

export const POINTS = {
    BASIC_INFO_COMPLETED: 25,
    CV_UPLOADED: 15,
    VIDEO_UPLOADED: 20,
    PROFILE_COMPLETED: 10, // Bonus for 100%
    PROFILE_VIEWED: 3,
} as const;

// CONSTANTS
export const LIMITS = {
    FREE_APPLICATION_QUOTA: 10,
    PREMIUM_JOB_VIEW_QUOTA: 100,
} as const;

export const PRICING = {
    REGISTRATION_FEE: 1000,
    PREMIUM_MONTHLY: 5000,
} as const;