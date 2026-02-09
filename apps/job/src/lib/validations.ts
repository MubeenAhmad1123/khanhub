// ==========================================
// ZOD VALIDATION SCHEMAS (FIXED IMPORTS)
// ==========================================
// Runtime validation for all Firestore documents and forms

import { z } from 'zod';
import {
    LIMITS,
    PRICING,
} from '@/types/DATABASE_SCHEMA'; // ✅ Fixed import path

// Define runtime constants for types
const UserRoleValues = ['job_seeker', 'employer', 'admin'] as const;
const JobCategoryValues = ['Engineering', 'Design', 'Marketing', 'Sales', 'Customer Support', 'Product', 'Finance', 'HR', 'Legal', 'Operations', 'Other'] as const;
const EmploymentTypeValues = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Temporary'] as const;
const ExperienceLevelValues = ['Entry Level', 'Mid Level', 'Senior Level', 'Lead', 'Manager', 'Executive'] as const;
const JobStatusValues = ['Draft', 'Pending', 'Published', 'Closed', 'Rejected', 'Expired'] as const;
const ApplicationStatusValues = ['Applied', 'Viewed', 'Shortlisted', 'Interviewing', 'Offer', 'Hired', 'Rejected', 'Withdrawn'] as const;
const PaymentTypeValues = ['Registration', 'Premium', 'Placement', 'Other'] as const;
const PaymentStatusValues = ['Pending', 'Approved', 'Rejected', 'Refunded'] as const;
const PlacementStatusValues = ['Pending', 'Active', 'Completed', 'Disputed'] as const;

// ==========================================
// USER SCHEMAS
// ==========================================

export const WorkExperienceSchema = z.object({
    id: z.string().uuid(),
    company: z.string().min(1, 'Company name is required'),
    jobTitle: z.string().min(1, 'Job title is required'),
    startDate: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
    endDate: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM').optional(),
    isCurrent: z.boolean(),
    description: z.string().optional(),
    location: z.string().optional(),
});

export const EducationSchema = z.object({
    id: z.string().uuid(),
    institution: z.string().min(1, 'Institution is required'),
    degree: z.string().min(1, 'Degree is required'),
    fieldOfStudy: z.string().min(1, 'Field of study is required'),
    startYear: z.number().min(1950).max(new Date().getFullYear()),
    endYear: z.number().min(1950).max(new Date().getFullYear() + 10).optional(),
    grade: z.string().optional(),
});

export const CertificationSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1, 'Certification name is required'),
    issuingOrganization: z.string().min(1, 'Issuing organization is required'),
    issueDate: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
    expiryDate: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM').optional(),
    credentialId: z.string().optional(),
    credentialUrl: z.string().url().optional(),
});

export const JobSeekerSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    role: z.literal('job_seeker'),
    createdAt: z.any(), // Timestamp
    updatedAt: z.any(), // Timestamp
    emailVerified: z.boolean(),
    phoneNumber: z.string().regex(/^(\+92|0)?[0-9]{10}$/, 'Invalid Pakistani phone number').optional(),

    paymentApproved: z.boolean(),
    paymentId: z.string().optional(),
    registrationDate: z.any().optional(), // Timestamp

    isPremium: z.boolean(),
    premiumExpiresAt: z.any().optional(), // Timestamp
    premiumJobsViewed: z.number().min(0).max(LIMITS.PREMIUM_JOB_VIEW_QUOTA),

    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    profilePhoto: z.string().url().optional(),
    currentJobTitle: z.string().optional(),
    preferredJobTitle: z.string().optional(),
    bio: z.string().max(500).optional(),

    cvUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional(),

    profileStrength: z.number().min(0).max(100),

    skills: z.array(z.string()).default([]),
    experience: z.array(WorkExperienceSchema).default([]),
    education: z.array(EducationSchema).default([]),
    certifications: z.array(CertificationSchema).default([]),

    city: z.string().optional(),
    country: z.string().default('Pakistan'),

    applicationCount: z.number().min(0).default(0),
    applicationQuota: z.number().min(0).default(LIMITS.FREE_APPLICATION_QUOTA),

    totalPoints: z.number().min(0).default(0),
    savedJobIds: z.array(z.string()).default([]),

    desiredSalaryMin: z.number().positive().optional(),
    desiredSalaryMax: z.number().positive().optional(),
    openToRemote: z.boolean().default(false),
});

