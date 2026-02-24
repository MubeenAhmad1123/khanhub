export interface JobStatistics {
    total: number;
    active: number;
    pending: number;
    closed: number;
    expired: number;
    featured: number;
}

export interface JobPosting {
    id: string;
    employerUid: string;

    // Step 1: Job Details
    title: string;
    description: string;
    skills: string[];
    experienceRequired: string; // e.g., "2-5 years"

    // Step 2: Logistics & Compensation
    type: 'Full-time' | 'Part-time' | 'Contract' | 'Freelance' | 'Internship';
    location: string; // City
    salaryRange: string;
    hideSalary: boolean;

    // Step 3: Company Metadata (Captured from profile at post time)
    companyName: string;
    companyLogo?: string;
    companyLocation?: string;
    companyPhone?: string;
    industry: string;

    // Step 4: Video Details
    videoUrl?: string;
    cloudinaryId?: string;

    // Meta
    status: 'pending' | 'active' | 'closed' | 'rejected';
    admin_status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    updatedAt: any;
}
