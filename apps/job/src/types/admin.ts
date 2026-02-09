// Admin Types - Complete type definitions for admin operations

import { Timestamp } from 'firebase/firestore';
import { PaymentStatistics, RevenueBreakdown, Commission } from './payment';
import { ApplicationStatistics } from './application';
import { JobStatistics } from './job';

// ==================== ANALYTICS ====================
export interface AnalyticsData {
    totalRevenue: number;
    revenueToday: number;
    revenueThisWeek: number;
    revenueThisMonth: number;
    totalApplications: number;
    applicationsToday: number;
    applicationsThisWeek: number;
    applicationsThisMonth: number;
    totalJobSeekers: number;
    totalEmployers: number;
    totalActiveJobs: number;
    totalPlacements: number;
    pendingPayments: number;
    pendingJobs: number;
}

// ==================== ADMIN DASHBOARD ====================
export type CommissionStatus = 'pending' | 'collected' | 'failed';

// Placement Type
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
    commissionStatus: CommissionStatus;
    commissionPaidAt?: any;

    // Dates
    hiredAt: any; // Date | Timestamp
    createdAt: any; // Date | Timestamp
    updatedAt: any; // Date | Timestamp

    status?: 'active' | 'completed' | 'disputed';
}

export interface AdminDashboardData {
    // Summary Statistics
    summary: {
        totalUsers: number;
        totalJobSeekers: number;
        totalEmployers: number;
        totalPremiumUsers: number;

        totalJobs: number;
        activeJobs: number;
        pendingJobs: number;

        totalApplications: number;
        totalPlacements: number;

        totalRevenue: number;
        monthlyRevenue: number;
    };

    // Pending Actions
    pendingActions: {
        paymentsToReview: number;
        jobsToReview: number;
        flaggedApplications: number;
        reportedUsers: number;
    };

    // Recent Activity
    recentPayments: number;
    recentJobs: number;
    recentApplications: number;
    recentPlacements: number;

    // Growth Metrics
    growth: {
        usersThisMonth: number;
        jobsThisMonth: number;
        applicationsThisMonth: number;
        revenueThisMonth: number;

        usersGrowthRate: number; // percentage
        jobsGrowthRate: number;
        applicationsGrowthRate: number;
        revenueGrowthRate: number;
    };
}

// ==================== ANALYTICS ====================

export interface PlatformAnalytics {
    // User Analytics
    users: {
        total: number;
        byRole: {
            jobSeekers: number;
            employers: number;
            admins: number;
        };
        byStatus: {
            active: number;
            inactive: number;
            banned: number;
        };
        premium: {
            active: number;
            expired: number;
            total: number;
            conversionRate: number; // % of job seekers who become premium
        };
        growth: UserGrowthData[];
    };

    // Job Analytics
    jobs: JobStatistics & {
        growth: JobGrowthData[];
        topCategories: CategoryStats[];
        topLocations: LocationStats[];
    };

    // Application Analytics
    applications: ApplicationStatistics & {
        growth: ApplicationGrowthData[];
        conversionFunnel: ConversionFunnelData;
    };

    // Payment Analytics
    payments: PaymentStatistics & {
        growth: PaymentGrowthData[];
    };

    // Revenue Analytics
    revenue: RevenueBreakdown & {
        growth: RevenueGrowthData[];
        forecast: RevenueForecast;
    };

    // Placement Analytics
    placements: PlacementAnalytics;
}

// ==================== GROWTH DATA ====================

export interface UserGrowthData {
    date: string; // YYYY-MM-DD
    totalUsers: number;
    newUsers: number;
    jobSeekers: number;
    employers: number;
    premiumUsers: number;
}

export interface JobGrowthData {
    date: string;
    totalJobs: number;
    newJobs: number;
    activeJobs: number;
    closedJobs: number;
}

export interface ApplicationGrowthData {
    date: string;
    totalApplications: number;
    newApplications: number;
    hired: number;
    rejected: number;
}

export interface PaymentGrowthData {
    date: string;
    totalPayments: number;
    approved: number;
    rejected: number;
    revenue: number;
}

export interface RevenueGrowthData {
    date: string;
    registration: number;
    premium: number;
    commission: number;
    total: number;
}

// ==================== CATEGORY & LOCATION STATS ====================

export interface CategoryStats {
    category: string;
    jobCount: number;
    applicationCount: number;
    placementCount: number;
    avgSalary: number;
}

export interface LocationStats {
    city: string;
    jobCount: number;
    jobSeekerCount: number;
    employerCount: number;
    placementCount: number;
}

// ==================== CONVERSION FUNNEL ====================

export interface ConversionFunnelData {
    totalApplications: number;
    viewed: number;
    viewedRate: number;

    shortlisted: number;
    shortlistRate: number;