export const EmployerSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    role: z.literal('employer'),
    createdAt: z.any(), // Timestamp
    updatedAt: z.any(), // Timestamp
    emailVerified: z.boolean(),
    phoneNumber: z.string().regex(/^(\+92|0)?[0-9]{10}$/, 'Invalid Pakistani phone number').optional(),

    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
    companyLogo: z.string().url().optional(),
    companyWebsite: z.string().url().optional(),
    companyDescription: z.string().max(1000).optional(),
    industry: z.string().optional(),
    companySize: z.string().optional(),

    contactPersonName: z.string().min(2, 'Contact person name is required'),
    contactPhone: z.string().regex(/^(\+92|0)?[0-9]{10}$/, 'Invalid Pakistani phone number'),

    city: z.string().min(1, 'City is required'),
    country: z.string().default('Pakistan'),
    address: z.string().optional(),

    jobsPosted: z.number().min(0).default(0),
    activeJobs: z.number().min(0).default(0),
    candidatesHired: z.number().min(0).default(0),
});

// ==========================================
// JOB SCHEMAS
// ==========================================

export const JobSchema = z.object({
    id: z.string(),

    employerId: z.string(),
    companyName: z.string().min(2, 'Company name is required'),
    companyLogo: z.string().url().optional(),

    title: z.string().min(5, 'Job title must be at least 5 characters'),
    description: z.string().min(50, 'Description must be at least 50 characters'),
    responsibilities: z.array(z.string().min(1)).min(1, 'Add at least 1 responsibility'),
    requirements: z.array(z.string().min(1)).min(1, 'Add at least 1 requirement'),
    benefits: z.array(z.string().min(1)).optional(),

    category: z.enum(JobCategoryValues),
    employmentType: z.enum(EmploymentTypeValues),
    experienceLevel: z.enum(ExperienceLevelValues),

    city: z.string().min(1, 'City is required'),
    country: z.string().default('Pakistan'),
    isRemote: z.boolean().default(false),

    salaryMin: z.number().positive().optional(),
    salaryMax: z.number().positive().optional(),
    salaryCurrency: z.string().default('PKR'),

    requiredSkills: z.array(z.string()).min(1, 'Add at least 1 required skill'),
    minimumExperience: z.number().min(0, 'Minimum experience cannot be negative'),
    educationLevel: z.string().optional(),

    contactEmail: z.string().email().optional(),
    contactPhone: z.string().regex(/^(\+92|0)?[0-9]{10}$/).optional(),
    applicationUrl: z.string().url().optional(),

    status: z.enum(JobStatusValues).default('Pending'),
    rejectionReason: z.string().optional(),
    isFeatured: z.boolean().default(false),

    postedAt: z.any(), // Timestamp
    expiresAt: z.any().optional(), // Timestamp
    approvedAt: z.any().optional(), // Timestamp

    viewCount: z.number().min(0).default(0),
    applicationCount: z.number().min(0).default(0),
}).refine((data) => {
    if (data.salaryMin && data.salaryMax) {
        return data.salaryMax >= data.salaryMin;
    }
    return true;
}, {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['salaryMax'],
});

// ==========================================
// APPLICATION SCHEMAS
// ==========================================

export const ApplicationSchema = z.object({
    id: z.string(),

    jobId: z.string(),
    jobTitle: z.string(),
    jobSeekerId: z.string(),
    employerId: z.string(),

    applicantName: z.string(),
    applicantEmail: z.string().email(),
    applicantPhone: z.string().optional(),
    applicantCvUrl: z.string().url().optional(),
    applicantVideoUrl: z.string().url().optional(),

    coverLetter: z.string().max(1000).optional(),

    matchScore: z.number().min(0).max(100),

    status: z.enum(ApplicationStatusValues).default('Applied'),

    appliedAt: z.any(), // Timestamp
    updatedAt: z.any(), // Timestamp

    employerNotes: z.string().max(500).optional(),
    interviewDate: z.any().optional(), // Timestamp
});

// ==========================================
// PAYMENT SCHEMAS
// ==========================================

export const PaymentSchema = z.object({
    id: z.string(),

    userId: z.string(),
    userEmail: z.string().email(),

    type: z.enum(PaymentTypeValues),
    amount: z.number().refine((val) => {
        return val === PRICING.REGISTRATION_FEE || val === PRICING.PREMIUM_MONTHLY;
    }, 'Invalid payment amount'),

    screenshotUrl: z.string().url(),
    transactionId: z.string().optional(),

    status: z.enum(PaymentStatusValues).default('Pending'),
    rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters').optional(),

    submittedAt: z.any(), // Timestamp
    reviewedAt: z.any().optional(), // Timestamp

    reviewedBy: z.string().optional(),
});

// ==========================================
// PLACEMENT SCHEMAS
// ==========================================

