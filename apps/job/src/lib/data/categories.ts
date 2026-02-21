export const INDUSTRY_CATEGORIES = [
    {
        id: 'healthcare',
        label: 'Healthcare',
        icon: '🏥',
        subcategories: ['Doctor', 'Nurse', 'Hospital Admin', 'Pharmacist', 'Lab Technician']
    },
    {
        id: 'technology',
        label: 'Technology',
        icon: '💻',
        subcategories: ['Software Engineer', 'UI/UX Designer', 'Data Analyst', 'DevOps', 'Product Manager']
    },
    {
        id: 'finance',
        label: 'Finance',
        icon: '💰',
        subcategories: ['Accountant', 'Financial Analyst', 'Banker', 'Auditor', 'Tax Consultant']
    },
    {
        id: 'education',
        label: 'Education',
        icon: '📚',
        subcategories: ['Teacher', 'Lecturer', 'Tutor', 'School Admin', 'Curriculum Designer']
    },
    {
        id: 'engineering',
        label: 'Engineering',
        icon: '⚙️',
        subcategories: ['Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer', 'Site Supervisor']
    },
    {
        id: 'retail',
        label: 'Retail',
        icon: '🛒',
        subcategories: ['Sales Executive', 'Store Manager', 'Cashier', 'Inventory Manager']
    }
] as const;

export type IndustryId = typeof INDUSTRY_CATEGORIES[number]['id'];
export type Subcategory<T extends IndustryId> = Extract<typeof INDUSTRY_CATEGORIES[number], { id: T }>['subcategories'][number];