    interviewed: number;
    interviewRate: number;

    offered: number;
    offerRate: number;

    hired: number;
    hireRate: number;
}

// ==================== PLACEMENT ANALYTICS ====================

export interface PlacementAnalytics {
    total: number;
    thisMonth: number;
    thisYear: number;

    byCategory: Record<string, number>;
    byLocation: Record<string, number>;

    averageTimeToHire: number; // days
    averageSalary: number;

    commissions: {
        total: number;
        paid: number;
        unpaid: number;
        totalAmount: number;
        paidAmount: number;
        unpaidAmount: number;
    };

    topPerformers: {
        candidates: TopCandidate[];
        employers: TopEmployer[];
        recruiters: TopRecruiter[];
    };
}

export interface TopCandidate {
    id: string;
    name: string;
    placementCount: number;
    totalRevenue: number;
}

export interface TopEmployer {
    id: string;
    name: string;
    placementCount: number;
    totalCommission: number;
}

export interface TopRecruiter {
    id: string;
    name: string;
    placementCount: number;
    totalRevenue: number;
}

// ==================== REVENUE FORECAST ====================

export interface RevenueForecast {
    nextMonth: number;
    nextQuarter: number;
    nextYear: number;
    confidence: number; // 0-100
    method: 'linear' | 'exponential' | 'moving_average';
}

// ==================== ADMIN ACTIONS ====================

export type AdminActionType =
    | 'payment_approved'
    | 'payment_rejected'
    | 'job_approved'
    | 'job_rejected'
    | 'user_banned'
    | 'user_unbanned'
    | 'job_featured'
    | 'job_unfeatured'
    | 'placement_created'
    | 'commission_paid'
    | 'data_exported'
    | 'settings_updated';

export interface AdminAction {
    id: string;
    adminId: string;
    adminName: string;
    adminEmail: string;

    action: AdminActionType;
    targetType: 'user' | 'job' | 'payment' | 'application' | 'placement' | 'system';
    targetId: string;

    details: Record<string, any>;
    note?: string;

    timestamp: Date | Timestamp;
    ipAddress?: string;
    userAgent?: string;
}

// ==================== ADMIN FILTERS ====================

export interface AdminFilters {
    dateRange?: {
        start: Date;
        end: Date;
    };

    status?: string[];
    type?: string[];
    category?: string[];
    location?: string[];

    searchQuery?: string;
}

// ==================== BULK OPERATIONS ====================

export interface BulkOperationResult {
    success: number;
    failed: number;
    total: number;
    errors: BulkOperationError[];
}

export interface BulkOperationError {
    id: string;
    error: string;
    details?: any;
}

// ==================== SYSTEM SETTINGS ====================

export interface SystemSettings {
    // General
    siteName: string;
    siteUrl: string;
    supportEmail: string;
    supportPhone: string;

    // Payment
    registrationFee: number;
    premiumFee: number;
    commissionRate: number; // 0-1 (e.g., 0.5 = 50%)

    // Limits
    freeUserApplicationLimit: number; // Default: 10
    premiumUserJobViewLimit: number; // Default: 100
    maxJobDuration: number; // days, Default: 90

    // Features
    enabledFeatures: {
        googleAuth: boolean;
        phoneAuth: boolean;
        videoRecording: boolean;
        cvParsing: boolean;
        jobAlerts: boolean;
        messaging: boolean;
        skillAssessments: boolean;
    };

    // Email
    emailSettings: {
        fromName: string;
        fromEmail: string;
        replyTo: string;
    };

    // Notifications
    notificationSettings: {
        sendWelcomeEmail: boolean;
        sendPaymentUpdates: boolean;
        sendJobUpdates: boolean;
        sendApplicationUpdates: boolean;
        sendWeeklyDigest: boolean;
    };

    // Maintenance
    maintenanceMode: boolean;
    maintenanceMessage?: string;

    // Updated
    updatedAt: Date | Timestamp;
    updatedBy: string;
}

// ==================== REPORTS ====================

export type ReportType =
    | 'users'
    | 'jobs'
    | 'applications'
    | 'payments'
    | 'placements'
    | 'revenue'
    | 'analytics';

export type ReportFormat = 'pdf' | 'csv' | 'excel' | 'json';

export interface ReportRequest {
    type: ReportType;
    format: ReportFormat;

    dateRange: {
        start: Date;
        end: Date;
    };

    filters?: Record<string, any>;

    includeCharts?: boolean;
    includeRawData?: boolean;

    requestedBy: string;
    requestedAt: Date | Timestamp;
}

export interface ReportResult {
    id: string;
    request: ReportRequest;

    status: 'pending' | 'processing' | 'completed' | 'failed';

