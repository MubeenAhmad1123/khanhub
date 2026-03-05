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

export const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
    jobs: {
        label: 'Jobs',
        emoji: '💼',
        imageUrl: '/jobs.webp',
        accent: '#FF0069',
        providerLabel: 'Job Seeker',
        seekerLabel: 'Company',
        placeholderVideos: [
            'dQw4w9WgXcQ', // Never Gonna Give You Up (Placeholder)
            'jNQXAC9IVRw', // Me at the zoo (Placeholder)
        ]
    },
    healthcare: {
        label: 'Healthcare',
        emoji: '🏥',
        imageUrl: '/healthcare.webp',
        accent: '#00C896',
        providerLabel: 'Doctor',
        seekerLabel: 'Patient',
        placeholderVideos: [
            'dQw4w9WgXcQ',
            'jNQXAC9IVRw',
        ]
    },
    education: {
        label: 'Education',
        emoji: '🎓',
        imageUrl: '/education (2).webp',
        accent: '#FFD600',
        providerLabel: 'Teacher',
        seekerLabel: 'Student',
        placeholderVideos: [
            'dQw4w9WgXcQ',
            'jNQXAC9IVRw',
        ]
    },
    marriage: {
        label: 'Marriage Bureau',
        emoji: '💍',
        imageUrl: '/marraige.webp',
        accent: '#FF6B9D',
        providerLabel: 'Presenting',
        seekerLabel: 'Looking',
        placeholderVideos: [
            'dQw4w9WgXcQ',
            'jNQXAC9IVRw',
        ]
    },
    domestic: {
        label: 'Domestic Help',
        emoji: '🏠',
        imageUrl: '/domestic help.webp',
        accent: '#FF8C42',
        providerLabel: 'Helper',
        seekerLabel: 'Household',
        placeholderVideos: [
            'dQw4w9WgXcQ',
            'jNQXAC9IVRw',
        ]
    },
    legal: {
        label: 'Legal',
        emoji: '⚖️',
        imageUrl: '/lawyer.webp',
        accent: '#4A90D9',
        providerLabel: 'Lawyer',
        seekerLabel: 'Client',
        placeholderVideos: [
            'dQw4w9WgXcQ',
            'jNQXAC9IVRw',
        ]
    },
    realestate: {
        label: 'Real Estate',
        emoji: '🏗️',
        imageUrl: '/real-estate.webp',
        accent: '#7638FA',
        providerLabel: 'Agent',
        seekerLabel: 'Buyer / Renter',
        placeholderVideos: [
            'dQw4w9WgXcQ',
            'jNQXAC9IVRw',
        ]
    },
    it: {
        label: 'IT & Tech',
        emoji: '💻',
        imageUrl: '/tech.webp',
        accent: '#00E5FF',
        providerLabel: 'Freelancer',
        seekerLabel: 'Client',
        placeholderVideos: [
            'dQw4w9WgXcQ',
            'jNQXAC9IVRw',
        ]
    }
};
