// User Types - Complete type definitions for all user-related data

import { Timestamp } from 'firebase/firestore';

// ==================== BASE USER TYPES ====================

import { PaymentStatus } from './payment';

export type UserRole = 'job_seeker' | 'employer' | 'admin';
// PaymentStatus imported from ./payment
export type DegreeLevel = 'high_school' | 'bachelors' | 'masters' | 'phd';

// ==================== USER PROFILE ====================

export interface WorkExperience {
    id: string;
    title: string;
    company: string;
    location: string;
    startDate: string; // Format: "YYYY-MM"
    endDate?: string; // Format: "YYYY-MM" or null if current
    current: boolean;
    description: string;
    skills?: string[];
}

export interface Education {
    id: string;
    degree: string;
    degreeLevel: DegreeLevel;
    institution: string;
    location: string;
    fieldOfStudy: string;
    startYear: string;
    endYear?: string;
    current: boolean;
    grade?: string;
    description?: string;
}

export interface Certification {
    id: string;
    name: string;
    issuer: string;
    issueDate: string; // Format: "YYYY-MM"
    expiryDate?: string; // Format: "YYYY-MM"
    credentialId?: string;
    credentialUrl?: string;
}

export interface Project {
    id: string;
    title: string;
    description: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    current: boolean;
}

export interface Language {
    id: string;
    name: string;
    proficiency: 'Beginner' | 'Intermediate' | 'Fluent' | 'Native';
}

export interface JobSeekerProfile {
    // Basic Info
    fullName?: string; // Legacy
    name?: string;     // Flat
    phone?: string;
    location?: string; // Legacy
    city?: string;     // Flat
    bio?: string;      // Legacy
    professionalSummary?: string; // Flat
    gender?: string;
    dateOfBirth?: string;

    // Professional Info
    industry?: string;
    subcategory?: string;
    jobTitle?: string;
    desiredSalary?: string;
    currentJobTitle?: string;
    preferredSubcategory?: string; // Legacy
    desiredSubcategory?: string;   // Flat
    preferredJobTitle?: string;    // Legacy
    desiredJobTitle?: string;      // Flat
    yearsOfExperience?: number;    // Legacy
    totalExperience?: string;      // Flat
    skills?: string[];
    isEmployed?: boolean;

    // Experience & Education
    // ... (rest of interface)
    experience?: any[];
    education?: any[];
    certifications?: any[];
    projects?: Project[];
    languages?: Language[];

    // Files
    cvUrl?: string;
    cvFileName?: string;
    cvUploadedAt?: Date;
    videoUrl?: string;
    videoResume?: string; // Legacy alias for videoUrl
    videoFileName?: string;
    videoUploadedAt?: Date;

    // Profile Completion
    profileStrength: number; // 0-100
    completedSections: {
        basicInfo: boolean;
        cv: boolean;
        video: boolean;
        skills: boolean;
        experience: boolean;
        education: boolean;
        certifications: boolean;
    };

    // Preferences
    desiredSalaryMin?: number;
    desiredSalaryMax?: number;
    desiredLocations: string[];
    remoteOnly: boolean;
    willingToRelocate: boolean;
    onboardingCompleted: boolean;
}

// ==================== COMPANY PROFILE ====================

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+';
export type Industry =
    | 'healthcare'
    | 'technology'
    | 'engineering'
    | 'education'
    | 'finance'
    | 'retail'
    | 'manufacturing'
    | 'construction'
    | 'hospitality'
    | 'transportation'
    | 'other';

export interface CompanyProfile {
    name: string;
    logo?: string;
    website?: string;
    industry: Industry;
    size: CompanySize;
    location: string;
    description: string;
    foundedYear?: number;

    // Social Media
    linkedin?: string;
    facebook?: string;
    twitter?: string;

    // Additional
    benefits?: string[];
    culture?: string;
    perks?: string[];
}

// ==================== BASE USER ====================

export interface User {
    // Firebase Auth
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    emailVerified: boolean;

    // Role
    role: UserRole;

    // Payment Status (for job seekers)
    paymentStatus: PaymentStatus;
    isPremium: boolean;
    premiumStartDate?: Date | Timestamp;
    premiumEndDate?: Date | Timestamp;
    premiumExpiresAt?: Date | Timestamp;

    // Unified Registration/Onboarding Fields (Flat Schema)
    registrationMethod?: 'email' | 'google';

    // Account Information
    name?: string;
    phone?: string;
    phoneNumber?: string; // For Firebase Auth/Legacy compatibility

