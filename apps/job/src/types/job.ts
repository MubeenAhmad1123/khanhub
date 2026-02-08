// Job Types - Complete type definitions for job listings

import { Timestamp } from 'firebase/firestore';

// ==================== JOB ENUMS ====================

export type JobStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'closed';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

export type JobCategory =
    | 'healthcare'
    | 'technology'
    | 'engineering'
    | 'education'
    | 'finance'
    | 'sales_marketing'
    | 'customer_service'
    | 'human_resources'
    | 'operations'
    | 'legal'
    | 'design'
    | 'manufacturing'
    | 'construction'
    | 'hospitality'
    | 'transportation'
    | 'retail'
    | 'other';

// ==================== JOB LISTING ====================

export interface Job {
    // IDs
    id: string;
    employerId: string;

    // Company Info
    companyName: string;
    companyLogo?: string;
    companyWebsite?: string;

    // Basic Job Info
    title: string;
    description: string;
    category: JobCategory;

    // Location
    location: string;
    city: string;
    isRemote: boolean;
    remoteType?: 'fully_remote' | 'hybrid' | 'on_site';

    // Employment Details
    employmentType: EmploymentType;
    experienceLevel: ExperienceLevel;
    minExperience: number; // years
    maxExperience?: number; // years

    // Salary
    salaryMin: number;
    salaryMax: number;
    currency: 'PKR';
    salaryCurrency: string; // "PKR"
    salaryPeriod: 'monthly' | 'yearly';
    showSalary: boolean; // Whether to display salary publicly

    // Requirements
    requiredSkills: string[];
    preferredSkills: string[];
    requiredQualifications: string[];
    preferredQualifications: string[];
    responsibilities: string[];

    // Benefits & Perks
    benefits?: string[];
    perks?: string[];

    // Additional Questions (for applicants)
    customQuestions?: CustomQuestion[];

    // Status & Visibility
    status: JobStatus;
    rejectionReason?: string;
    isFeatured: boolean;
    isPremium: boolean; // Premium job posting

    // Application Settings
    acceptingApplications: boolean;
    maxApplications?: number;
    applicationDeadline?: Date | Timestamp;

    // Contact (only visible to premium users or post-application)
    contactEmail?: string;
    contactPhone?: string;
    contactPerson?: string;

    // Metadata
    postedAt: Date | Timestamp;
    approvedAt?: Date | Timestamp;
    closedAt?: Date | Timestamp;
    expiresAt?: Date | Timestamp;

    // Statistics
    applicantCount: number;
    viewCount: number;
    savedCount: number;

    // Timestamps
    createdAt: Date | Timestamp;
    updatedAt: Date | Timestamp;
}

// ==================== CUSTOM QUESTIONS ====================

export type QuestionType = 'text' | 'textarea' | 'multiple_choice' | 'yes_no' | 'number';

export interface CustomQuestion {
    id: string;
    question: string;
    type: QuestionType;
    required: boolean;
    options?: string[]; // For multiple choice
    placeholder?: string;
}

export interface QuestionAnswer {
    questionId: string;
    question: string;
    answer: string | number | boolean;
}

// ==================== JOB FILTERS ====================

export interface JobFilters {
    // Search
    searchQuery?: string;

    // Location
    location?: string;
    cities?: string[];
    remoteOnly?: boolean;

    // Category & Type
    categories?: JobCategory[];
    employmentTypes?: EmploymentType[];
    experienceLevel?: ExperienceLevel[];

    // Salary
    minSalary?: number;
    maxSalary?: number;

    // Skills
    requiredSkills?: string[];

    // Other
    postedWithin?: 1 | 7 | 30 | 90; // days
    featuredOnly?: boolean;
}

// ==================== JOB SORT OPTIONS ====================

export type JobSortOption =
    | 'newest'
    | 'oldest'
    | 'salary_high'
    | 'salary_low'
    | 'match_score'
    | 'most_viewed'
    | 'most_applications';

export interface JobSortConfig {
    field: string;
    direction: 'asc' | 'desc';
}

