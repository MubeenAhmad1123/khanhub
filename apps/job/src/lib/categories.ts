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
    healthcare: ['hT_nvWreIhg', 'CevxZvSJLk8', 'pRpeEdMmmQ0', '09R8_2nJtjg', 'RgKAFK5djSk'],
    education: ['ru0K8uLgygA', '60ItHLz5WEA', 'JGwWNGJdvx8', 'y6120QOlsfU', 'ZbZSe6N_BXs'],
    marriage: ['nfWlot6h_JM', '9bZkp7q19f0', 'e-ORhEE9VVg', 'lp-EO5I60KA', 'dQw4w9WgXcQ'],
    domestic: ['jNQXAC9IVRw', 'RgKAFK5djSk', 'fJ9rUzIMcZQ', 'hT_nvWreIhg', 'kJQP7kiw5Fk'],
    legal: ['CevxZvSJLk8', 'pRpeEdMmmQ0', 'YQHsXMglC9A', 'OPf0YbXqDm0', 'jNQXAC9IVRw'],
    realestate: ['09R8_2nJtjg', '60ItHLz5WEA', 'ru0K8uLgygA', 'y6120QOlsfU', 'ZbZSe6N_BXs'],
    it: ['nfWlot6h_JM', '9bZkp7q19f0', 'e-ORhEE9VVg', 'lp-EO5I60KA', 'JGwWNGJdvx8'],
};

