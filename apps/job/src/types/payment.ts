// Payment Types - Complete type definitions for payment verification

import { Timestamp } from 'firebase/firestore';

// ==================== PAYMENT ENUMS ====================


export type PaymentType = 'registration' | 'premium' | 'video_upload' | 'connection';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'jazzcash' | 'easypaisa' | 'bank_transfer' | 'card';

export interface Payment {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    type: PaymentType;
    status: PaymentStatus;
    method: PaymentMethod;
    transactionId: string;
    screenshotUrl?: string; // Proof of payment
    adminNotes?: string;
    rejectionReason?: string;
    reviewedBy?: string;
    reviewedAt?: any;
    createdAt: any;
    updatedAt: any;
}

export interface PaymentFilters {
    status?: PaymentStatus[];
    type?: PaymentType[];
    method?: PaymentMethod[];
    userId?: string;
    submittedAfter?: Date | null;
    submittedBefore?: Date | null;
    minAmount?: number;
    maxAmount?: number;
    flaggedOnly?: boolean;
}

export interface PremiumSubscription {
    userId: string;
    paymentId: string;
    isActive: boolean;
    autoRenew: boolean;
    startDate: any;
    endDate: any;
    jobsViewed: number;
    maxJobsViewed: number;
    unlimitedApplications: boolean;
    featuredProfile: boolean;
    prioritySupport: boolean;
    createdAt: any;
    updatedAt: any;
}

export interface PaymentStatistics {
    totalCount: number;
    totalAmount: number;
    pendingCount: number;
    pendingAmount: number;
    approvedCount: number;
    approvedAmount: number;
    rejectedCount: number;
    rejectedAmount: number;
}

// ... (skipping unchanged lines)

export const PAYMENT_AMOUNTS = {
    registration: 1000,
    premium: 10000,
    video_upload: 1000,
} as const;

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
    registration: 'Registration Fee',
    premium: 'Premium Membership',
    video_upload: 'Video Upload Activation',
    connection: 'Contact Reveal Fee',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    jazzcash: 'JazzCash',
    easypaisa: 'Easypaisa',
    bank_transfer: 'Bank Transfer',
    card: 'Credit/Debit Card',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
    pending: 'yellow',
    approved: 'green',
    rejected: 'red',
};

// ==================== VALIDATION ====================

export const VALID_SCREENSHOT_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
];

export const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5MB

export const isValidScreenshot = (file: File): boolean => {
    return VALID_SCREENSHOT_TYPES.includes(file.type) &&
        file.size <= MAX_SCREENSHOT_SIZE;
};

// ==================== JAZZCASH CONSTANTS ====================

export const JAZZCASH_ACCOUNT_INFO = {
    accountTitle: 'Khanhub Job Portal',
    accountNumber: '03XX-XXXXXXX', // Replace with actual
    accountType: 'Mobile Account',
};

export const EASYPAISA_ACCOUNT_INFO = {
    accountTitle: 'Khanhub Job Portal',
    accountNumber: '03XX-XXXXXXX', // Replace with actual
    accountType: 'Mobile Account',
};

export const BANK_ACCOUNT_INFO = {
    bankName: 'Bank Name',
    accountTitle: 'Khanhub Job Portal',
    accountNumber: 'XXXXXXXXXXXX', // Replace with actual
    iban: 'PKXXXXXXXXXXXXXXXXXXXX', // Replace with actual
    branch: 'Branch Name',
};

// ==================== DEFAULT VALUES ====================

export const DEFAULT_PAYMENT_FILTERS: PaymentFilters = {
    status: [],
    type: [],
    method: [],
    userId: undefined,
    submittedAfter: undefined,
    submittedBefore: undefined,
    minAmount: undefined,
    maxAmount: undefined,
    flaggedOnly: false,
};

export const DEFAULT_PREMIUM_SUBSCRIPTION: Omit<PremiumSubscription, 'userId' | 'paymentId' | 'startDate' | 'endDate' | 'createdAt' | 'updatedAt'> = {
    isActive: true,
    autoRenew: false,
    jobsViewed: 0,
    maxJobsViewed: 100,
    unlimitedApplications: true,
    featuredProfile: true,
    prioritySupport: true,
};

// ==================== EMAIL TEMPLATES DATA ====================

export interface PaymentEmailData {
    userName: string;
    userEmail: string;
    amount: number;
    type: PaymentType;
    transactionId: string;
    status: PaymentStatus;
    rejectionReason?: string;
    reviewDate: Date;

    // Premium specific
    premiumStartDate?: Date;
    premiumEndDate?: Date;
}

// ==================== COMMISSION TRACKING ====================

export interface Commission {
    id: string;
    placementId: string;

    // Related IDs
    applicationId: string;
    jobId: string;
    candidateId: string;
    employerId: string;

    // Details
    candidateName: string;
    jobTitle: string;
    companyName: string;

    // Financial
    firstMonthSalary: number;
    commissionRate: number; // 50%
    commissionAmount: number; // 50% of salary

    // Payment Status
    isPaid: boolean;
    paidAt?: Date | Timestamp;
    paymentMethod?: string;
    paymentReference?: string;

    // Notes
    notes?: string;

    // Timestamps
    hiredAt: Date | Timestamp;
    createdAt: Date | Timestamp;
    updatedAt: Date | Timestamp;
}

export const COMMISSION_RATE = 0.5; // 50%

export const calculateCommission = (firstMonthSalary: number): number => {
    return Math.round(firstMonthSalary * COMMISSION_RATE);
};

// ==================== REVENUE TRACKING ====================

export interface RevenueBreakdown {
    // Registration Fees
    registrationRevenue: number;
    registrationCount: number;

    // Premium Subscriptions
    premiumRevenue: number;
    premiumCount: number;

    // Commissions
    commissionRevenue: number;
    commissionCount: number;

    // Total
    totalRevenue: number;

    // By Period
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;

    // Growth
    monthOverMonthGrowth: number; // percentage
    yearOverYearGrowth: number; // percentage
}