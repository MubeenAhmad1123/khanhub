export interface BlogPost {
    title: string;
    slug: string;
    description: string;
    content: string;
    category: 'Seeker' | 'Employer';
    date: string;
    author: string;
    image: string;
}

export const blogPosts: BlogPost[] = [
    {
        title: "How to Ace Your Next Tech Interview in Pakistan",
        slug: "ace-tech-interview-pakistan",
        description: "Key tips and cultural nuances to master the hiring process in Pakistan's growing tech scene.",
        category: "Seeker",
        date: "2026-02-10",
        author: "Ahmed Khan",
        image: "/blog/interview-tips.webp",
        content: `Tech interviews in Pakistan are evolving. While technical skills are paramount, cultural fit and soft skills are increasingly valued by top companies in Lahore, Karachi, and Islamabad. 

### 1. Preparation is Key
Research the company's tech stack. If you're applying for a Next.js role at a startup, be ready for deep dives into Server Components and Hydration.

### 2. Communication Matters
Be clear and concise. Explain your thought process during coding challenges.

### 3. Ask Questions
Show interest in the company's roadmap and team culture.`
    },
    {
        title: "5 Recruitment Trends Pakistani Employers Need to Know",
        slug: "pakistani-recruitment-trends",
        description: "From remote work to AI-driven vetting, see how the landscape is changing.",
        category: "Employer",
        date: "2026-02-08",
        author: "Sarah Malik",
        image: "/blog/recruitment-trends.webp",
        content: `Managing talent in 2026 requires a mix of traditional wisdom and modern tools. 

### Remote vs Hybrid
The debate continues, but top talent still prioritizes flexibility.

### AI in Hiring
Using tools like KhanHub's AI Matching can reduce vetting time by 60%.`
    },
    {
        title: "Building an Impressive Resume as a Fresh Graduate",
        slug: "fresh-graduate-resume-guide",
        description: "Stand out in a competitive market even without years of experience.",
        category: "Seeker",
        date: "2026-02-05",
        author: "Zainab Ali",
        image: "/blog/resume-guide.webp",
        content: `Your resume is your first impression. For fresh graduates, projects and certifications are your best friends.

### Focus on Projects
Highlight your GitHub repositories and live demos.`
    }
];
