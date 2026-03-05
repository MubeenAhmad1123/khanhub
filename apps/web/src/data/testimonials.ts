// src/data/testimonials.ts

export interface Testimonial {
    id: string;
    name: string;
    role?: string;
    timeAgo: string;
    stars: number;
    text: string;
    avatarUrl?: string;
    avatarColor?: string;
    isRtl?: boolean;
}

export const TESTIMONIALS: Testimonial[] = [
    {
        id: '1',
        name: 'Doctor Nimra',
        timeAgo: 'Yesterday',
        stars: 5,
        text: "It has been a year to me doing LHV (Lady health visitor) course in the South Punjab institute of medical Science and I can't explain how much I learned in this one year",
        avatarUrl: '/doctor-nimra.webp',
    },
    {
        id: '2',
        name: 'Kamran Jutt',
        timeAgo: 'Yesterday',
        stars: 5,
        text: "One of my friends is addicted to the ice and chras we got him to the Khan hub rehabilitation center vehari now he is perfectly fine",
        avatarUrl: '/kamran-Jutt.webp',
    },
    {
        id: '3',
        name: 'Muhammad Shafique',
        timeAgo: 'Yesterday',
        stars: 5,
        text: "One of our relatives are admitted hare in Khan Hub Rehabilitation center now they got recovered from the addiction",
        avatarUrl: '/muhammad-Shafique.webp',
    },
    {
        id: '4',
        name: 'Zaba Zabi',
        timeAgo: 'Yesterday',
        stars: 5,
        text: "South Punjab institute of medical clg neat and clean environment seprat classes girls and boys",
        avatarUrl: '/zabaZabi.webp',
    },
    {
        id: '5',
        name: 'feroza mahfooz',
        timeAgo: 'Yesterday',
        stars: 5,
        text: "South Punjab institute of medical clg is very comfortable environment",
        avatarUrl: '/feroza-mahfooz.webp',
    },
    {
        id: '6',
        name: 'Muhammad Ahmad',
        timeAgo: 'Yesterday',
        stars: 5,
        text: "I love the behavior of the staff hare all are well coming and careful peoples ❤️👍",
        avatarUrl: '/muhammad-Ahmad.webp',
    },
    {
        id: '7',
        name: 'Dilshad Akhtar',
        timeAgo: '7 days ago',
        stars: 5,
        text: "South Punjab Institute of Medical Science, Vehari واقعی ایک ایسا ادارہ ہے جو نہ صرف معیاری تعلیم فراہم کرتا ہے بلکہ اپنے طلبہ کے روشن مستقبل کی ضمانت بھی دیتا ہے۔",
        avatarUrl: '/dilshad-Akhtar.webp',
        isRtl: true,
    },
    {
        id: '8',
        name: 'Qummar Iqbal',
        timeAgo: '2 weeks ago',
        stars: 5,
        text: "Excellent services. Am satysfaing this platform",
        avatarUrl: '/qummar-Iqbal.webp',
    },
    {
        id: '9',
        name: 'Muhammad Khan',
        timeAgo: '4 weeks ago',
        stars: 5,
        text: "Excellent",
        avatarUrl: '/muhammad-Khan.webp',
    },
    {
        id: '10',
        name: 'Shamir Mayo',
        timeAgo: '4 weeks ago',
        stars: 5,
        text: "I love the service here my grandma got operated in their hospital and now she super fine",
        avatarUrl: '/shamir-Mayo.webp',
    },
    {
        id: '11',
        name: 'Rameez Sunny',
        timeAgo: '4 weeks ago',
        stars: 5,
        text: "Excellent experience",
        avatarUrl: '/rameez-Sunny.webp',
    },
    {
        id: '12',
        name: 'Noman Alone',
        timeAgo: 'Just now',
        stars: 5,
        text: "I am a student of khan Hub Skill center. I learned Ms office Ms Excel Ms word Graphic designing and Web development",
        avatarUrl: '/noman-alone.webp',
    }
];
