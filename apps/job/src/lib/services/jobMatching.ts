// ==========================================
// JOB MATCHING ALGORITHM
// ==========================================
// Calculate match scores between jobs and user profiles

import { Job, JobCategory } from '@/types/job';
import { JobSeekerProfile } from '@/types/user';

export interface MatchResult {
    jobId: string;
    matchScore: number; // 0-100
    matchReasons: string[];
    skillsMatched: string[];
    skillsMissing: string[];
    categoryMatch: boolean;
    locationMatch: boolean;
    experienceMatch: boolean;
}

/**
 * Calculate how well a job matches a user's profile
 */
export function calculateJobMatch(job: Job, userProfile: JobSeekerProfile): MatchResult {
    let score = 0;
    const matchReasons: string[] = [];
    const skillsMatched: string[] = [];
    const skillsMissing: string[] = [];

    // 1. SKILLS MATCH (40 points max)
    const userSkills = (userProfile.skills || []).map(s => s.toLowerCase());
    const requiredSkills = (job.requiredSkills || []).map(s => s.toLowerCase());

    if (requiredSkills.length > 0) {
        let skillScore = 0;
        requiredSkills.forEach(reqSkill => {
            const matched = userSkills.some(userSkill =>
                userSkill.includes(reqSkill) || reqSkill.includes(userSkill)
            );
            if (matched) {
                skillsMatched.push(reqSkill);
                skillScore += (40 / requiredSkills.length);
            } else {
                skillsMissing.push(reqSkill);
            }
        });
        score += Math.min(skillScore, 40);

        if (skillsMatched.length > 0) {
            matchReasons.push(`${skillsMatched.length} matching skill${skillsMatched.length > 1 ? 's' : ''}`);
        }
    }

    // 2. LOCATION MATCH (20 points)
    const locationMatch = job.city?.toLowerCase() === userProfile.location?.toLowerCase();
    if (locationMatch) {
        score += 20;
        matchReasons.push('Same city');
    } else if (job.isRemote) {
        score += 15;
        matchReasons.push('Remote work available');
    }

    // 3. EXPERIENCE MATCH (25 points)
    const userExperience = userProfile.yearsOfExperience || 0;
    const experienceMatch = userExperience >= job.minExperience;

    if (experienceMatch) {
        score += 25;
        matchReasons.push('Experience level matches');
    } else if (userExperience >= job.minExperience * 0.8) {
        // Close enough
        score += 15;
        matchReasons.push('Close to required experience');
    }

    // 4. CATEGORY/INDUSTRY MATCH (15 points)
    const categoryMatch = matchesCategory(userProfile.currentJobTitle, job.category);
    if (categoryMatch) {
        score += 15;
        matchReasons.push('Related industry');
    }

    return {
        jobId: job.id,
        matchScore: Math.round(score),
        matchReasons,
        skillsMatched,
        skillsMissing,
        categoryMatch,
        locationMatch,
        experienceMatch,
    };
}

/**
 * Check if job title/description matches job category
 */
function matchesCategory(jobTitle: string | undefined, category: JobCategory): boolean {
    if (!jobTitle) return false;

    const title = jobTitle.toLowerCase();

    const categoryKeywords: Record<JobCategory, string[]> = {
        hospitality: ['restaurant', 'hotel', 'cook', 'chef', 'waiter', 'server', 'hospitality', 'food', 'kitchen'],
        healthcare: ['nurse', 'doctor', 'medical', 'health', 'hospital', 'clinic', 'care'],
        technology: ['developer', 'engineer', 'programmer', 'software', 'web', 'app', 'tech', 'it', 'devops'],
        construction: ['builder', 'contractor', 'mason', 'carpenter', 'construction', 'worker'],
        transportation: ['driver', 'pilot', 'transport', 'logistics', 'delivery'],
        retail: ['sales', 'cashier', 'retail', 'shop', 'store', 'merchant'],
        education: ['teacher', 'professor', 'instructor', 'tutor', 'education', 'school'],
        finance: ['accountant', 'finance', 'banking', 'analyst', 'trader'],
        sales_marketing: ['sales', 'marketing', 'business development', 'account manager'],
        customer_service: ['customer service', 'support', 'representative', 'call center'],
        human_resources: ['hr', 'recruiter', 'human resources', 'talent'],
        operations: ['operations', 'manager', 'supervisor', 'coordinator'],
        legal: ['lawyer', 'legal', 'attorney', 'paralegal'],
        design: ['designer', 'graphic', 'ui', 'ux', 'creative'],
        manufacturing: ['manufacturing', 'production', 'factory', 'operator'],
        engineering: ['engineer', 'mechanical', 'electrical', 'civil'],
        other: [],
    };

    const keywords = categoryKeywords[category] || [];
    return keywords.some(keyword => title.includes(keyword));
}

/**
 * Get top N recommended jobs for a user
 */
