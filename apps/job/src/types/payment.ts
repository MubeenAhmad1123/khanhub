// Payment Types - Complete type definitions for payment verification

import { Timestamp } from 'firebase/firestore';

// ==================== PAYMENT ENUMS ====================

export type PaymentType = 'registration' | 'premium';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'jazzcash' | 'easypaisa' | 'bank_transfer' | 'card';

// ==================== PAYMENT ====================

export interface Payment {
    // IDs
    id: string;
    userId: string;

    // User Info
    userEmail: string;
    userName: string;
    userPhone?: string;

    // Payment Details
    amount: number; // 1000 for registration, 10000 for premium
    type: PaymentType;
    method: PaymentMethod;

    // Transaction Info
    transactionId: string;
    transactionDate?: Date | Timestamp;

    // Screenshot
    screenshotUrl: string;
    screenshotFileName: string;

    // Status
    status: PaymentStatus;

    // Approval/Rejection
    reviewedBy?: string; // Admin userId
    reviewedAt?: Date | Timestamp;
    rejectionReason?: string;

    // Notes
    userNotes?: string;
    adminNotes?: string;

    // Timestamps
    submittedAt: Date | Timestamp;
    updatedAt: Date | Timestamp;

    // Premium specific
    premiumStartDate?: Date | Timestamp; // When premium starts (after approval)
    premiumEndDate?: Date | Timestamp; // 30 days from start

    // Flags
    isFlagged: boolean;
    flagReason?: string;
}

// ==================== PAYMENT VERIFICATION ====================

export interface PaymentVerificationData {
    screenshotUrl: string;
    transactionId: string;
    amount: number;
    type: PaymentType;
    method: PaymentMethod;
    userNotes?: string;
    transactionDate?: Date;
}

// ==================== PAYMENT FILTERS ====================

export interface PaymentFilters {
    status?: PaymentStatus[];
    type?: PaymentType[];
    method?: PaymentMethod[];
    userId?: string;

    // Date Range
    submittedAfter?: Date;
    submittedBefore?: Date;

    // Amount Range
    minAmount?: number;
    maxAmount?: number;

    // Flags
    flaggedOnly?: boolean;
}

// ==================== PAYMENT SORT ====================

export type PaymentSortOption =
    | 'newest'
    | 'oldest'
    | 'amount_high'
    | 'amount_low'
    | 'status';

export interface PaymentSortConfig {
    field: string;
    direction: 'asc' | 'desc';
}

export const PAYMENT_SORT_CONFIGS: Record<PaymentSortOption, PaymentSortConfig> = {
    newest: { field: 'submittedAt', direction: 'desc' },
    oldest: { field: 'submittedAt', direction: 'asc' },
    amount_high: { field: 'amount', direction: 'desc' },
    amount_low: { field: 'amount', direction: 'asc' },
    status: { field: 'status', direction: 'asc' },
};

// ==================== FORM DATA ====================

export interface PaymentSubmissionFormData {
    transactionId: string;
    amount: number;
    type: PaymentType;
    method: PaymentMethod;
    screenshot: File;
    userNotes?: string;
    transactionDate?: Date;
}

export interface PaymentReviewFormData {
    status: 'approved' | 'rejected';
    rejectionReason?: string;
    adminNotes?: string;
}

// ==================== PAYMENT STATISTICS ====================

export interface PaymentStatistics {
    // Overall
    total: number;
    totalRevenue: number;

    // By Status
    pending: number;
    approved: number;
    rejected: number;

    // By Type
    registration: {
        total: number;
        approved: number;
        pending: number;
        rejected: number;
        revenue: number;
    };
    premium: {
        total: number;
        approved: number;
        pending: number;
        rejected: number;
        revenue: number;
    };

    // By Method
    byMethod: Record<PaymentMethod, number>;

    // Time-based
    today: number;
    thisWeek: number;
    thisMonth: number;

    // Revenue
    revenueToday: number;
    revenueThisWeek: number;
    revenueThisMonth: number;

    // Metrics
    approvalRate: number; // % of payments approved
    averageApprovalTime: number; // hours
    averagePaymentAmount: number;
}

// ==================== PREMIUM SUBSCRIPTION ====================

export interface PremiumSubscription {
    userId: string;
    paymentId: string;

    startDate: Date | Timestamp;
    endDate: Date | Timestamp;

    isActive: boolean;
    autoRenew: boolean;

    // Usage
    jobsViewed: number;
    maxJobsViewed: number; // 100

    // Benefits
    unlimitedApplications: boolean;
    featuredProfile: boolean;
    prioritySupport: boolean;

    createdAt: Date | Timestamp;
    updatedAt: Date | Timestamp;
}

// ==================== HELPER TYPES ====================

export type CreatePaymentData = Omit<
    Payment,
    'id' | 'submittedAt' | 'updatedAt' | 'status' | 'isFlagged'
>;

export type UpdatePaymentData = Partial<
    Omit<Payment, 'id' | 'userId' | 'submittedAt'>
>;

// ==================== TYPE GUARDS ====================

export const isPaymentPending = (payment: Payment): boolean => {
    return payment.status === 'pending';
};

export const isPaymentApproved = (payment: Payment): boolean => {
    return payment.status === 'approved';
};

export const isPaymentRejected = (payment: Payment): boolean => {
    return payment.status === 'rejected';
};

export const isPremiumPayment = (payment: Payment): boolean => {
    return payment.type === 'premium';
};

export const isRegistrationPayment = (payment: Payment): boolean => {
    return payment.type === 'registration';
};

export const isPremiumActive = (subscription: PremiumSubscription): boolean => {
    if (!subscription.isActive) return false;

    const endDate = subscription.endDate instanceof Date
        ? subscription.endDate
        : subscription.endDate.toDate();

    return endDate > new Date();
};

export const getRemainingPremiumDays = (subscription: PremiumSubscription): number => {
    const endDate = subscription.endDate instanceof Date
        ? subscription.endDate
        : subscription.endDate.toDate();

    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
};

export const canViewMoreJobs = (subscription: PremiumSubscription): boolean => {
    return isPremiumActive(subscription) &&
        subscription.jobsViewed < subscription.maxJobsViewed;
};

// ==================== CONSTANTS ====================

export const PAYMENT_AMOUNTS = {
    registration: 1000,
    premium: 10000,
} as const;

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
    registration: 'Registration Fee',
    premium: 'Premium Membership',
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