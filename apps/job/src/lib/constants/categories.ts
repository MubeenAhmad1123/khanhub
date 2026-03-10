export interface Subcategory {
    id: string;
    label: string;
    roles?: string[];
}

export interface Industry {
    id: string;
    label: string;
    icon: string;
    imageUrl?: string;
    subcategories: Subcategory[];
}

export const INDUSTRIES: Industry[] = [
    {
        id: 'jobs',
        label: 'Jobs',
        icon: '💼',
        imageUrl: '/jobs.webp',
        subcategories: [
            { id: 'software', label: 'Software & IT', roles: ['Developer', 'Designer', 'Manager'] },
            { id: 'admin', label: 'Administration', roles: ['Receptionist', 'Office Assistant'] },
            { id: 'sales', label: 'Sales & Marketing', roles: ['Sales Executive', 'Digital Marketer'] }
        ]
    },
    {
        id: 'healthcare',
        label: 'Healthcare',
        icon: '🏥',
        imageUrl: '/healthcare.webp',
        subcategories: [
            { id: 'doctors', label: 'Doctors', roles: ['Physician', 'Surgeon', 'Specialist'] },
            { id: 'nursing', label: 'Nursing', roles: ['Nurse', 'Medical Assistant'] },
            { id: 'pharmacy', label: 'Pharmacy', roles: ['Pharmacist'] }
        ]
    },
    {
        id: 'education',
        label: 'Education',
        icon: '🎓',
        imageUrl: '/education (2).webp',
        subcategories: [
            { id: 'school', label: 'School Teaching', roles: ['Primary Teacher', 'High School Teacher'] },
            { id: 'higher', label: 'Higher Education', roles: ['Lecturer', 'Professor'] }
        ]
    },
    {
        id: 'marriage',
        label: 'Marriage Bureau',
        icon: '💍',
        imageUrl: '/marraige.webp',
        subcategories: [
            { id: 'presenting', label: 'Presenting Profile' },
            { id: 'looking', label: 'Looking for Partner' }
        ]
    },
    {
        id: 'legal',
        label: 'Legal',
        icon: '⚖️',
        imageUrl: '/translation.webp',
        subcategories: [
            { id: 'lawyer', label: 'Lawyers', roles: ['Advocate', 'Consultant'] },
            { id: 'client', label: 'Client Services' }
        ]
    },
    {
        id: 'realestate',
        label: 'Real Estate',
        icon: '🏠',
        imageUrl: '/real-estate.webp',
        subcategories: [
            { id: 'agent', label: 'Agents', roles: ['Property Dealer', 'Consultant'] },
            { id: 'buyer', label: 'Buyers & Renters' }
        ]
    },
    {
        id: 'transport',
        label: 'Transport',
        icon: '🚛',
        imageUrl: '/jobs.webp',
        subcategories: [
            { id: 'driver', label: 'Drivers', roles: ['Truck Driver', 'Car Driver'] },
            { id: 'passenger', label: 'Passengers' }
        ]
    },
    {
        id: 'travel',
        label: 'Travel & Tour',
        icon: '✈️',
        imageUrl: '/jobs.webp',
        subcategories: [
            { id: 'agency', label: 'Agencies', roles: ['Travel Agent', 'Tour Guide'] },
            { id: 'traveler', label: 'Travelers' }
        ]
    },
    {
        id: 'agriculture',
        label: 'Agriculture',
        icon: '🌾',
        imageUrl: '/jobs.webp',
        subcategories: [
            { id: 'farmer', label: 'Farmers' },
            { id: 'buyer', label: 'Produce Buyers' }
        ]
    },
    {
        id: 'sellbuy',
        label: 'Sell & Buy',
        icon: '🛍️',
        imageUrl: '/healthcare.webp',
        subcategories: [
            { id: 'seller', label: 'Sellers' },
            { id: 'buyer', label: 'Buyers' }
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
