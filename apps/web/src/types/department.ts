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

export interface DepartmentService {
    title: string;
    description: string;
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
    programs: string[];
    facilities: string[];
    contactPhone: string;
    contactEmail: string;
}