    // Personal Information
    dateOfBirth?: string;         // "YYYY-MM-DD"
    gender?: string;
    city?: string;
    careerLevel?: string;
    totalExperience?: string;
    desiredSalary?: string;

    // Professional Information
    desiredJobTitle?: string;
    desiredIndustry?: string;
    skills?: string[];
    languages?: { language: string, proficiency: string }[];
    professionalSummary?: string;

    // Education
    education?: {
        degreeTitle: string;
        fieldOfStudy: string;
        institution: string;
        city: string;
        completionYear: string;
        cgpa?: string;
    }[];

    // Experience
    experience?: {
        jobTitle: string;
        company: string;
        industry: string;
        city: string;
        startMonth: string;
        startYear: string;
        endMonth: string;
        endYear: string;
        currentlyWorking: boolean;
        managedTeam: boolean;
        salary?: string;
        description?: string;
    }[];

    isFresher?: boolean;

    // Employer Specific
    companyName?: string;
    companyLocation?: string;
    companySize?: string;
    companyType?: string;
    yearEstablished?: string;
    website?: string;
    whatsapp?: string;
    logoURL?: string;
    hrName?: string;
    hrFullName?: string;
    hrPhone?: string;

    firstJobPost?: {
        jobTitle: string;
        skills: string[];
        experienceRequired: string;
        city: string;
        workType: string;
        maxBudget: number;
        hideSalary: boolean;
        otherRequirements?: string;
    };

    // Profile Completion
    profileCompletion?: number;   // 0-100
    videoUploadUnlocked?: boolean;

    // Usage Limits
    applicationsUsed: number; // For free users (max 10)
    premiumJobsViewed: number; // For premium users (max 100)

    // Points System
    points: number;
    pointsHistory: PointsHistoryEntry[];

    // Legacy/Nested profile data (keeping for compatibility during migration if needed)
    profile?: JobSeekerProfile;
    company?: CompanyProfile;

    // Metadata
    createdAt: Date | Timestamp;
    updatedAt: Date | Timestamp;
    lastLoginAt?: Date | Timestamp;

    // Flags
    isActive: boolean;
    isFeatured: boolean;
    isBanned: boolean;
    banReason?: string;
    onboardingCompleted?: boolean;
    flags?: any[];
    // Video Upload Feature (Phase 2)
    video_upload_enabled: boolean;
    video_upload_payment_id?: string;
    profile_status: 'incomplete' | 'payment_pending' | 'video_pending' | 'active';
    category: 'jobs' | 'healthcare' | 'education' | 'marriage' | 'domestic' | 'legal' | 'realestate' | 'it';
    profileFields: {
        // jobs provider
        jobTitle?: string;
        skills?: string[];
        experienceLevel?: string;
        // jobs seeker
        companyName?: string;
        hiringFor?: string;
        salaryOffered?: number;
        // professionals
        specialization?: string;
        subject?: string;
        gradeLevel?: string;
        teachingMode?: 'Online' | 'In-person';
        // marriage
        presentingFor?: string;
        lookingFor?: string;
    };
    industry?: string;
    subcategory?: string;
    videos_watched?: number;
    profile_views?: number;
    followers: string[];
    following: string[];
    totalLikes: number;
    savedVideos: string[];
    likedVideos: string[];
    isVerified: boolean;
}

// ==================== ROLE-SPECIFIC USER TYPES ====================

export interface JobSeeker extends User {
    role: 'job_seeker';
    profile: JobSeekerProfile;
}

export interface Employer extends User {
    role: 'employer';
    company: CompanyProfile;
}

export interface AdminUser extends User {
    role: 'admin';
}


// ==================== POINTS SYSTEM ====================

export type PointsActionType =
    | 'profile_completed'
    | 'cv_uploaded'
    | 'video_uploaded'
    | 'skill_added'
    | 'experience_added'
    | 'education_added'
    | 'certification_added'
    | 'job_applied'
    | 'application_viewed'
    | 'profile_viewed'
    | 'referral_completed'
    | 'premium_upgrade';

export interface PointsHistoryEntry {
    id: string;
    action: PointsActionType;
    points: number;
    description: string;
    timestamp: Date | Timestamp;
    metadata?: Record<string, any>;
}

