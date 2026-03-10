export const INDUSTRY_CATEGORIES = [
    {
        id: 'jobs',
        label: 'Jobs',
        icon: '💼',
        subcategories: ['Software Engineer', 'Sales Executive', 'Receptionist', 'Manager']
    },
    {
        id: 'healthcare',
        label: 'Healthcare',
        icon: '🏥',
        subcategories: ['Doctor', 'Nurse', 'Pharmacist', 'Lab Technician']
    },
    {
        id: 'education',
        label: 'Education',
        icon: '🎓',
        subcategories: ['Teacher', 'Lecturer', 'Tutor', 'School Admin']
    },
    {
        id: 'marriage',
        label: 'Marriage Bureau',
        icon: '💍',
        subcategories: ['Presenting Profile', 'Looking for Partner']
    },
    {
        id: 'legal',
        label: 'Legal',
        icon: '⚖️',
        subcategories: ['Lawyer', 'Consultant', 'Legal Assistant']
    },
    {
        id: 'realestate',
        label: 'Real Estate',
        icon: '🏠',
        subcategories: ['Agent', 'Consultant', 'Broker']
    },
    {
        id: 'transport',
        label: 'Transport',
        icon: '🚛',
        subcategories: ['Truck Driver', 'Delivery Rider', 'Dispatcher']
    },
    {
        id: 'travel',
        label: 'Travel & Tour',
        icon: '✈️',
        subcategories: ['Travel Agent', 'Tour Guide', 'Agency Owner']
    },
    {
        id: 'agriculture',
        label: 'Agriculture',
        icon: '🌾',
        subcategories: ['Farmer', 'Supplier', 'Buyer']
    },
    {
        id: 'sellbuy',
        label: 'Sell & Buy',
        icon: '🛍️',
        subcategories: ['Seller', 'Buyer', 'Shop Owner']
    }
] as const;

export type IndustryId = typeof INDUSTRY_CATEGORIES[number]['id'];
export type Subcategory<T extends IndustryId> = Extract<typeof INDUSTRY_CATEGORIES[number], { id: T }>['subcategories'][number];
