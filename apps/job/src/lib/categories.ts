export type CategoryKey =
    | 'jobs'
    | 'healthcare'
    | 'education'
    | 'marriage'
    | 'domestic'
    | 'legal'
    | 'realestate'
    | 'it';

export interface CategoryConfig {
    label: string;
    emoji: string;
    accent: string;
    providerLabel: string;
    seekerLabel: string;
    placeholderVideos: string[];
    imageUrl?: string;
}

export const PLACEHOLDER_VIDEO_IDS = [
    'jNQXAC9IVRw',
    'kJQP7kiw5Fk',
    'OPf0YbXqDm0',
    'YQHsXMglC9A',
    'fJ9rUzIMcZQ',
    'hT_nvWreIhg',
    'CevxZvSJLk8',
    'pRpeEdMmmQ0',
    '09R8_2nJtjg',
    'RgKAFK5djSk',
    'ru0K8uLgygA',
    '60ItHLz5WEA',
    'JGwWNGJdvx8',
    'y6120QOlsfU',
    'ZbZSe6N_BXs',
    'nfWlot6h_JM',
    '9bZkp7q19f0',
    'e-ORhEE9VVg',
    'lp-EO5I60KA',
    'dQw4w9WgXcQ'
];

export const CATEGORY_PLACEHOLDERS: Record<string, string[]> = {
    jobs: ['jNQXAC9IVRw', 'kJQP7kiw5Fk', 'OPf0YbXqDm0', 'YQHsXMglC9A', 'fJ9rUzIMcZQ'],
    healthcare: ['wITuU8SIrHs', 'Z9h6fOHnYN4', 'GsGA3h5SSrc', 'h6gh3uJIefU', '6rnYbvhaY6Q', 'wO56974d0GU', 'DfXciGskaQk'],
    education: ['ru0K8uLgygA', '60ItHLz5WEA', 'JGwWNGJdvx8', 'y6120QOlsfU', 'ZbZSe6N_BXs'],
    marriage: ['nfWlot6h_JM', '9bZkp7q19f0', 'e-ORhEE9VVg', 'lp-EO5I60KA', 'dQw4w9WgXcQ'],
    domestic: ['jNQXAC9IVRw', 'RgKAFK5djSk', 'fJ9rUzIMcZQ', 'hT_nvWreIhg', 'kJQP7kiw5Fk'],
    legal: ['CevxZvSJLk8', 'pRpeEdMmmQ0', 'YQHsXMglC9A', 'OPf0YbXqDm0', 'jNQXAC9IVRw'],
    realestate: ['09R8_2nJtjg', '60ItHLz5WEA', 'ru0K8uLgygA', 'y6120QOlsfU', 'ZbZSe6N_BXs'],
    it: ['nfWlot6h_JM', '9bZkp7q19f0', 'e-ORhEE9VVg', 'lp-EO5I60KA', 'JGwWNGJdvx8'],
};