export function rankJobsByMatch(
    jobs: Job[],
    userProfile: JobSeekerProfile,
    topN: number = 10
): MatchResult[] {
    const matches = jobs.map(job => calculateJobMatch(job, userProfile));

    // Sort by match score descending
    return matches
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, topN);
}

/**
 * Get match score color for UI
 */
export function getMatchScoreColor(score: number): string {
    if (score >= 80) return 'bg-green-500 text-white';
    if (score >= 60) return 'bg-blue-500 text-white';
    if (score >= 40) return 'bg-yellow-500 text-white';
    return 'bg-gray-400 text-white';
}

/**
 * Get match score label
 */
export function getMatchScoreLabel(score: number): string {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Low Match';
}

/**
 * Category icons/emojis for visual UI
 */
export const CATEGORY_ICONS: Record<JobCategory, string> = {
    hospitality: '🍽️',
    healthcare: '🏥',
    technology: '💻',
    engineering: '⚙️',
    education: '📚',
    finance: '💰',
    sales_marketing: '📊',
    customer_service: '📞',
    human_resources: '👥',
    operations: '🔧',
    legal: '⚖️',
    design: '🎨',
    manufacturing: '🏭',
    construction: '🏗️',
    transportation: '🚗',
    retail: '🛒',
    other: '💼',
};

/**
 * Get category icon
 */
export function getCategoryIcon(category: JobCategory): string {
    return CATEGORY_ICONS[category] || '💼';
}

/**
 * Match candidates to company industry
 * Shows job seekers whose skills match the company's industry
 */
export interface CandidateMatch {
    userId: string;
    name: string;
    email: string;
    skills: string[];
    location?: string;
    yearsOfExperience?: number;
    matchScore: number;
    matchReasons: string[];
}

export function matchCandidatesToIndustry(
    candidates: any[],
    companyIndustry: JobCategory,
    companyLocation?: string
): CandidateMatch[] {
    const industryKeywords = {
        hospitality: ['cooking', 'chef', 'waiter', 'server', 'food', 'restaurant', 'hotel', 'customer service', 'bartender'],
        healthcare: ['nurse', 'doctor', 'medical', 'care', 'health', 'patient', 'clinical'],
        technology: ['javascript', 'python', 'react', 'developer', 'programming', 'software', 'web', 'app', 'coding'],
        construction: ['builder', 'construction', 'carpenter', 'mason', 'plumber', 'electrician'],
        transportation: ['driver', 'delivery', 'logistics', 'transport', 'vehicle'],
        retail: ['sales', 'cashier', 'retail', 'customer service', 'merchandising'],
        education: ['teaching', 'teacher', 'tutor', 'education', 'training'],
        finance: ['accounting', 'finance', 'banking', 'bookkeeping'],
        sales_marketing: ['sales', 'marketing', 'business development', 'advertising'],
        customer_service: ['customer service', 'support', 'call center', 'help desk'],
        human_resources: ['hr', 'recruitment', 'hiring', 'talent'],
        operations: ['operations', 'management', 'supervisor', 'coordinator'],
        legal: ['legal', 'law', 'paralegal', 'compliance'],
        design: ['design', 'graphic', 'ui', 'ux', 'creative'],
        manufacturing: ['manufacturing', 'production', 'assembly', 'quality'],
        engineering: ['engineering', 'mechanical', 'electrical', 'civil'],
        other: [],
    };

    const keywords = industryKeywords[companyIndustry] || [];

    return candidates.map(candidate => {
        let score = 0;
        const reasons: string[] = [];
        const candidateSkills = (candidate.profile?.skills || []).map((s: string) => s.toLowerCase());

        // Skills match (60 points)
        let matchedCount = 0;
        keywords.forEach(keyword => {
            if (candidateSkills.some((skill: string) => skill.includes(keyword) || keyword.includes(skill))) {
                matchedCount++;
            }
        });

        if (matchedCount > 0 && keywords.length > 0) {
            score += Math.min((matchedCount / keywords.length) * 60, 60);
            reasons.push(`${matchedCount} relevant skill${matchedCount > 1 ? 's' : ''}`);
        }

        // Location match (25 points)
        if (companyLocation && candidate.profile?.location === companyLocation) {
            score += 25;
            reasons.push('Same city');
        }

        // Experience (15 points)
        if (candidate.profile?.yearsOfExperience >= 1) {
            score += 15;
            reasons.push(`${candidate.profile.yearsOfExperience} years experience`);
        }

        return {
            userId: candidate.uid,
            name: candidate.profile?.fullName || candidate.displayName || candidate.email,
            email: candidate.email,
            skills: candidate.profile?.skills || [],
            location: candidate.profile?.location,
            yearsOfExperience: candidate.profile?.yearsOfExperience,
            matchScore: Math.round(score),
            matchReasons: reasons,
        };
    }).filter(c => c.matchScore >= 30) // Only show candidates with at least 30% match
        .sort((a, b) => b.matchScore - a.matchScore);
}

