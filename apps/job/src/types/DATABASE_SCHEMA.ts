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
import { Job, SavedJob, JobStatus, EmploymentType, JobCategory, ExperienceLevel } from './job';
import { Application, ApplicationStatus } from './application';
import { Payment, PaymentType, PaymentMethod } from './payment';
import { AdminDashboardData } from './admin';

// Re-export all types
export * from './user';
export * from './job';
export * from './application';
export * from './payment';
export * from './admin';

// Re-export specific types that might be missing from * exports due to isolation
export type { PaymentStatus } from './payment';
export type { Application, ApplicationStatus } from './application';

// Aliases for backward compatibility or clarity
export type BaseUser = User;

export type PointsHistory = PointsHistoryEntry;

// Placement Type (Reconstructed as it was missing from file list)
export interface Placement {
    id: string;
    jobId: string;
    applicationId: string;
    candidateId: string;
    employerId: string;

    // Details
    jobTitle: string;
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
    JOBS: 'jobs',
    APPLICATIONS: 'applications',
    PAYMENTS: 'payments',
    PLACEMENTS: 'placements',
    SAVED_JOBS: 'saved_jobs',
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
    JOB_APPLIED: 5,
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