// Sample Jobs Data for Pakistan

import { Job } from '@/types/job';

// Sample Companies
export const companies = [
    {
        id: 'comp-001',
        name: 'Shaukat Khanum Memorial Cancer Hospital',
        logo: '/companies/skm.png',
        description: 'Leading cancer treatment and research hospital in Pakistan',
        industry: 'Healthcare',
        size: '1000-5000',
        location: 'Lahore, Punjab',
        website: 'https://shaukatkhanum.org.pk',
        founded: '1994',
        benefits: ['Health Insurance', 'Paid Leave', 'Training Programs', 'Retirement Plan'],
        createdAt: new Date('2024-01-01'),
    },
    {
        id: 'comp-002',
        name: 'Systems Limited',
        logo: '/companies/systems.png',
        description: 'Leading IT services and solutions provider',
        industry: 'Information Technology',
        size: '5000-10000',
        location: 'Lahore, Punjab',
        website: 'https://www.systemsltd.com',
        founded: '1977',
        benefits: ['Health Insurance', 'Flexible Hours', 'Remote Work', 'Professional Development'],
        createdAt: new Date('2024-01-01'),
    },
    {
        id: 'comp-003',
        name: 'Unilever Pakistan',
        logo: '/companies/unilever.png',
        description: 'Multinational consumer goods company',
        industry: 'FMCG',
        size: '1000-5000',
        location: 'Karachi, Sindh',
        website: 'https://www.unilever.pk',
        founded: '1948',
        benefits: ['Health Insurance', 'Provident Fund', 'Performance Bonus', 'Career Growth'],
        createdAt: new Date('2024-01-01'),
    },
    {
        id: 'comp-004',
        name: 'Engro Corporation',
        logo: '/companies/engro.png',
        description: 'Diversified conglomerate in energy, fertilizers, and food',
        industry: 'Conglomerate',
        size: '5000-10000',
        location: 'Karachi, Sindh',
        website: 'https://www.engro.com',
        founded: '1965',
        benefits: ['Competitive Salary', 'Health Coverage', 'Training', 'Bonus'],
        createdAt: new Date('2024-01-01'),
    },
    {
        id: 'comp-005',
        name: 'Khanhub (Pvt.) Ltd.',
        logo: '/logo.webp',
        description: 'Social welfare organization with multiple service divisions',
        industry: 'Social Services',
        size: '100-500',
        location: 'Vehari, Punjab',
        website: 'https://khanhub.com.pk',
        founded: '2020',
        benefits: ['Health Insurance', 'Transport', 'Meals', 'Growth Opportunities'],
        createdAt: new Date('2024-01-01'),
    },
];