export const PLACEHOLDER_OVERLAY_DATA: Record<string, any[]> = {
    jobs: [
        { title: 'Senior UI Designer', badge: 'Job Seeker', field1: 'Figma • Adobe XD • React', field2: '5 years exp', location: 'Karachi' },
        { title: 'Khan Solutions Ltd', badge: 'Hiring', field1: 'Role: Full Stack Dev', field2: 'Salary: Rs. 120,000', location: 'Lahore' },
        { title: 'Digital Marketing Expert', badge: 'Job Seeker', field1: 'SEO • Meta Ads • Content', field2: '3 years exp', location: 'Islamabad' },
        { title: 'TechCorp Pakistan', badge: 'Hiring', field1: 'Role: Product Manager', field2: 'Salary: Rs. 200,000', location: 'Karachi' },
        { title: 'Graphic Designer', badge: 'Job Seeker', field1: 'Illustrator • Photoshop', field2: 'Fresher', location: 'Lahore' },
    ],
    healthcare: [
        { title: 'Dr. Ahmed Raza', badge: 'Doctor', field1: 'Cardiology • 12 yrs exp', field2: 'PMDC Verified', location: 'Karachi' },
        { title: 'City Hospital', badge: 'Seeking', field1: 'Need: Pediatrician', field2: 'Full Time Position', location: 'Lahore' },
        { title: 'Dr. Sara Khan', badge: 'Dentist', field1: 'Orthodontics • 8 yrs exp', field2: 'Clinic Available', location: 'Islamabad' },
        { title: 'HealthCare Clinic', badge: 'Seeking', field1: 'Need: General Physician', field2: 'Part Time OK', location: 'Karachi' },
        { title: 'Dr. Ali Hassan', badge: 'Neurologist', field1: '15 yrs exp • FCPS', field2: 'Consultation Available', location: 'Lahore' },
    ],
    education: [
        { title: 'Math Professor', badge: 'Teacher', field1: 'Calculus • Linear Algebra', field2: '10 years exp', location: 'Karachi' },
        { title: 'Beaconhouse School', badge: 'Hiring', field1: 'Need: Physics Teacher', field2: 'O/A Levels', location: 'Lahore' },
        { title: 'IELTS Specialist', badge: 'Teacher', field1: 'English • 8.5 Band', field2: 'Online Classes', location: 'Islamabad' },
        { title: 'Root International', badge: 'Hiring', field1: 'Need: KG Teacher', field2: 'Good Salary', location: 'Karachi' },
        { title: 'Physics Tutor', badge: 'Teacher', field1: 'M.Sc Physics', field2: '5 years exp', location: 'Lahore' },
    ],
    marriage: [
        { title: 'Zainab Ahmed', badge: 'Seeking', field1: 'MBBS • 26 Years', field2: 'Karachi Resident', location: 'Karachi' },
        { title: 'Osman Khan', badge: 'Seeking', field1: 'Software Engineer • 29 Years', field2: 'Lahore Family', location: 'Lahore' },
        { title: 'Ayesha Malik', badge: 'Seeking', field1: 'Business Grad • 24 Years', field2: 'Islamabad Based', location: 'Islamabad' },
        { title: 'Hamza Ali', badge: 'Seeking', field1: 'Businessman • 32 Years', field2: 'UK Citizen', location: 'Karachi' },
        { title: 'Sana Fatima', badge: 'Seeking', field1: 'Teacher • 25 Years', field2: 'Lahore Resident', location: 'Lahore' },
    ],
    domestic: [
        { title: 'Housekeeper', badge: 'Helper', field1: 'Cleaning • Cooking', field2: '5 years exp', location: 'Karachi' },
        { title: 'Private Driver', badge: 'Helper', field1: 'LTV License', field2: '10 years exp', location: 'Lahore' },
        { title: 'Nanny / Babysitter', badge: 'Helper', field1: 'Child Care • First Aid', field2: '3 years exp', location: 'Islamabad' },
        { title: 'Security Guard', badge: 'Helper', field1: 'Ex-Army', field2: 'Height: 6ft', location: 'Karachi' },
        { title: 'Cook / Chef', badge: 'Helper', field1: 'Desi • Chinese', field2: '7 years exp', location: 'Lahore' },
    ],
    legal: [
        { title: 'Advocate Ali', badge: 'Lawyer', field1: 'Corporate Law', field2: 'High Court', location: 'Karachi' },
        { title: 'Legal Firm', badge: 'Hiring', field1: 'Junior Associate', field2: 'LLB Required', location: 'Lahore' },
        { title: 'Advocate Sara', badge: 'Lawyer', field1: 'Family Law', field2: 'Divorce Specialist', location: 'Islamabad' },
        { title: 'Kamal Associates', badge: 'Hiring', field1: 'Para-legal', field2: 'Experience Required', location: 'Karachi' },
        { title: 'Advocate Raza', badge: 'Lawyer', field1: 'Criminal Law', field2: 'Supreme Court', location: 'Lahore' },
    ],
    realestate: [
        { title: 'DHA Specialist', badge: 'Agent', field1: 'Buying • Selling', field2: 'DHA Karachi', location: 'Karachi' },
        { title: 'Zameen Experts', badge: 'Broker', field1: 'Commercial Property', field2: 'Lahore Focus', location: 'Lahore' },
        { title: 'Pindi Plots', badge: 'Agent', field1: 'Bahria Town', field2: 'Plots & Files', location: 'Islamabad' },
        { title: 'Apartment Expert', badge: 'Agent', field1: 'Rentals', field2: 'Clifton / Defense', location: 'Karachi' },
        { title: 'Raza Real Estate', badge: 'Broker', field1: 'Houses for Sale', field2: 'Johar Town', location: 'Lahore' },
    ],
    it: [
        { title: 'React Developer', badge: 'Freelancer', field1: 'Next.js • Firebase • TypeScript', field2: '4 years exp', location: 'Karachi' },
        { title: 'DigiSoft Agency', badge: 'Client', field1: 'Need: Mobile App Dev', field2: 'Budget: Rs. 150,000', location: 'Lahore' },
        { title: 'AI/ML Engineer', badge: 'Freelancer', field1: 'Python • TensorFlow • LLMs', field2: '6 years exp', location: 'Islamabad' },
        { title: 'StartupPK', badge: 'Client', field1: 'Need: Full Stack Dev', field2: 'Equity + Salary', location: 'Karachi' },
        { title: 'UI/UX Designer', badge: 'Freelancer', field1: 'Figma • Webflow • Framer', field2: '3 years exp', location: 'Lahore' },
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
        providerLabel: 'Doctor',
        seekerLabel: 'Patient',
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
