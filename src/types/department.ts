// src/types/department.ts - UPDATED TO MATCH DATA STRUCTURE

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
    image?: string; // Path to department image (e.g., '/images/education.webp')
    category: 'social' | 'infrastructure' | 'governance' | 'economy';
    tagline: string;
    description: string;
    services?: string[]; // For listing page (simple array)
    servicesDetailed?: DepartmentService[]; // For detail page (with descriptions)
    facilities?: string[];
    programs?: string[];
    stats?: DepartmentStat[];
    isActive?: boolean;
    color?: string; // Tailwind color class (e.g., 'text-blue-400')
    colorHex?: string; // Hex color for backgrounds (e.g., '#60a5fa')
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
    gallery?: string[]; // Array of image paths
}

export interface DepartmentCategory {
    key: 'social' | 'infrastructure' | 'governance' | 'economy';
    label: string;
    icon: string;
    description?: string;
}