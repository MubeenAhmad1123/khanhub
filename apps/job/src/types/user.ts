// User Profile Types

export type UserRole = 'job_seeker' | 'employer' | 'admin';

export interface Experience {
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string | null;
    current: boolean;
    description: string;
}

export interface Education {
    degree: string;
    institution: string;
    year: string;
    grade?: string;
}

export interface Certification {
    name: string;
    issuer: string;
    year: string;
}

export interface UserProfile {
    uid: string;
    role: UserRole;
    email: string;
    displayName: string;
    photoURL: string | null;
    createdAt: Date;
    updatedAt: Date;

    // Job Seeker Specific
    registrationPaid: boolean;
    registrationPaymentProof: string | null;
    registrationApproved: boolean;
    isPremium: boolean;
    premiumExpiresAt: Date | null;
    premiumJobsViewed: number;
    freeApplicationsUsed: number;
    points: number;
    profileStrength: number;

    // Profile Data
    profile: {
        phone: string | null;
        location: string | null;
        currentJobTitle: string | null;
        preferredJobTitle: string | null;
        summary: string | null;
        cvUrl: string | null;
        introVideoUrl: string | null;
        skills: string[];
        experience: Experience[];
        education: Education[];
        certifications: Certification[];
    };

    // Employer Specific
    companyName: string | null;
    companyLogo: string | null;
    companyDescription: string | null;
    companyWebsite: string | null;
    companySize: string | null;
    industry: string | null;
}
