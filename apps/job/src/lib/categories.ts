export type CategoryKey =
    | 'jobs'
    | 'healthcare'
    | 'education'
    | 'marriage'
    | 'legal'
    | 'realestate'
    | 'transport'
    | 'travel'
    | 'agriculture'
    | 'sellbuy';

export interface CategoryConfig {
    label: string;
    emoji: string;
    accent: string;
    providerLabel: string;
    seekerLabel: string;
    providerDescription?: string;
    seekerDescription?: string;
    placeholderVideos: string[];
    imageUrl?: string;
}

export const CATEGORY_FEED_TABS: Record<string, string[]> = {
    jobs: ['Job Seeker', 'Company', 'For You'],
    healthcare: ['Doctor', 'Patient', 'For You'],
    education: ['Teacher', 'Student', 'For You'],
    marriage: ['Presenting', 'Looking', 'For You'],
    legal: ['Lawyer', 'Client', 'For You'],
    realestate: ['Agent', 'Buyer', 'For You'],
    transport: ['Driver', 'Passenger', 'For You'],
    travel: ['Agency', 'Traveler', 'For You'],
    agriculture: ['Farmer', 'Buyer', 'For You'],
    sellbuy: ['Seller', 'Buyer', 'For You'],
};

export const PLACEHOLDER_VIDEO_IDS = [
    'jNQXAC9IVRw', 'kJQP7kiw5Fk', 'OPf0YbXqDm0', 'YQHsXMglC9A', 'fJ9rUzIMcZQ',
    'hT_nvWreIhg', 'CevxZvSJLk8', 'pRpeEdMmmQ0', '09R8_2nJtjg', 'RgKAFK5djSk',
    'ru0K8uLgygA', '60ItHLz5WEA', 'JGwWNGJdvx8', 'y6120QOlsfU', 'ZbZSe6N_BXs'
];

export const CATEGORY_PLACEHOLDERS: Record<string, string[]> = {
    jobs: ['jNQXAC9IVRw', 'kJQP7kiw5Fk', 'OPf0YbXqDm0', 'YQHsXMglC9A', 'fJ9rUzIMcZQ'],
    healthcare: ['ru0K8uLgygA', '60ItHLz5WEA', 'JGwWNGJdvx8', 'y6120QOlsfU', 'ZbZSe6N_BXs'],
    education: ['nfWlot6h_JM', '9bZkp7q19f0', 'e-ORhEE9VVg', 'lp-EO5I60KA', 'dQw4w9WgXcQ'],
    marriage: ['09R8_2nJtjg', '60ItHLz5WEA', 'ru0K8uLgygA', 'y6120QOlsfU', 'ZbZSe6N_BXs'],
    legal: ['jNQXAC9IVRw', 'RgKAFK5djSk', 'fJ9rUzIMcZQ', 'hT_nvWreIhg', 'kJQP7kiw5Fk'],
    realestate: ['CevxZvSJLk8', 'pRpeEdMmmQ0', 'YQHsXMglC9A', 'OPf0YbXqDm0', 'jNQXAC9IVRw'],
    transport: ['jNQXAC9IVRw', 'kJQP7kiw5Fk', 'OPf0YbXqDm0', 'YQHsXMglC9A', 'fJ9rUzIMcZQ'],
    travel: ['ru0K8uLgygA', '60ItHLz5WEA', 'JGwWNGJdvx8', 'y6120QOlsfU', 'ZbZSe6N_BXs'],
    agriculture: ['nfWlot6h_JM', '9bZkp7q19f0', 'e-ORhEE9VVg', 'lp-EO5I60KA', 'dQw4w9WgXcQ'],
    sellbuy: ['09R8_2nJtjg', '60ItHLz5WEA', 'ru0K8uLgygA', 'y6120QOlsfU', 'ZbZSe6N_BXs'],
};

export const PLACEHOLDER_OVERLAY_DATA: Record<string, any[]> = {
    jobs: [
        { title: 'Experienced Developer', badge: 'Job Seeker', field1: 'React • Node', field2: '5 years exp', location: 'Karachi', views: 12400 },
        { title: 'Hiring Designer', badge: 'Company', field1: 'UI/UX', field2: 'Quick Service', location: 'Lahore', views: 45000 },
    ],
    healthcare: [
        { title: 'General Physician', badge: 'Doctor', field1: 'MBBS', field2: '10 years exp', location: 'Islamabad', views: 8900 },
    ],
    marriage: [
        { title: 'Family Looking', badge: 'Looking', field1: 'Engineer', field2: 'Lahore', location: 'Lahore', views: 250000 },
    ],
};