export const JOB_SORT_CONFIGS: Record<JobSortOption, JobSortConfig> = {
    newest: { field: 'postedAt', direction: 'desc' },
    oldest: { field: 'postedAt', direction: 'asc' },
    salary_high: { field: 'salaryMax', direction: 'desc' },
    salary_low: { field: 'salaryMin', direction: 'asc' },
    match_score: { field: 'matchScore', direction: 'desc' }, // Calculated client-side
    most_viewed: { field: 'viewCount', direction: 'desc' },
    most_applications: { field: 'applicantCount', direction: 'desc' },
};

// ==================== JOB WITH MATCH SCORE ====================

export interface JobWithMatchScore extends Job {
    matchScore: number; // 0-100
    matchBreakdown: MatchScoreBreakdown;
}

export interface MatchScoreBreakdown {
    skillsMatch: number; // 0-40
    experienceMatch: number; // 0-30
    locationMatch: number; // 0-15
    educationMatch: number; // 0-15
    total: number; // 0-100
    matchedSkills: string[];
    missingSkills: string[];
}

// ==================== SAVED JOBS ====================

export interface SavedJob {
    id: string;
    userId: string;
    jobId: string;
    savedAt: Date | Timestamp;
    notes?: string;
}

// ==================== JOB STATISTICS ====================

export interface JobStatistics {
    totalJobs: number;
    activeJobs: number;
    pendingJobs: number;
    closedJobs: number;

    totalApplications: number;
    averageApplicationsPerJob: number;

    byCategory: Record<JobCategory, number>;
    byLocation: Record<string, number>;
    byEmploymentType: Record<EmploymentType, number>;

    featuredJobs: number;
    premiumJobs: number;
}

// ==================== FORM DATA ====================

export interface JobFormData {
    // Basic Info
    title: string;
    description: string;
    category: JobCategory;

    // Location
    location: string;
    city: string;
    isRemote: boolean;
    remoteType?: 'fully_remote' | 'hybrid' | 'on_site';

    // Employment
    employmentType: EmploymentType;
    experienceLevel: ExperienceLevel;
    minExperience: number;
    maxExperience?: number;

    // Salary
    salaryMin: number;
    salaryMax: number;
    salaryPeriod: 'monthly' | 'yearly';
    showSalary: boolean;

    // Requirements
    requiredSkills: string[];
    preferredSkills: string[];
    requiredQualifications: string[];
    preferredQualifications: string[];
    responsibilities: string[];

    // Benefits
    benefits: string[];
    perks: string[];

    // Application Settings
    maxApplications?: number;
    applicationDeadline?: Date;
    customQuestions: CustomQuestion[];

    // Contact
    contactEmail?: string;
    contactPhone?: string;
    contactPerson?: string;
}

// ==================== JOB CARD DISPLAY ====================

export interface JobCardData {
    id: string;
    title: string;
    companyName: string;
    companyLogo?: string;
    location: string;
    isRemote: boolean;
    employmentType: EmploymentType;
    experienceLevel: ExperienceLevel;
    salaryMin: number;
    salaryMax: number;
    showSalary: boolean;
    postedAt: Date | Timestamp;
    matchScore?: number;
    isFeatured: boolean;
    applicantCount: number;
    // Blurred for free users
    showFullDetails: boolean;
}

// ==================== HELPER TYPES ====================

export type CreateJobData = Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'postedAt' | 'applicantCount' | 'viewCount' | 'savedCount' | 'status'>;
export type UpdateJobData = Partial<Omit<Job, 'id' | 'employerId' | 'createdAt' | 'postedAt'>>;

// ==================== TYPE GUARDS ====================

export const isActiveJob = (job: Job): boolean => {
    if (job.status !== 'active') return false;
    if (!job.acceptingApplications) return false;

    if (job.expiresAt) {
        const expiryDate = job.expiresAt instanceof Date
            ? job.expiresAt
            : job.expiresAt.toDate();
        if (expiryDate < new Date()) return false;
    }

    if (job.applicationDeadline) {
        const deadline = job.applicationDeadline instanceof Date
            ? job.applicationDeadline
            : job.applicationDeadline.toDate();
        if (deadline < new Date()) return false;
    }

    return true;
};

