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
}

export const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
    jobs: {
        label: 'Jobs',
        emoji: '💼',
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
        accent: '#00E5FF',
        providerLabel: 'Freelancer',
        seekerLabel: 'Client',
        placeholderVideos: [
            'dQw4w9WgXcQ',
            'jNQXAC9IVRw',
        ]
    }
};