export const PLACEHOLDER_OVERLAY_DATA: Record<string, any[]> = {
    jobs: [
        { title: 'Senior UI Designer', badge: 'Job Seeker', field1: 'Figma • Adobe XD • React', field2: '5 years exp', location: 'Karachi', views: 12400 },
        { title: 'Khan Solutions Ltd', badge: 'Hiring', field1: 'Role: Full Stack Dev', field2: 'Salary: Rs. 120,000', location: 'Lahore', views: 45000 },
        { title: 'Digital Marketing Expert', badge: 'Job Seeker', field1: 'SEO • Meta Ads • Content', field2: '3 years exp', location: 'Islamabad', views: 8900 },
        { title: 'TechCorp Pakistan', badge: 'Hiring', field1: 'Role: Product Manager', field2: 'Salary: Rs. 200,000', location: 'Karachi', views: 25600 },
        { title: 'Graphic Designer', badge: 'Job Seeker', field1: 'Illustrator • Photoshop', field2: 'Fresher', location: 'Lahore', views: 5600 },
    ],
    healthcare: [
        { title: 'AI Transcription for Doctors', badge: 'Doctor', field1: 'Reducing clinical burnout', field2: 'AI & Documentation', city: 'Karachi', views: 150000 },
        { title: 'AI Transforming Healthcare', badge: 'Doctor', field1: 'Real-time patient care AI', field2: 'Digital Health', city: 'Lahore', views: 92000 },
        { title: 'Future of Wearable Tech', badge: 'Specialist', field1: 'Chronic pain management', field2: 'MedTech Innovation', city: 'Islamabad', views: 450000 },
        { title: 'Revolutionising Imaging', badge: 'Radiologist', field1: '40 years of imaging tech', field2: 'Medical Imaging', city: 'Karachi', views: 1200000 },
        { title: 'Digital Diagnosis', badge: 'Doctor', field1: 'Remote diagnostic tools', field2: 'Digital Health', city: 'Peshawar', views: 34000 },
        { title: 'Wearable Technology', badge: 'HealthTech', field1: 'Smartwatches in healthcare', field2: 'Wearables', city: 'Lahore', views: 88000 },
        { title: 'Healthcare to Tech Transition', badge: 'IT + Healthcare', field1: 'Clinician to IT role', field2: 'Career Shift', city: 'Karachi', views: 56000 },
    ],
    education: [
        { title: 'Math Professor', badge: 'Teacher', field1: 'Calculus • Linear Algebra', field2: '10 years exp', location: 'Karachi', views: 45000 },
        { title: 'Beaconhouse School', badge: 'Hiring', field1: 'Need: Physics Teacher', field2: 'O/A Levels', location: 'Lahore', views: 12000 },
        { title: 'IELTS Specialist', badge: 'Teacher', field1: 'English • 8.5 Band', field2: 'Online Classes', location: 'Islamabad', views: 88000 },
        { title: 'Root International', badge: 'Hiring', field1: 'Need: KG Teacher', field2: 'Good Salary', location: 'Karachi', views: 9500 },
        { title: 'Physics Tutor', badge: 'Teacher', field1: 'M.Sc Physics', field2: '5 years exp', location: 'Lahore', views: 32000 },
    ],
    marriage: [
        { title: 'Zainab Ahmed', badge: 'Seeking', field1: 'MBBS • 26 Years', field2: 'Karachi Resident', location: 'Karachi', views: 250000 },
        { title: 'Osman Khan', badge: 'Seeking', field1: 'Software Engineer • 29 Years', field2: 'Lahore Family', location: 'Lahore', views: 180000 },
        { title: 'Ayesha Malik', badge: 'Seeking', field1: 'Business Grad • 24 Years', field2: 'Islamabad Based', location: 'Islamabad', views: 320000 },
        { title: 'Hamza Ali', badge: 'Seeking', field1: 'Businessman • 32 Years', field2: 'UK Citizen', location: 'Karachi', views: 150000 },
        { title: 'Sana Fatima', badge: 'Seeking', field1: 'Teacher • 25 Years', field2: 'Lahore Resident', location: 'Lahore', views: 95000 },
    ],
    domestic: [
        { title: 'Housekeeper', badge: 'Helper', field1: 'Cleaning • Cooking', field2: '5 years exp', location: 'Karachi', views: 12000 },
        { title: 'Private Driver', badge: 'Helper', field1: 'LTV License', field2: '10 years exp', location: 'Lahore', views: 45000 },
        { title: 'Nanny / Babysitter', badge: 'Helper', field1: 'Child Care • First Aid', field2: '3 years exp', location: 'Islamabad', views: 67000 },
        { title: 'Security Guard', badge: 'Helper', field1: 'Ex-Army', field2: 'Height: 6ft', location: 'Karachi', views: 8900 },
        { title: 'Cook / Chef', badge: 'Helper', field1: 'Desi • Chinese', field2: '7 years exp', location: 'Lahore', views: 23000 },
    ],
    legal: [
        { title: 'Advocate Ali', badge: 'Lawyer', field1: 'Corporate Law', field2: 'High Court', location: 'Karachi', views: 85000 },
        { title: 'Legal Firm', badge: 'Hiring', field1: 'Junior Associate', field2: 'LLB Required', location: 'Lahore', views: 15000 },
        { title: 'Advocate Sara', badge: 'Lawyer', field1: 'Family Law', field2: 'Divorce Specialist', location: 'Islamabad', views: 92000 },
        { title: 'Kamal Associates', badge: 'Hiring', field1: 'Para-legal', field2: 'Experience Required', location: 'Karachi', views: 7600 },
        { title: 'Advocate Raza', badge: 'Lawyer', field1: 'Criminal Law', field2: 'Supreme Court', location: 'Lahore', views: 44000 },
    ],
    realestate: [
        { title: 'DHA Specialist', badge: 'Agent', field1: 'Buying • Selling', field2: 'DHA Karachi', location: 'Karachi', views: 1200000 },
        { title: 'Zameen Experts', badge: 'Broker', field1: 'Commercial Property', field2: 'Lahore Focus', location: 'Lahore', views: 450000 },
        { title: 'Pindi Plots', badge: 'Agent', field1: 'Bahria Town', field2: 'Plots & Files', location: 'Islamabad', views: 890000 },
        { title: 'Apartment Expert', badge: 'Agent', field1: 'Rentals', field2: 'Clifton / Defense', location: 'Karachi', views: 320000 },
        { title: 'Raza Real Estate', badge: 'Broker', field1: 'Houses for Sale', field2: 'Johar Town', location: 'Lahore', views: 150000 },
    ],
    it: [
        { title: 'React Developer', badge: 'Freelancer', field1: 'Next.js • Firebase • TypeScript', field2: '4 years exp', location: 'Karachi', views: 150000 },
        { title: 'DigiSoft Agency', badge: 'Client', field1: 'Need: Mobile App Dev', field2: 'Budget: Rs. 150,000', location: 'Lahore', views: 25000 },
        { title: 'AI/ML Engineer', badge: 'Freelancer', field1: 'Python • TensorFlow • LLMs', field2: '6 years exp', location: 'Islamabad', views: 88000 },
        { title: 'StartupPK', badge: 'Client', field1: 'Need: Full Stack Dev', field2: 'Equity + Salary', location: 'Karachi', views: 12000 },
        { title: 'UI/UX Designer', badge: 'Freelancer', field1: 'Figma • Webflow • Framer', field2: '3 years exp', location: 'Lahore', views: 95000 },
    ],
};