    fileUrl?: string;
    fileName?: string;
    fileSize?: number;

    error?: string;

    generatedAt?: Date | Timestamp;
    expiresAt?: Date | Timestamp;
}

// ==================== MODERATION ====================

export interface ModerationQueue {
    payments: {
        pending: number;
        flagged: number;
    };
    jobs: {
        pending: number;
        flagged: number;
    };
    applications: {
        flagged: number;
    };
    users: {
        reported: number;
    };
}

export type ReportReason =
    | 'spam'
    | 'inappropriate_content'
    | 'fake_job'
    | 'fake_profile'
    | 'harassment'
    | 'discrimination'
    | 'scam'
    | 'other';

export interface Report {
    id: string;
    reportedBy: string;
    reportedUser?: string;
    reportedJob?: string;
    reportedApplication?: string;

    reason: ReportReason;
    description: string;

    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';

    reviewedBy?: string;
    reviewedAt?: Date | Timestamp;
    resolution?: string;

    createdAt: Date | Timestamp;
}

// ==================== NOTIFICATIONS ====================

export interface AdminNotification {
    id: string;
    type: 'payment' | 'job' | 'report' | 'system' | 'alert';
    priority: 'low' | 'medium' | 'high' | 'critical';

    title: string;
    message: string;

    link?: string;
    data?: Record<string, any>;

    read: boolean;
    readAt?: Date | Timestamp;

    createdAt: Date | Timestamp;
}

// ==================== AUDIT LOG ====================

export interface AuditLog {
    id: string;
    userId: string;
    userName: string;
    userRole: string;

    action: string;
    resource: string;
    resourceId: string;

    changes?: {
        before: Record<string, any>;
        after: Record<string, any>;
    };

    ipAddress: string;
    userAgent: string;

    timestamp: Date | Timestamp;

    success: boolean;
    error?: string;
}

// ==================== CONSTANTS ====================

export const ADMIN_PERMISSIONS = {
    // Payments
    VIEW_PAYMENTS: 'view_payments',
    APPROVE_PAYMENTS: 'approve_payments',
    REJECT_PAYMENTS: 'reject_payments',

    // Jobs
    VIEW_JOBS: 'view_jobs',
    APPROVE_JOBS: 'approve_jobs',
    REJECT_JOBS: 'reject_jobs',
    EDIT_JOBS: 'edit_jobs',
    DELETE_JOBS: 'delete_jobs',
    FEATURE_JOBS: 'feature_jobs',

    // Users
    VIEW_USERS: 'view_users',
    EDIT_USERS: 'edit_users',
    BAN_USERS: 'ban_users',
    DELETE_USERS: 'delete_users',

    // Applications
    VIEW_APPLICATIONS: 'view_applications',

    // Placements
    VIEW_PLACEMENTS: 'view_placements',
    CREATE_PLACEMENTS: 'create_placements',
    EDIT_PLACEMENTS: 'edit_placements',
    MARK_COMMISSION_PAID: 'mark_commission_paid',

    // Analytics
    VIEW_ANALYTICS: 'view_analytics',
    EXPORT_DATA: 'export_data',

    // Settings
    VIEW_SETTINGS: 'view_settings',
    EDIT_SETTINGS: 'edit_settings',

    // System
    MAINTENANCE_MODE: 'maintenance_mode',
    VIEW_LOGS: 'view_logs',
    SEND_NOTIFICATIONS: 'send_notifications',
} as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[keyof typeof ADMIN_PERMISSIONS];

// ==================== DEFAULT VALUES ====================

export const DEFAULT_SYSTEM_SETTINGS: Omit<SystemSettings, 'updatedAt' | 'updatedBy'> = {
    siteName: 'Khanhub Job Portal',
    siteUrl: 'https://jobkhanhub.vercel.app',
    supportEmail: 'support@khanhub.com',
    supportPhone: '+92-XXX-XXXXXXX',

    registrationFee: 1000,
    premiumFee: 10000,
    commissionRate: 0.5,

    freeUserApplicationLimit: 10,
    premiumUserJobViewLimit: 100,
    maxJobDuration: 90,

    enabledFeatures: {
        googleAuth: true,
        phoneAuth: false,
        videoRecording: true,
        cvParsing: true,
        jobAlerts: true,
        messaging: false,
        skillAssessments: false,
    },

    emailSettings: {
        fromName: 'Khanhub Job Portal',
        fromEmail: 'noreply@khanhub.com',
        replyTo: 'support@khanhub.com',
    },

    notificationSettings: {
        sendWelcomeEmail: true,
        sendPaymentUpdates: true,
        sendJobUpdates: true,
        sendApplicationUpdates: true,
        sendWeeklyDigest: true,
    },

    maintenanceMode: false,
    maintenanceMessage: undefined,
};