export const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
    jobs: {
        label: 'Jobs',
        emoji: '💼',
        imageUrl: '/jobs.webp',
        accent: '#FF0069',
        providerLabel: 'Employer',
        seekerLabel: 'Job Seeker',
        providerDescription: 'I am looking to hire talent',
        seekerDescription: 'I am looking for a job',
        placeholderVideos: CATEGORY_PLACEHOLDERS.jobs
    },
    healthcare: {
        label: 'Healthcare',
        emoji: '🏥',
        imageUrl: '/healthcare.webp',
        accent: '#00C896',
        providerLabel: 'Doctor/Clinic',
        seekerLabel: 'Patient',
        providerDescription: 'I provide medical services',
        seekerDescription: 'I am seeking medical help',
        placeholderVideos: CATEGORY_PLACEHOLDERS.healthcare
    },
    education: {
        label: 'Education',
        emoji: '🎓',
        imageUrl: '/education (2).webp',
        accent: '#FFD600',
        providerLabel: 'Teacher/Artist',
        seekerLabel: 'Student/Learner',
        providerDescription: 'I want to teach or share skills',
        seekerDescription: 'I want to learn something new',
        placeholderVideos: CATEGORY_PLACEHOLDERS.education
    },
    marriage: {
        label: 'Marriage Bureau',
        emoji: '💍',
        imageUrl: '/marraige.webp',
        accent: '#FF6B9D',
        providerLabel: 'Groom/Male Side',
        seekerLabel: 'Bride/Female Side',
        providerDescription: 'I am looking for a partner',
        seekerDescription: 'I am looking for a proposal',
        placeholderVideos: CATEGORY_PLACEHOLDERS.marriage
    },
    legal: {
        label: 'Legal',
        emoji: '⚖️',
        imageUrl: '/translation.webp',
        accent: '#4A90D9',
        providerLabel: 'Lawyer/Notary',
        seekerLabel: 'Client',
        providerDescription: 'I provide legal assistance',
        seekerDescription: 'I need legal advice',
        placeholderVideos: CATEGORY_PLACEHOLDERS.legal
    },
    realestate: {
        label: 'Real Estate',
        emoji: '🏠',
        imageUrl: '/real-estate.webp',
        accent: '#7638FA',
        providerLabel: 'Agent/Owner',
        seekerLabel: 'Buyer/Tenant',
        providerDescription: 'I am selling or renting property',
        seekerDescription: 'I am looking to buy or rent',
        placeholderVideos: CATEGORY_PLACEHOLDERS.realestate
    },
    transport: {
        label: 'Transport',
        emoji: '🚛',
        imageUrl: '/jobs.webp',
        accent: '#FF8C00',
        providerLabel: 'Driver/Carrier',
        seekerLabel: 'Passenger/Sender',
        providerDescription: 'I provide transport services',
        seekerDescription: 'I need a ride or delivery',
        placeholderVideos: CATEGORY_PLACEHOLDERS.transport
    },
    travel: {
        label: 'Travel & Tour',
        emoji: '✈️',
        imageUrl: '/jobs.webp',
        accent: '#00BFFF',
        providerLabel: 'Agency/Guide',
        seekerLabel: 'Traveler',
        providerDescription: 'I offer travel packages',
        seekerDescription: 'I am planning a trip',
        placeholderVideos: CATEGORY_PLACEHOLDERS.travel
    },
    agriculture: {
        label: 'Agriculture',
        emoji: '🌾',
        imageUrl: '/jobs.webp',
        accent: '#4CAF50',
        providerLabel: 'Farmer/Producer',
        seekerLabel: 'Bulk Buyer',
        providerDescription: 'I grow or produce goods',
        seekerDescription: 'I want to buy in bulk',
        placeholderVideos: CATEGORY_PLACEHOLDERS.agriculture
    },
    sellbuy: {
        label: 'Sell & Buy',
        emoji: '🛍️',
        imageUrl: '/healthcare.webp',
        accent: '#FF5722',
        providerLabel: 'Seller',
        seekerLabel: 'Buyer',
        providerDescription: 'I have something to sell',
        seekerDescription: 'I am looking for products',
        placeholderVideos: CATEGORY_PLACEHOLDERS.sellbuy
    }
};