export const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
    jobs: {
        label: 'Jobs',
        emoji: '💼',
        imageUrl: '/jobs.webp',
        accent: '#FF0069',
        providerLabel: 'Job Seeker',
        seekerLabel: 'Company',
        placeholderVideos: CATEGORY_PLACEHOLDERS.jobs
    },
    healthcare: {
        label: 'Healthcare',
        emoji: '🏥',
        imageUrl: '/healthcare.webp',
        accent: '#00C896',
        providerLabel: 'Doctor / Specialist',
        seekerLabel: 'Patient / Client',
        placeholderVideos: CATEGORY_PLACEHOLDERS.healthcare
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
    domestic: {
        label: 'Domestic Help',
        emoji: '🏠',
        imageUrl: '/domestic help.webp',
        accent: '#FF8C42',
        providerLabel: 'Helper',
        seekerLabel: 'Household',
        placeholderVideos: CATEGORY_PLACEHOLDERS.domestic
    },
    legal: {
        label: 'Legal',
        emoji: '⚖️',
        imageUrl: '/lawyer.webp',
        accent: '#4A90D9',
        providerLabel: 'Lawyer',
        seekerLabel: 'Client',
        placeholderVideos: CATEGORY_PLACEHOLDERS.legal
    },
    realestate: {
        label: 'Real Estate',
        emoji: '🏗️',
        imageUrl: '/real-estate.webp',
        accent: '#7638FA',
        providerLabel: 'Agent',
        seekerLabel: 'Buyer / Renter',
        placeholderVideos: CATEGORY_PLACEHOLDERS.realestate
    },
    it: {
        label: 'IT & Tech',
        emoji: '💻',
        imageUrl: '/tech.webp',
        accent: '#00E5FF',
        providerLabel: 'Freelancer',
        seekerLabel: 'Client',
        placeholderVideos: CATEGORY_PLACEHOLDERS.it
    }
};
