// Admin Types

export type CommissionStatus = 'pending' | 'collected' | 'failed';

export interface Placement {
    id: string;
    jobId: string;
    jobTitle: string;
    employerId: string;
    employerName: string;
    jobSeekerId: string;
    jobSeekerName: string;

    // Salary & Commission
    firstMonthSalary: number;
    commissionAmount: number; // 50% of first month salary
    commissionStatus: CommissionStatus;

    // Tracking
    hiredAt: Date;
    commissionDueDate: Date;
    commissionPaidAt: Date | null;

    createdAt: Date;
    updatedAt: Date;
}

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

export interface RevenueDataPoint {
    date: string;
    revenue: number;
}

export interface ApplicationsDataPoint {
    date: string;
    applications: number;
}