// Sample Jobs
export const jobs = [
    {
        id: 'job-001',
        title: 'Senior Nurse - ICU Department',
        company: companies[0],
        description: 'Shaukat Khanum is seeking an experienced ICU nurse to join our critical care team. The ideal candidate will have strong clinical skills and compassionate patient care abilities.',
        shortDescription: 'Experienced ICU nurse needed for leading cancer hospital',
        category: 'healthcare',
        type: 'full-time',
        experienceLevel: 'mid',
        location: 'Lahore, Punjab',
        city: 'Lahore',
        province: 'Punjab',
        isRemote: false,
        salary: {
            min: 80000,
            max: 120000,
            currency: 'PKR',
            period: 'month',
        },
        requirements: [
            'BSN degree from recognized institution',
            'Valid PNC license',
            '3-5 years ICU experience',
            'BLS and ACLS certified',
            'Strong communication skills',
        ],
        responsibilities: [
            'Provide direct patient care in ICU',
            'Monitor patient vital signs',
            'Administer medications and treatments',
            'Collaborate with medical team',
            'Maintain accurate patient records',
        ],
        qualifications: [
            'Bachelor of Science in Nursing (BSN)',
            'Pakistan Nursing Council registration',
            'ICU/Critical Care certification preferred',
        ],
        benefits: [
            'Health insurance for self and family',
            '30 days paid annual leave',
            'Professional development opportunities',
            'Retirement benefits',
        ],
        skills: ['Patient Care', 'Critical Care', 'Emergency Response', 'Medical Equipment', 'Documentation'],
        vacancies: 3,
        deadline: new Date('2026-02-28'),
        postedAt: new Date('2026-02-01'),
        isActive: true,
        isFeatured: true,
        applicationCount: 45,
    },
    {
        id: 'job-002',
        title: 'Full Stack Developer - React & Node.js',
        company: companies[1],
        description: 'Join our dynamic development team to build cutting-edge web applications. We are looking for a skilled full-stack developer proficient in modern JavaScript frameworks.',
        shortDescription: 'Full-stack developer for enterprise software solutions',
        category: 'technology',
        type: 'full-time',
        experienceLevel: 'mid',
        location: 'Lahore, Punjab (Hybrid)',
        city: 'Lahore',
        province: 'Punjab',
        isRemote: false,
        salary: {
            min: 150000,
            max: 250000,
            currency: 'PKR',
            period: 'month',
        },
        requirements: [
            '3+ years experience with React and Node.js',
            'Strong knowledge of JavaScript/TypeScript',
            'Experience with RESTful APIs',
            'Database experience (PostgreSQL, MongoDB)',
            'Git version control proficiency',
        ],
        responsibilities: [
            'Develop and maintain web applications',
            'Write clean, maintainable code',
            'Collaborate with cross-functional teams',
            'Participate in code reviews',
            'Troubleshoot and debug applications',
        ],
        qualifications: [
            'Bachelor\'s degree in Computer Science or related field',
            'Strong portfolio of web projects',
            'Problem-solving abilities',
        ],
        benefits: [
            'Competitive salary package',
            'Health insurance',
            'Flexible working hours',
            'Remote work options',
            'Learning & development budget',
        ],
        skills: ['React', 'Node.js', 'TypeScript', 'REST APIs', 'MongoDB', 'Git', 'Agile'],
        vacancies: 2,
        deadline: new Date('2026-02-25'),
        postedAt: new Date('2026-01-28'),
        isActive: true,
        isFeatured: true,
        applicationCount: 89,
    },
    {
        id: 'job-003',
        title: 'Sales Manager - FMCG',
        company: companies[2],
        description: 'Lead our sales team in achieving revenue targets. Looking for an energetic sales professional with proven track record in FMCG sector.',
        shortDescription: 'Experienced sales manager for leading consumer goods company',
        category: 'sales',
        type: 'full-time',
        experienceLevel: 'senior',
        location: 'Karachi, Sindh',
        city: 'Karachi',
        province: 'Sindh',
        isRemote: false,
        salary: {
            min: 180000,
            max: 300000,
            currency: 'PKR',
            period: 'month',
        },
        requirements: [
            '5+ years in FMCG sales',
            'Proven track record of meeting targets',
            'Team management experience',
            'Strong negotiation skills',
            'MBA or equivalent preferred',
        ],
        responsibilities: [
            'Develop and execute sales strategies',
            'Manage and mentor sales team',
            'Build relationships with key clients',
            'Analyze market trends',
            'Prepare sales reports and forecasts',
        ],
        qualifications: [
            'MBA in Marketing or Business',
            '5+ years sales experience',
            'Leadership skills',
        ],
        benefits: [
            'Attractive salary + commission',
            'Company car',
            'Health insurance',
            'Performance bonuses',
            'Career advancement',
        ],
        skills: ['Sales Strategy', 'Team Leadership', 'Client Relations', 'Market Analysis', 'Negotiation'],
        vacancies: 1,
        deadline: new Date('2026-03-05'),
        postedAt: new Date('2026-02-02'),
        isActive: true,
        isFeatured: false,
        applicationCount: 32,
    },
    {
        id: 'job-004',
        title: 'Medical Officer - General Medicine',
        company: companies[4],
        description: 'Khanhub Medical Center is seeking a qualified medical officer to provide quality healthcare services to our community.',
        shortDescription: 'Medical officer for community healthcare center',
        category: 'healthcare',
        type: 'full-time',
        experienceLevel: 'entry',
        location: 'Vehari, Punjab',
        city: 'Vehari',
        province: 'Punjab',
        isRemote: false,
        salary: {
            min: 120000,
            max: 180000,
            currency: 'PKR',
            period: 'month',
        },
        requirements: [
            'MBBS degree from recognized university',
            'Valid PMC license',
            '1-2 years experience preferred',
            'Good communication skills',
            'Commitment to community service',
        ],
        responsibilities: [
            'Diagnose and treat patients',
            'Conduct medical examinations',
            'Prescribe medications',
            'Maintain patient records',
            'Participate in health camps',
        ],
        qualifications: [
            'MBBS degree',
            'PMC registration',
            'House job completion',
        ],
        benefits: [
            'Competitive salary',
            'Health coverage',
            'Accommodation',
            'Transport facility',
            'Professional development',
        ],
        skills: ['Patient Care', 'Diagnosis', 'Medical Procedures', 'EMR Systems', 'Communication'],
        vacancies: 2,
        deadline: new Date('2026-02-20'),
        postedAt: new Date('2026-01-30'),
        isActive: true,
        isFeatured: true,
        applicationCount: 28,
    },
    {
        id: 'job-005',
        title: 'Civil Engineer - Construction Projects',
        company: companies[3],
        description: 'Join Engro\'s infrastructure division to lead construction projects across Pakistan. Seeking experienced civil engineer with project management skills.',
        shortDescription: 'Civil engineer for major infrastructure projects',
        category: 'other',
        type: 'full-time',
        experienceLevel: 'senior',
        location: 'Multiple Cities',
        city: 'Karachi',
        province: 'Sindh',
        isRemote: false,
        salary: {
            min: 200000,
            max: 350000,
            currency: 'PKR',
            period: 'month',
        },
        requirements: [
            'B.Sc. in Civil Engineering',
            'PEC registration',
            '7+ years project experience',
            'AutoCAD and project management software',
            'Site supervision experience',
        ],
        responsibilities: [
            'Plan and oversee construction projects',
            'Ensure compliance with standards',
            'Manage project timelines and budgets',
            'Coordinate with contractors and suppliers',
            'Conduct site inspections',
        ],
        qualifications: [
            'Bachelor\'s in Civil Engineering',
            'PEC registered',
            'Project management certification',
        ],
        benefits: [
            'Excellent compensation',
            'Project allowances',
            'Company vehicle',
            'Health insurance',
            'International exposure',
        ],
        skills: ['Project Management', 'AutoCAD', 'Construction Planning', 'Quality Control', 'Team Leadership'],
        vacancies: 3,
        deadline: new Date('2026-03-10'),
        postedAt: new Date('2026-02-03'),
        isActive: true,
        isFeatured: false,
        applicationCount: 41,
    },
];

