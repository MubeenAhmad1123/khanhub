import { Job } from '@/types/job';

export const PAKISTANI_CITIES = [
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
    'Bahawalpur',
    'Sargodha',
    'Sukkur',
    'Larkana',
    'Sheikhupura',
    'Rahim Yar Khan',
    'Jhang',
    'Dera Ghazi Khan',
    'Gujrat',
    'Sahiwal',
    'Wah Cantonment',
    'Mardan',
    'Kasur',
    'Okara',
    'Mingora',
    'Nawabshah',
    'Chiniot',
    'Kotri',
    'Khanpur',
    'Hafizabad',
    'Sadiqabad',
    'Mirpur Khas',
    'Mandi Burewala',
    'Shikarpur',
    'Jacobabad',
    'Jhelum',
    'Khanpur',
    'Khairpur',
    'Muzaffargarh',
    'Abbottabad',
    'Khanewal',
];

export const PAKISTANI_PROVINCES = [
    'Punjab',
    'Sindh',
    'Khyber Pakhtunkhwa',
    'Balochistan',
    'Gilgit-Baltistan',
    'Azad Kashmir',
];

export type JobCategory =
    | 'healthcare'
    | 'technology'
    | 'education'
    | 'finance'
    | 'marketing'
    | 'sales'
    | 'customer-service'
    | 'other';

export type JobType = 'full-time' | 'part-time' | 'contract' | 'internship';

export type LocationType = 'on-site' | 'remote' | 'hybrid';

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'executive';

export type JobStatus = 'pending' | 'approved' | 'rejected' | 'closed';

export interface Job {
    id: string;
    title: string;
    company: {
        id: string;
        name: string;
        logo: string | null;
        industry: string | null;
    };
    shortDescription: string;
    description: string;
    category: JobCategory;
    type: JobType;
    locationType: LocationType;
    experienceLevel: ExperienceLevel;
    location: string;
    city: string;
    province: string;
    isRemote: boolean;
    salary?: {
        min: number;
        max: number;
        currency: string;
        period: string;
    };
    requirements: string[];
    responsibilities: string[];
    qualifications: string[];
    benefits?: string[];
    skills: string[];
    requiredSkills: string[];
    requiredEducation: string;
    requiredExperience: number;
    employerId: string;
    companyEmail: string;
    companyPhone: string;
    companyAddress: string;
    status: JobStatus;
    featured: boolean;
    isFeatured?: boolean; // alias for featured
    vacancies: number;
    deadline: Date;
    expiresAt: Date;
    postedAt: Date;
    isActive: boolean;
    applicationCount: number;
    viewsCount: number;
    createdAt: Date;
    updatedAt: Date;
}