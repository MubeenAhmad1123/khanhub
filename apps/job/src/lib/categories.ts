export type CategoryKey =
    | 'dailywages'
    | 'education'
    | 'marriage'
    | 'property'
    | 'automobiles'
    | 'buysell';

export interface CategoryConfig {
    label: string;
    emoji: string;
    accent: string;
    providerLabel: string;
    seekerLabel: string;
    placeholderVideos: string[];
    imageUrl?: string;
}

export const CATEGORY_FEED_TABS: Record<string, string[]> = {
    dailywages: ['For You', 'Workers', 'Hiring'],
    education: ['For You', 'Teachers', 'Students'],
    marriage: ['For You', 'Groom Side', 'Bride Side'],
    property: ['For You', 'Agents', 'Buyers'],
    automobiles: ['For You', 'Sellers', 'Buyers'],
    buysell: ['For You', 'Sellers', 'Buyers'],
};

export const PLACEHOLDER_VIDEO_IDS = [
    'jNQXAC9IVRw', 'kJQP7kiw5Fk', 'OPf0YbXqDm0', 'YQHsXMglC9A', 'fJ9rUzIMcZQ',
    'hT_nvWreIhg', 'CevxZvSJLk8', 'pRpeEdMmmQ0', '09R8_2nJtjg', 'RgKAFK5djSk',
    'ru0K8uLgygA', '60ItHLz5WEA', 'JGwWNGJdvx8', 'y6120QOlsfU', 'ZbZSe6N_BXs'
];

export const CATEGORY_PLACEHOLDERS: Record<string, string[]> = {
    dailywages: ['jNQXAC9IVRw', 'kJQP7kiw5Fk', 'OPf0YbXqDm0', 'YQHsXMglC9A', 'fJ9rUzIMcZQ'],
    education: ['ru0K8uLgygA', '60ItHLz5WEA', 'JGwWNGJdvx8', 'y6120QOlsfU', 'ZbZSe6N_BXs'],
    marriage: ['nfWlot6h_JM', '9bZkp7q19f0', 'e-ORhEE9VVg', 'lp-EO5I60KA', 'dQw4w9WgXcQ'],
    property: ['09R8_2nJtjg', '60ItHLz5WEA', 'ru0K8uLgygA', 'y6120QOlsfU', 'ZbZSe6N_BXs'],
    automobiles: ['jNQXAC9IVRw', 'RgKAFK5djSk', 'fJ9rUzIMcZQ', 'hT_nvWreIhg', 'kJQP7kiw5Fk'],
    buysell: ['CevxZvSJLk8', 'pRpeEdMmmQ0', 'YQHsXMglC9A', 'OPf0YbXqDm0', 'jNQXAC9IVRw'],
};

export const PLACEHOLDER_OVERLAY_DATA: Record<string, any[]> = {
    dailywages: [
        { title: 'Experienced Electrician', badge: 'Worker', field1: 'Wiring • Repair • Solar', field2: '8 years exp', location: 'Karachi', views: 12400 },
        { title: 'Plumbing Works', badge: 'Worker', field1: 'Pipelines • Fitting', field2: 'Quick Service', location: 'Lahore', views: 45000 },
        { title: 'Ac Technician', badge: 'Worker', field1: 'Cleaning • Gas Refill', field2: 'Expert', location: 'Islamabad', views: 8900 },
    ],
    education: [
        { title: 'Math Professor', badge: 'Teacher', field1: 'Calculus • Linear Algebra', field2: '10 years exp', location: 'Karachi', views: 45000 },
        { title: 'IELTS Specialist', badge: 'Teacher', field1: 'English • 8.5 Band', field2: 'Online Classes', location: 'Islamabad', views: 88000 },
    ],
    marriage: [
        { title: 'Zainab Ahmed', badge: 'Bride', field1: 'MBBS • 26 Years', field2: 'Karachi Resident', location: 'Karachi', views: 250000 },
        { title: 'Osman Khan', badge: 'Groom', field1: 'Engineer • 29 Years', field2: 'Lahore Family', location: 'Lahore', views: 180000 },
    ],
    property: [
        { title: 'DHA Specialist', badge: 'Agent', field1: 'Buying • Selling', field2: 'DHA Karachi', location: 'Karachi', views: 1200000 },
        { title: 'Zameen Experts', badge: 'Agent', field1: 'Commercial Property', field2: 'Lahore Focus', location: 'Lahore', views: 450000 },
    ],
    automobiles: [
        { title: 'Honda Civic 2022', badge: 'Seller', field1: '1.5 Turbo • White', field2: 'Rs. 7,500,000', location: 'Karachi', views: 85000 },
        { title: 'Toyota Corolla', badge: 'Seller', field1: 'GLI • Mint Condition', field2: 'Rs. 4,200,000', location: 'Lahore', views: 15000 },
    ],
    buysell: [
        { title: 'iPhone 15 Pro', badge: 'Seller', field1: '256GB • Blue', field2: 'Rs. 450,000', location: 'Karachi', views: 150000 },
        { title: 'Gaming Laptop', badge: 'Seller', field1: 'RTX 4060 • RGB', field2: 'Rs. 250,000', location: 'Lahore', views: 25000 },
    ],
};

export const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
    dailywages: {
        label: 'Daily Wages',
        emoji: '⛏️',
        imageUrl: '/jobs.webp',
        accent: '#FF0069',
        providerLabel: 'Worker',
        seekerLabel: 'Hiring',
        placeholderVideos: CATEGORY_PLACEHOLDERS.dailywages
    },
    education: {
        label: 'Education',
        emoji: '🎓',
        imageUrl: '/education (2).webp',
        accent: '#FFD600',
        providerLabel: 'Teacher',
        seekerLabel: 'Student',
        placeholderVideos: CATEGORY_PLACEHOLDERS.education
    },
    marriage: {
        label: 'Marriage Bureau',
        emoji: '💍',
        imageUrl: '/marraige.webp',
        accent: '#FF6B9D',
        providerLabel: 'Presenting',
        seekerLabel: 'Looking',
        placeholderVideos: CATEGORY_PLACEHOLDERS.marriage
    },
    property: {
        label: 'Property',
        emoji: '🏗️',
        imageUrl: '/real-estate.webp',
        accent: '#7638FA',
        providerLabel: 'Agent',
        seekerLabel: 'Buyer / Renter',
        placeholderVideos: CATEGORY_PLACEHOLDERS.property
    },
    automobiles: {
        label: 'Automobiles',
        emoji: '🚗',
        imageUrl: '/tech.webp', // fallback for now
        accent: '#00C896',
        providerLabel: 'Seller',
        seekerLabel: 'Buyer',
        placeholderVideos: CATEGORY_PLACEHOLDERS.automobiles
    },
    buysell: {
        label: 'Buy/Sell',
        emoji: '🛍️',
        imageUrl: '/healthcare.webp', // fallback for now
        accent: '#00E5FF',
        providerLabel: 'Seller',
        seekerLabel: 'Buyer',
        placeholderVideos: CATEGORY_PLACEHOLDERS.buysell
    }
};