export const isJobExpired = (job: Job): boolean => {
    if (job.expiresAt) {
        const expiryDate = job.expiresAt instanceof Date
            ? job.expiresAt
            : job.expiresAt.toDate();
        return expiryDate < new Date();
    }
    return false;
};

export const canApplyToJob = (job: Job): boolean => {
    if (!isActiveJob(job)) return false;

    if (job.maxApplications && job.applicantCount >= job.maxApplications) {
        return false;
    }

    return true;
};

export const isJobPendingApproval = (job: Job): boolean => {
    return job.status === 'pending';
};

export const isJobRejected = (job: Job): boolean => {
    return job.status === 'rejected';
};

// ==================== CONSTANTS ====================

export const JOB_CATEGORIES: Record<JobCategory, string> = {
    healthcare: 'Healthcare',
    technology: 'Technology',
    engineering: 'Engineering',
    education: 'Education',
    finance: 'Finance',
    sales_marketing: 'Sales & Marketing',
    customer_service: 'Customer Service',
    human_resources: 'Human Resources',
    operations: 'Operations',
    legal: 'Legal',
    design: 'Design',
    manufacturing: 'Manufacturing',
    construction: 'Construction',
    hospitality: 'Hospitality',
    transportation: 'Transportation',
    retail: 'Retail',
    other: 'Other',
};

export const EMPLOYMENT_TYPES: Record<EmploymentType, string> = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    'contract': 'Contract',
    'internship': 'Internship',
};

export const EXPERIENCE_LEVELS: Record<ExperienceLevel, string> = {
    entry: 'Entry Level',
    mid: 'Mid Level',
    senior: 'Senior Level',
    lead: 'Lead',
    executive: 'Executive',
};

export const PAKISTANI_CITIES = [
    'Lahore',
    'Karachi',
    'Islamabad',
    'Rawalpindi',
    'Faisalabad',
    'Multan',
    'Peshawar',
    'Quetta',
    'Sialkot',
    'Gujranwala',
    'Hyderabad',
    'Abbottabad',
    'Sargodha',
    'Bahawalpur',
    'Sukkur',
    'Larkana',
    'Mardan',
    'Gujrat',
    'Kasur',
    'Rahim Yar Khan',
];

export const PAKISTANI_PROVINCES = [
    'Punjab',
    'Sindh',
    'Khyber Pakhtunkhwa',
    'Balochistan',
    'Azad Kashmir',
    'Gilgit-Baltistan',
    'Islamabad Capital Territory',
];

// ==================== DEFAULT VALUES ====================

export const DEFAULT_JOB_FILTERS: JobFilters = {
    searchQuery: '',
    location: undefined,
    cities: [],
    remoteOnly: false,
    categories: [],
    employmentTypes: [],
    experienceLevel: [],
    minSalary: undefined,
    maxSalary: undefined,
    requiredSkills: [],
    postedWithin: undefined,
    featuredOnly: false,
};

export const DEFAULT_CUSTOM_QUESTION: CustomQuestion = {
    id: '',
    question: '',
    type: 'text',
    required: false,
    options: [],
    placeholder: '',
};

// ==================== SALARY RANGES ====================

export const SALARY_RANGES = [
    { min: 0, max: 30000, label: 'Under 30,000' },
    { min: 30000, max: 50000, label: '30,000 - 50,000' },
    { min: 50000, max: 75000, label: '50,000 - 75,000' },
    { min: 75000, max: 100000, label: '75,000 - 100,000' },
    { min: 100000, max: 150000, label: '100,000 - 150,000' },
    { min: 150000, max: 200000, label: '150,000 - 200,000' },
    { min: 200000, max: 300000, label: '200,000 - 300,000' },
    { min: 300000, max: 500000, label: '300,000 - 500,000' },
    { min: 500000, max: null, label: '500,000+' },
];