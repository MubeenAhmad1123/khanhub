// Job Portal Types

export type JobType = 'full-time' | 'part-time' | 'contract' | 'internship' | 'remote';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'executive';
export type JobCategory =
    | 'healthcare'
    | 'it'
    | 'engineering'
    | 'sales'
    | 'marketing'
    | 'finance'
    | 'education'
    | 'hospitality'
    | 'manufacturing'
    | 'construction'
    | 'logistics'
    | 'customer-service';

export interface Company {
    id: string;
    name: string;
    logo?: string;
    description: string;
    industry: string;
    size: string; // e.g., "50-100 employees"
    location: string;
    website?: string;
    founded?: string;
    benefits?: string[];
    createdAt: Date;
}

export interface Job {
    id: string;
    title: string;
    company: Company;
    description: string;
    shortDescription: string;
    category: JobCategory;
    type: JobType;
    experienceLevel: ExperienceLevel;
    location: string;
    city: string;
    province: string;
    isRemote: boolean;
    salary?: {
        min: number;
        max: number;
        currency: string;
        period: 'month' | 'year';
    };
    requirements: string[];
    responsibilities: string[];
    qualifications: string[];
    benefits?: string[];
    skills: string[];
    vacancies: number;
    deadline: Date;
    postedAt: Date;
    isActive: boolean;
    isFeatured?: boolean;
    applicationCount?: number;
}

export interface JobApplication {
    id: string;
    jobId: string;
    userId: string;
    applicantName: string;
    email: string;
    phone: string;
    resumeUrl: string;
    coverLetter?: string;
    status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'accepted';
    appliedAt: Date;
    updatedAt: Date;
}

export interface JobFilters {
    category?: JobCategory;
    type?: JobType[];
    experienceLevel?: ExperienceLevel[];
    location?: string;
    city?: string;
    province?: string;
    isRemote?: boolean;
    minSalary?: number;
    maxSalary?: number;
    searchQuery?: string;
    companyId?: string;
    sortBy?: 'newest' | 'oldest' | 'salary-high' | 'salary-low' | 'deadline';
}

export interface JobSearchResult {
    jobs: Job[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

// Pakistani Cities
export const pakistaniCities = [
    'Karachi',
    'Lahore',
    'Islamabad',
    'Rawalpindi',
    'Faisalabad',
    'Multan',
    'Peshawar',
    'Quetta',
    'Sialkot',
    'Gujranwala',
    'Hyderabad',
    'Sargodha',
    'Bahawalpur',
    'Sukkur',
    'Vehari',
];

// Pakistani Provinces
export const pakistaniProvinces = [
    'Punjab',
    'Sindh',
    'Khyber Pakhtunkhwa',
    'Balochistan',
    'Islamabad Capital Territory',
    'Azad Kashmir',
    'Gilgit-Baltistan',
];