export const POINTS_VALUES: Record<PointsActionType, number> = {
    profile_completed: 10,
    cv_uploaded: 15,
    video_uploaded: 20,
    skill_added: 2,
    experience_added: 10,
    education_added: 10,
    certification_added: 10,
    job_applied: 5,
    application_viewed: 2,
    profile_viewed: 3,
    referral_completed: 50,
    premium_upgrade: 100,
};

// ==================== PROFILE STRENGTH CALCULATION ====================

export interface ProfileStrengthBreakdown {
    cv: number; // 20 points
    video: number; // 20 points
    skills: number; // 15 points
    experience: number; // 15 points
    education: number; // 10 points
    bio: number; // 10 points
    certifications: number; // 10 points
    total: number; // 0-100
}

// ==================== USER PREFERENCES ====================

export interface UserPreferences {
    emailNotifications: {
        newJobs: boolean;
        applicationUpdates: boolean;
        premiumExpiry: boolean;
        weeklyDigest: boolean;
    };
    smsNotifications: {
        applicationUpdates: boolean;
        interviews: boolean;
    };
    visibility: {
        showProfileToEmployers: boolean;
        showEmailOnProfile: boolean;
        showPhoneOnProfile: boolean;
    };
}

// ==================== USER STATISTICS ====================

export interface UserStatistics {
    // Job Seeker Stats
    totalApplications?: number;
    pendingApplications?: number;
    shortlistedApplications?: number;
    rejectedApplications?: number;
    hiredApplications?: number;

    profileViews?: number;
    cvDownloads?: number;

    // Employer Stats
    totalJobsPosted?: number;
    activeJobs?: number;
    totalApplicationsReceived?: number;
    totalHires?: number;

    averageTimeToHire?: number; // in days
}

// ==================== FORM DATA TYPES ====================

export interface RegisterFormData {
    displayName: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: UserRole;
    agreeToTerms: boolean;
}

export interface LoginFormData {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface ProfileBasicInfoFormData {
    displayName: string;
    phone: string;
    location: string;
    bio: string;
    currentJobTitle?: string;
    preferredJobTitle?: string;
    yearsOfExperience: number;
}

export interface CompanyInfoFormData {
    name: string;
    website?: string;
    industry: Industry;
    size: CompanySize;
    location: string;
    description: string;
    foundedYear?: number;
}

// ==================== HELPER TYPES ====================

export interface UserWithId extends User {
    id: string;
}

export type CreateUserData = Omit<User, 'uid' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>;
export type UpdateUserData = Partial<Omit<User, 'uid' | 'email' | 'createdAt'>>;

// ==================== TYPE GUARDS ====================

export const isJobSeeker = (user: User): user is JobSeeker => {
    return user.role === 'job_seeker' && !!user.profile;
};

export const isEmployer = (user: User): user is Employer => {
    return user.role === 'employer' && !!user.company;
};

export const isAdmin = (user: User): boolean => {
    return user.role === 'admin';
};

export const isPremiumUser = (user: User): boolean => {
    if (!user.isPremium) return false;
    if (!user.premiumEndDate) return false;

    const endDate = user.premiumEndDate instanceof Date
        ? user.premiumEndDate
        : user.premiumEndDate.toDate();

    return endDate > new Date();
};

export const hasPaymentApproved = (user: User): boolean => {
    return user.paymentStatus === 'approved';
};

export const canApplyToJobs = (user: User): boolean => {
    if (!hasPaymentApproved(user)) return false;

    // Premium users can apply unlimited
    if (isPremiumUser(user)) return true;

    // Free users limited to 10 applications
    return user.applicationsUsed < 10;
};

export const canViewJobDetails = (user: User, jobsViewed: number): boolean => {
    // Employers and admins can always view
    if (user.role !== 'job_seeker') return true;

    // Premium users limited to 100 full job views
    if (isPremiumUser(user)) {
        return jobsViewed < 100;
    }

    // Free users can't see full details
    return false;
};

// ==================== DEFAULT VALUES ====================

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
    emailNotifications: {
        newJobs: true,
        applicationUpdates: true,
        premiumExpiry: true,
        weeklyDigest: true,
    },
    smsNotifications: {
        applicationUpdates: false,
        interviews: false,
    },
    visibility: {
        showProfileToEmployers: true,
        showEmailOnProfile: false,
        showPhoneOnProfile: false,
    },
};

export const DEFAULT_PROFILE_STRENGTH: ProfileStrengthBreakdown = {
    cv: 0,
    video: 0,
    skills: 0,
    experience: 0,
    education: 0,
    bio: 0,
    certifications: 0,
    total: 0,
};