// Export helper functions
export function getJobById(id: string): Job | undefined {
    return jobs.find(job => job.id === id) as unknown as Job | undefined;
}

export function getJobsByCategory(category: string): Job[] {
    return jobs.filter(job => job.category === category) as unknown as Job[];
}

export function getJobsByCompany(companyId: string): Job[] {
    return jobs.filter(job => job.company.id === companyId) as unknown as Job[];
}

export function getFeaturedJobs(limit?: number): Job[] {
    const featured = jobs.filter(job => job.isFeatured && job.isActive);
    return (limit ? featured.slice(0, limit) : featured) as unknown as Job[];
}

export function getRecentJobs(limit?: number): Job[] {
    const sorted = [...jobs].sort((a: any, b: any) => b.postedAt.getTime() - a.postedAt.getTime());
    return (limit ? sorted.slice(0, limit) : sorted) as unknown as Job[];
}

export function searchJobs(query: string): Job[] {
    const lowerQuery = query.toLowerCase();
    return jobs.filter((job: any) =>
        job.title.toLowerCase().includes(lowerQuery) ||
        job.company.name.toLowerCase().includes(lowerQuery) ||
        job.description.toLowerCase().includes(lowerQuery) ||
        job.skills.some((skill: string) => skill.toLowerCase().includes(lowerQuery))
    ) as unknown as Job[];
}