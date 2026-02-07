// Application Types - Complete type definitions for job applications

import { Timestamp } from 'firebase/firestore';
import { QuestionAnswer } from './job';

// ==================== APPLICATION ENUMS ====================

export type ApplicationStatus =
    | 'pending'
    | 'viewed'
    | 'shortlisted'
    | 'interviewed'
    | 'offer_extended'
    | 'rejected'
    | 'hired'
    | 'withdrawn';

export type ApplicationSource =
    | 'web'
    | 'mobile'
    | 'referral'
    | 'direct';

// ==================== APPLICATION ====================

export interface Application {
    // IDs
    id: string;
    jobId: string;
    candidateId: string;
    employerId: string;

    // Job Info (snapshot at time of application)
    jobTitle: string;
    companyName: string;
    jobLocation: string;
    jobCategory: string;

    // Candidate Info (snapshot at time of application)
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string;
    candidateLocation: string;

    // Candidate Profile Snapshot
    candidateProfile: {
        skills: string[];
        yearsOfExperience: number;
        education: string; // Highest degree
        currentJobTitle?: string;
    };

    // Files
    cvUrl: string;
    cvFileName: string;
    videoUrl?: string;
    videoFileName?: string;

    // Application Content
    coverLetter?: string;
    customQuestionAnswers?: QuestionAnswer[];

    // Match Score
    matchScore: number; // 0-100
    matchBreakdown: {
        skillsMatch: number;
        experienceMatch: number;
        locationMatch: number;
        educationMatch: number;
    };

    // Status & Tracking
    status: ApplicationStatus;
    statusHistory: StatusChange[];

    // Employer Interaction
    viewedByEmployer: boolean;
    viewedAt?: Date | Timestamp;

    employerNotes?: string;
    employerRating?: number; // 1-5 stars

    interviewScheduled: boolean;
    interviewDate?: Date | Timestamp;
    interviewType?: 'phone' | 'video' | 'in_person';
    interviewNotes?: string;

    // Rejection
    rejectionReason?: string;
    rejectionFeedback?: string;

    // Offer
    offerSalary?: number;
    offerDetails?: string;
    offerAccepted?: boolean;

    // Hiring
    hiredAt?: Date | Timestamp;
    firstMonthSalary?: number; // For commission calculation

    // Source & Metadata
    source: ApplicationSource;
    referralCode?: string;

    // Timestamps
    appliedAt: Date | Timestamp;
    updatedAt: Date | Timestamp;
    withdrawnAt?: Date | Timestamp;

    // Flags
    isWithdrawn: boolean;
    isFlagged: boolean;
    flagReason?: string;
}

// ==================== STATUS CHANGE ====================

export interface StatusChange {
    id: string;
    from: ApplicationStatus;
    to: ApplicationStatus;
    changedBy: string; // userId (employer or system)
    changedAt: Date | Timestamp;
    note?: string;
}

// ==================== APPLICATION FILTERS ====================

export interface ApplicationFilters {
    // Status
    status?: ApplicationStatus[];

    // Job
    jobId?: string;
    jobTitle?: string;

    // Candidate
    candidateId?: string;

    // Match Score
    minMatchScore?: number;
    maxMatchScore?: number;

    // Date Range
    appliedAfter?: Date;
    appliedBefore?: Date;

    // Flags
    viewedOnly?: boolean;
    flaggedOnly?: boolean;
    withdrawnIncluded?: boolean;

    // Interview
    hasInterviewScheduled?: boolean;
}

// ==================== APPLICATION SORT ====================

export type ApplicationSortOption =
    | 'newest'
    | 'oldest'
    | 'match_score_high'
    | 'match_score_low'
    | 'status';

export interface ApplicationSortConfig {
    field: string;
    direction: 'asc' | 'desc';
}

export const APPLICATION_SORT_CONFIGS: Record<ApplicationSortOption, ApplicationSortConfig> = {
    newest: { field: 'appliedAt', direction: 'desc' },
    oldest: { field: 'appliedAt', direction: 'asc' },
    match_score_high: { field: 'matchScore', direction: 'desc' },
    match_score_low: { field: 'matchScore', direction: 'asc' },
    status: { field: 'status', direction: 'asc' },
};

// ==================== FORM DATA ====================

export interface ApplicationFormData {
    coverLetter?: string;
    customQuestionAnswers: QuestionAnswer[];
    cvUrl: string;
    videoUrl?: string;
}

export interface StatusUpdateFormData {
    status: ApplicationStatus;
    note?: string;
    rejectionReason?: string;
    rejectionFeedback?: string;
    interviewDate?: Date;
    interviewType?: 'phone' | 'video' | 'in_person';
    interviewNotes?: string;
    offerSalary?: number;
    offerDetails?: string;
    firstMonthSalary?: number;
}

// ==================== APPLICATION STATISTICS ====================

export interface ApplicationStatistics {
    // Overall
    total: number;

    // By Status
    pending: number;
    viewed: number;
    shortlisted: number;
    interviewed: number;
    offerExtended: number;
    rejected: number;
    hired: number;
    withdrawn: number;

    // Metrics
    averageMatchScore: number;
    viewRate: number; // % of applications viewed
    shortlistRate: number; // % of applications shortlisted
    interviewRate: number; // % of applications interviewed
    hireRate: number; // % of applications hired

    // Timing
    averageTimeToView: number; // hours
    averageTimeToShortlist: number; // days
    averageTimeToHire: number; // days
}

