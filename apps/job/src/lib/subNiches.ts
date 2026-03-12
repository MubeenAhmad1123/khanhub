export const SUB_NICHES: Record<string, Record<string, { key: string; label: string }[]>> = {
    jobs: {
        worker: [
            { key: 'it', label: 'IT & Software' },
            { key: 'construction', label: 'Construction' },
            { key: 'retail', label: 'Retail & Sales' },
            { key: 'healthcare', label: 'Healthcare Assistance' },
        ],
        hiring: [
            { key: 'it', label: 'IT & Software' },
            { key: 'retail', label: 'Retail' },
        ]
    },
    healthcare: {
        doctor: [
            { key: 'cardiologist', label: 'Cardiologist' },
            { key: 'dentist', label: 'Dentist' },
            { key: 'physiotherapist', label: 'Physiotherapist' },
        ],
        patient: []
    },
    education: {
        teacher: [
            { key: 'math', label: 'Mathematics' },
            { key: 'science', label: 'Science' },
            { key: 'arts', label: 'Arts' },
        ],
        student: []
    },
    marriage: {
        groom: [
            { key: 'engineer', label: 'Engineer' },
            { key: 'doctor', label: 'Doctor' },
            { key: 'business', label: 'Businessman' },
        ],
        bride: [
            { key: 'doctor', label: 'Doctor' },
            { key: 'teacher', label: 'Teacher' },
        ]
    },
    legal: {
        lawyer: [
            { key: 'criminal', label: 'Criminal Law' },
            { key: 'civil', label: 'Civil Law' },
        ],
        client: []
    },
    realestate: {
        agent: [
            { key: 'residential', label: 'Residential' },
            { key: 'commercial', label: 'Commercial' },
        ],
        buyer: []
    },
    transport: {
        seller: [
            { key: 'logistics', label: 'Logistics' },
            { key: 'taxi', label: 'Taxi Service' },
        ],
        buyer: []
    },
    travel: {
        agency: [
            { key: 'domestic', label: 'Domestic Tours' },
            { key: 'international', label: 'International Tours' },
        ],
        traveler: []
    },
    agriculture: {
        farmer: [
            { key: 'crops', label: 'Crops' },
            { key: 'livestock', label: 'Livestock' },
        ],
        buyer: []
    },
    sellbuy: {
        seller: [
            { key: 'electronics', label: 'Electronics' },
            { key: 'fashion', label: 'Fashion' },
        ],
        buyer: []
    }
};