export const PlacementSchema = z.object({
    id: z.string(),

    jobId: z.string(),
    jobTitle: z.string(),
    applicationId: z.string(),
    jobSeekerId: z.string(),
    employerId: z.string(),

    candidateName: z.string(),
    candidateEmail: z.string().email(),

    companyName: z.string(),

    firstMonthSalary: z.number().positive('Salary must be positive'),
    commissionRate: z.number().min(0).max(100).default(50),
    commissionAmount: z.number().positive(),

    status: z.enum(PlacementStatusValues).default('Pending'),

    collectedAt: z.any().optional(), // Timestamp

    hiredAt: z.any(), // Timestamp
    createdAt: z.any(), // Timestamp

    notes: z.string().max(500).optional(),
}).refine((data) => {
    // Auto-calculate commission amount
    const expectedCommission = data.firstMonthSalary * (data.commissionRate / 100);
    return Math.abs(data.commissionAmount - expectedCommission) < 0.01; // Allow for floating point errors
}, {
    message: 'Commission amount must equal salary × commission rate',
    path: ['commissionAmount'],
});

// ==========================================
// FORM VALIDATION SCHEMAS (Partial for updates)
// ==========================================

export const RegisterJobSeekerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    phoneNumber: z.string().regex(/^(\+92|0)?[0-9]{10}$/, 'Invalid Pakistani phone number'),
});

export const RegisterEmployerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
    contactPersonName: z.string().min(2, 'Contact person name is required'),
    contactPhone: z.string().regex(/^(\+92|0)?[0-9]{10}$/, 'Invalid Pakistani phone number'),
    city: z.string().min(1, 'City is required'),
});

export const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const SubmitPaymentSchema = z.object({
    type: z.enum(PaymentTypeValues),
    amount: z.number().positive(),
    transactionId: z.string().min(1, 'Transaction ID is required').optional(),
    screenshot: z.any(), // File object (validated separately)
});

export const PostJobSchema = z.object({
    title: z.string().min(5, 'Job title must be at least 5 characters'),
    description: z.string().min(50, 'Description must be at least 50 characters'),
    responsibilities: z.array(z.string().min(1)).min(1, 'Add at least 1 responsibility'),
    requirements: z.array(z.string().min(1)).min(1, 'Add at least 1 requirement'),
    benefits: z.array(z.string().min(1)).optional(),

    category: z.enum(JobCategoryValues),
    employmentType: z.enum(EmploymentTypeValues),
    experienceLevel: z.enum(ExperienceLevelValues),

    city: z.string().min(1, 'City is required'),
    isRemote: z.boolean().default(false),

    salaryMin: z.number().positive().optional(),
    salaryMax: z.number().positive().optional(),

    requiredSkills: z.array(z.string()).min(1, 'Add at least 1 required skill'),
    minimumExperience: z.number().min(0),
    educationLevel: z.string().optional(),

    contactEmail: z.string().email().optional(),
    contactPhone: z.string().regex(/^(\+92|0)?[0-9]{10}$/).optional(),
    applicationUrl: z.string().url().optional(),
}).refine((data) => {
    if (data.salaryMin && data.salaryMax) {
        return data.salaryMax >= data.salaryMin;
    }
    return true;
}, {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['salaryMax'],
});

export const SubmitApplicationSchema = z.object({
    jobId: z.string(),
    coverLetter: z.string().max(1000, 'Cover letter must be less than 1000 characters').optional(),
});

export const UpdateApplicationStatusSchema = z.object({
    status: z.enum(ApplicationStatusValues),
    employerNotes: z.string().max(500).optional(),
    interviewDate: z.string().datetime().optional(), // ISO format
});

export const CreatePlacementSchema = z.object({
    applicationId: z.string(),
    firstMonthSalary: z.number().positive('Salary must be positive'),
    commissionRate: z.number().min(0).max(100).default(50),
    notes: z.string().max(500).optional(),
});

export const UpdateProfileSchema = z.object({
    fullName: z.string().min(2).optional(),
    phoneNumber: z.string().regex(/^(\+92|0)?[0-9]{10}$/).optional(),
    currentJobTitle: z.string().optional(),
    preferredJobTitle: z.string().optional(),
    bio: z.string().max(500).optional(),
    city: z.string().optional(),
    skills: z.array(z.string()).optional(),
    experience: z.array(WorkExperienceSchema).optional(),
    education: z.array(EducationSchema).optional(),
    certifications: z.array(CertificationSchema).optional(),
    desiredSalaryMin: z.number().positive().optional(),
    desiredSalaryMax: z.number().positive().optional(),
    openToRemote: z.boolean().optional(),
}).refine((data) => {
    if (data.desiredSalaryMin && data.desiredSalaryMax) {
        return data.desiredSalaryMax >= data.desiredSalaryMin;
    }
    return true;
}, {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['desiredSalaryMax'],
});

// ==========================================
// FILE VALIDATION HELPERS
// ==========================================

export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
    return allowedTypes.includes(file.type);
};

export const CV_ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
export const VIDEO_ALLOWED_TYPES = ['video/mp4', 'video/webm'];
export const IMAGE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];