// ==================== CANDIDATE APPLICATION SUMMARY ====================

export interface CandidateApplicationSummary {
    totalApplications: number;
    pending: number;
    shortlisted: number;
    interviewed: number;
    rejected: number;
    hired: number;

    mostRecentApplication?: {
        jobTitle: string;
        companyName: string;
        appliedAt: Date;
        status: ApplicationStatus;
    };

    successRate: number; // % of applications that lead to interview or hire
}

// ==================== EMPLOYER APPLICATION SUMMARY ====================

export interface EmployerApplicationSummary {
    // Per Job
    jobId: string;
    jobTitle: string;

    totalApplications: number;
    newApplications: number; // Not yet viewed
    shortlisted: number;
    interviewed: number;
    hired: number;

    averageMatchScore: number;
    topCandidate?: {
        id: string;
        name: string;
        matchScore: number;
    };
}

// ==================== HELPER TYPES ====================

export type CreateApplicationData = Omit<
    Application,
    'id' | 'appliedAt' | 'updatedAt' | 'statusHistory' | 'viewedByEmployer' | 'isWithdrawn' | 'isFlagged'
>;

export type UpdateApplicationData = Partial<
    Omit<Application, 'id' | 'jobId' | 'candidateId' | 'employerId' | 'appliedAt'>
>;

// ==================== TYPE GUARDS ====================

export const isApplicationActive = (application: Application): boolean => {
    return !application.isWithdrawn &&
        application.status !== 'withdrawn' &&
        application.status !== 'hired';
};

export const isApplicationViewed = (application: Application): boolean => {
    return application.viewedByEmployer || application.status !== 'pending';
};

export const isApplicationShortlisted = (application: Application): boolean => {
    return application.status === 'shortlisted' ||
        application.status === 'interviewed' ||
        application.status === 'offer_extended' ||
        application.status === 'hired';
};

export const canWithdrawApplication = (application: Application): boolean => {
    return !application.isWithdrawn &&
        application.status !== 'hired' &&
        application.status !== 'rejected';
};

export const canScheduleInterview = (application: Application): boolean => {
    return application.status === 'shortlisted' ||
        application.status === 'interviewed';
};

export const canExtendOffer = (application: Application): boolean => {
    return application.status === 'interviewed';
};

export const canMarkAsHired = (application: Application): boolean => {
    return application.status === 'offer_extended' ||
        application.status === 'interviewed';
};

// ==================== STATUS FLOW ====================

export const VALID_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
    pending: ['viewed', 'shortlisted', 'rejected', 'withdrawn'],
    viewed: ['shortlisted', 'rejected', 'withdrawn'],
    shortlisted: ['interviewed', 'rejected', 'withdrawn'],
    interviewed: ['offer_extended', 'rejected', 'withdrawn'],
    offer_extended: ['hired', 'rejected', 'withdrawn'],
    rejected: [], // Final state
    hired: [], // Final state
    withdrawn: [], // Final state
};

export const canTransitionTo = (
    currentStatus: ApplicationStatus,
    newStatus: ApplicationStatus
): boolean => {
    return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
};

// ==================== CONSTANTS ====================

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
    pending: 'Pending Review',
    viewed: 'Viewed',
    shortlisted: 'Shortlisted',
    interviewed: 'Interview Scheduled',
    offer_extended: 'Offer Extended',
    rejected: 'Rejected',
    hired: 'Hired',
    withdrawn: 'Withdrawn',
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
    pending: 'gray',
    viewed: 'blue',
    shortlisted: 'yellow',
    interviewed: 'purple',
    offer_extended: 'green',
    rejected: 'red',
    hired: 'emerald',
    withdrawn: 'gray',
};

export const APPLICATION_STATUS_ICONS: Record<ApplicationStatus, string> = {
    pending: 'Clock',
    viewed: 'Eye',
    shortlisted: 'Star',
    interviewed: 'Calendar',
    offer_extended: 'Award',
    rejected: 'X',
    hired: 'Check',
    withdrawn: 'Ban',
};

// ==================== DEFAULT VALUES ====================

export const DEFAULT_APPLICATION_FILTERS: ApplicationFilters = {
    status: [],
    jobId: undefined,
    jobTitle: undefined,
    candidateId: undefined,
    minMatchScore: 0,
    maxMatchScore: 100,
    appliedAfter: undefined,
    appliedBefore: undefined,
    viewedOnly: false,
    flaggedOnly: false,
    withdrawnIncluded: false,
    hasInterviewScheduled: false,
};

// ==================== MATCH SCORE THRESHOLDS ====================

export const MATCH_SCORE_EXCELLENT = 80;
export const MATCH_SCORE_GOOD = 60;
export const MATCH_SCORE_FAIR = 40;

export const getMatchScoreLabel = (score: number): string => {
    if (score >= MATCH_SCORE_EXCELLENT) return 'Excellent Match';
    if (score >= MATCH_SCORE_GOOD) return 'Good Match';
    if (score >= MATCH_SCORE_FAIR) return 'Fair Match';
    return 'Low Match';
};

export const getMatchScoreColor = (score: number): string => {
    if (score >= MATCH_SCORE_EXCELLENT) return 'green';
    if (score >= MATCH_SCORE_GOOD) return 'yellow';
    if (score >= MATCH_SCORE_FAIR) return 'orange';
    return 'red';
};