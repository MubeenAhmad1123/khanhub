// src/types/department.ts

export interface DepartmentCategory {
    key: string;
    label: string;
    icon: string;
    description: string;
}

export interface DepartmentStat {
    value: string;
    label: string;
}

export interface Program {
    slug: string;
    name: string;
    description: string;
    image?: string;
    features?: string[];
    details?: { label: string; value: string }[];
}

export interface Department {
    slug: string;
    name: string;
    shortName: string;
    icon: string;
    image?: string;
    category: string;
    tagline: string;
    description: string;
    services: string[] | DepartmentService[]; // Can be array of strings or service objects
    stats: DepartmentStat[];
    isActive?: boolean;

    // Additional fields for individual department pages
    colorHex?: string;
    programs: string[] | Program[];
    facilities: string[];
    contactPhone: string;
    contactEmail: string;

    // Enhanced structure for Institute of Health Sciences
    subDepartments?: SubDepartment[];
    features?: string[];
    gallery?: {
        title: string;
        images: { url: string; alt: string; }[];
    }[];
}

export interface SubDepartment {
    title: string;
    description?: string;
    courses: Course[];
}

export interface Course {
    name: string;
    duration: string;
    eligibility: string;
    description?: string;
}