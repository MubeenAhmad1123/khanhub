export interface Subcategory {
    id: string;
    label: string;
    roles?: string[];
}

export interface Industry {
    id: string;
    label: string;
    icon: string;
    subcategories: Subcategory[];
}

export const INDUSTRIES: Industry[] = [
    {
        id: 'healthcare',
        label: 'Healthcare / Medical',
        icon: '🏥',
        subcategories: [
            { id: 'doctors', label: 'Doctors & Specialists', roles: ['General Physician', 'Surgeon', 'Pediatrician', 'Cardiologist', 'Dermatologist'] },
            { id: 'nursing', label: 'Nursing', roles: ['Registered Nurse', 'Nurse Practitioner', 'Head Nurse'] },
            { id: 'pharmacy', label: 'Pharmacy', roles: ['Pharmacist', 'Pharmacy Assistant'] },
            { id: 'lab_tech', label: 'Laboratory & Diagnostics', roles: ['Lab Technician', 'Radiologist'] },
            { id: 'hosp_admin', label: 'Hospital Administration' },
            { id: 'other_medical', label: 'Other Medical Staff' }
        ]
    },
    {
        id: 'technology',
        label: 'Technology / IT',
        icon: '💻',
        subcategories: [
            { id: 'software_dev', label: 'Software Development', roles: ['Frontend Developer', 'Backend Developer', 'Fullstack Developer', 'Mobile Developer'] },
            { id: 'design', label: 'Design & UI/UX', roles: ['UI/UX Designer', 'Graphic Designer', 'Product Designer'] },
            { id: 'data_ai', label: 'Data & AI', roles: ['Data Scientist', 'Data Analyst', 'AI Engineer'] },
            { id: 'cybersecurity', label: 'Cybersecurity' },
            { id: 'it_support', label: 'IT Support & Network' },
            { id: 'other_tech', label: 'Other Tech Roles' }
        ]
    },
    {
        id: 'education',
        label: 'Education / Teaching',
        icon: '📚',
        subcategories: [
            { id: 'school_teaching', label: 'School Teaching', roles: ['Primary Teacher', 'High School Teacher', 'Subject Specialist'] },
            { id: 'higher_edu', label: 'Higher Education', roles: ['Lecturer', 'Professor', 'Researcher'] },
            { id: 'skill_training', label: 'Skill Training / Vocational' },
            { id: 'admin_edu', label: 'Education Administration' }
        ]
    },
    {
        id: 'finance',
        label: 'Finance / Banking',
        icon: '💰',
        subcategories: [
            { id: 'accounting', label: 'Accounting & Audit', roles: ['Accountant', 'Auditor', 'Tax Consultant'] },
            { id: 'banking', label: 'Banking Operations', roles: ['Bank Manager', 'Cashier', 'Loan Officer'] },
            { id: 'investment', label: 'Investment & Insurance' },
            { id: 'other_finance', label: 'Other Finance Roles' }
        ]
    },
    {
        id: 'engineering',
        label: 'Engineering',
        icon: '⚙️',
        subcategories: [
            { id: 'civil_eng', label: 'Civil Engineering' },
            { id: 'mech_eng', label: 'Mechanical Engineering' },
            { id: 'elec_eng', label: 'Electrical Engineering' },
            { id: 'architecture', label: 'Architecture' }
        ]
    },
    {
        id: 'transportation',
        label: 'Transportation / Logistics',
        icon: '🚛',
        subcategories: [
            { id: 'driving', label: 'Driving', roles: ['Truck Driver', 'Delivery Rider', 'Personal Driver'] },
            { id: 'logistics', label: 'Logistics & Warehouse', roles: ['Warehouse Manager', 'Dispatcher'] },
            { id: 'aviation_maritime', label: 'Aviation & Maritime' }
        ]
    },
    {
        id: 'hospitality',
        label: 'Hospitality / Food',
        icon: '🍽️',
        subcategories: [
            { id: 'kitchen', label: 'Kitchen & Cooking', roles: ['Head Chef', 'Cook', 'Kitchen Helper'] },
            { id: 'serving', label: 'Serving & Front Desk', roles: ['Waiter/Waitress', 'Receptionist'] },
            { id: 'hosp_mgmt', label: 'Hotel Management' }
        ]
    },
    {
        id: 'retail',
        label: 'Retail / Sales',
        icon: '🛒',
        subcategories: [
            { id: 'sales', label: 'Sales & Marketing', roles: ['Sales Executive', 'Digital Marketer', 'Field Sales'] },
            { id: 'store_mgmt', label: 'Store Management' },
            { id: 'customer_service', label: 'Customer Service' }
        ]
    },
    {
        id: 'skilled_trades',
        label: 'Skilled Trades / Labor',
        icon: '🔧',
        subcategories: [
            { id: 'electrical_work', label: 'Electrical Work' },
            { id: 'plumbing', label: 'Plumbing' },
            { id: 'construction', label: 'Construction' },
            { id: 'maintenance', label: 'Maintenance & Repair' }
        ]
    },
    {
        id: 'other',
        label: 'Other',
        icon: '✨',
        subcategories: [
            { id: 'general_admin', label: 'General Administration' },
            { id: 'human_resources', label: 'Human Resources' },
            { id: 'legal', label: 'Legal' },
            { id: 'misc', label: 'Miscellaneous' }
        ]
    }
];

export const getSubcategories = (industryId: string): Subcategory[] => {
    const industry = INDUSTRIES.find(i => i.id === industryId);
    return industry ? industry.subcategories : [];
};

export const getIndustryLabel = (industryId: string): string => {
    const industry = INDUSTRIES.find(i => i.id === industryId);
    return industry ? industry.label : industryId;
};

export const getRoles = (industryId: string, subcategoryId: string): string[] => {
    const industry = INDUSTRIES.find(i => i.id === industryId);
    if (!industry) return [];

    const subcategory = industry.subcategories.find(s => s.id === subcategoryId);
    return subcategory && subcategory.roles ? subcategory.roles : [];
};
