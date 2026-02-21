// src/data/success-stories.ts
// ─────────────────────────────────────────────────────────────────
// Data structure for patient success stories, reviews, and results
// ─────────────────────────────────────────────────────────────────

export interface SuccessStory {
    id: string;
    name: string;
    age?: number;
    location?: string;
    department: string;
    departmentSlug: string;
    title: string;
    content: string;
    rating: number;
    date: string;
    imageAfter: string;
    imageBefore?: string;
    avatar?: string;
    tags: string[];
}

export const SUCCESS_STORIES: SuccessStory[] = [
    {
        id: '1',
        name: 'Muhammad Ali',
        age: 45,
        location: 'Lahore',
        department: 'Surgical Services',
        departmentSlug: 'surgical-services',
        title: 'Life-changing Knee Surgery',
        content: 'After years of chronic knee pain, the surgical team at Khan Hub performed a miraculous procedure. I am now back on my feet and walking without any support. The post-op care was exceptional.',
        rating: 5,
        date: '2024-01-15',
        imageAfter: '/images/surgical-knee-success-muhammad-ali.webp',
        imageBefore: '/images/success/knee-before.webp',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali',
        tags: ['Surgery', 'Recovery', 'Patient Review']
    },
    {
        id: '2',
        name: 'Fatima Bibi',
        age: 28,
        location: 'Faisalabad',
        department: 'Maternity Care',
        departmentSlug: 'medical-center',
        title: 'Blessed with a Healthy Baby',
        content: 'The doctors and nurses at the medical center provided world-class care during my pregnancy. From regular checkups to the delivery day, everything was managed professionally and with great compassion.',
        rating: 5,
        date: '2024-02-10',
        imageAfter: '/images/maternity-care-fatima-bibi.webp',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima',
        tags: ['Maternity', 'Healthcare', 'Motherhood']
    },
    {
        id: '3',
        name: 'Ahmed Khan',
        age: 32,
        location: 'Multan',
        department: 'Institute of Health Sciences',
        departmentSlug: 'institute-health-sciences',
        title: 'From Student to Professional',
        content: 'Completing my Pharmacy Technician course from IHS was the best decision of my life. The practical training and expert guidance helped me secure a high-paying job immediately after graduation.',
        rating: 5,
        date: '2023-11-20',
        imageAfter: '/images/ihs-pharmacy-ahmed-khan.webp',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed',
        tags: ['Education', 'Career', 'Success']
    },
    {
        id: '4',
        name: 'Zainab Qureshi',
        age: 55,
        location: 'Sahiwal',
        department: 'Rehabilitation',
        departmentSlug: 'rehabilitation',
        title: 'Regained Mobility After Stroke',
        content: 'The physiotherapy sessions at Khan Hub Rehabilitation Center are top-notch. I had lost movement in my left arm, but with their dedicated support, I can now use it perfectly well.',
        rating: 5,
        date: '2024-03-05',
        imageAfter: '/images/success/rehab-after.webp',
        imageBefore: '/images/success/rehab-before.webp',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zainab',
        tags: ['Rehab', 'Physiotherapy', 'Healing']
    }
];
