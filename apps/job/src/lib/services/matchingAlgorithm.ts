// ==========================================
// MATCH SCORE ALGORITHM (FIXED IMPORTS)
// ==========================================
// Calculate how well a job seeker matches a job posting (0-100%)

import { JobSeeker, Job } from '@/types/DATABASE_SCHEMA'; // ✅ Fixed path

const MATCH_SCORE_WEIGHTS = {
    SKILLS: 40,
    EXPERIENCE: 30,
    LOCATION: 15,
    EDUCATION: 15,
};

/**
 * Calculate match score between a job seeker and a job posting
 * @param jobSeeker - The job seeker's profile
 * @param job - The job posting
 * @returns Match score (0-100)
 */
export function calculateMatchScore(jobSeeker: JobSeeker, job: Job): number {
    let totalScore = 0;

    // 1. SKILLS MATCHING (40%)
    const skillsScore = calculateSkillsMatch(jobSeeker.profile.skills, job.requiredSkills);
    totalScore += skillsScore * (MATCH_SCORE_WEIGHTS.SKILLS / 100);

    // 2. EXPERIENCE MATCHING (30%)
    const experienceScore = calculateExperienceMatch(jobSeeker.profile.experience, job.minExperience);
    totalScore += experienceScore * (MATCH_SCORE_WEIGHTS.EXPERIENCE / 100);

    // 3. LOCATION MATCHING (15%)
    const locationScore = calculateLocationMatch(
        jobSeeker.profile.location,
        job.city,
        job.isRemote,
        jobSeeker.profile.remoteOnly || jobSeeker.profile.desiredLocations.some(l => l.toLowerCase() === 'remote')
    );
    totalScore += locationScore * (MATCH_SCORE_WEIGHTS.LOCATION / 100);

    // 4. EDUCATION MATCHING (15%)
    // Map requiredQualifications array to a single level for comparison if possible, or iterate
    const educationalRequirement = job.requiredQualifications.find(q =>
        ['bachelor', 'master', 'phd', 'doctorate', 'associate', 'diploma'].some(level => q.toLowerCase().includes(level))
    );
    const educationScore = calculateEducationMatch(jobSeeker.profile.education, educationalRequirement);
    totalScore += educationScore * (MATCH_SCORE_WEIGHTS.EDUCATION / 100);

    return Math.round(totalScore);
}

/**
 * Calculate skills match percentage
 * @param candidateSkills - Array of candidate's skills
 * @param requiredSkills - Array of job's required skills
 * @returns Percentage (0-100)
 */
function calculateSkillsMatch(candidateSkills: string[], requiredSkills: string[]): number {
    if (requiredSkills.length === 0) return 100; // No skills required = perfect match

    // Normalize skills to lowercase for comparison
    const normalizedCandidateSkills = candidateSkills.map((s) => s.toLowerCase().trim());
    const normalizedRequiredSkills = requiredSkills.map((s) => s.toLowerCase().trim());

    // Count how many required skills the candidate has
    const matchingSkills = normalizedRequiredSkills.filter((skill) =>
        normalizedCandidateSkills.some((candidateSkill) => candidateSkill.includes(skill) || skill.includes(candidateSkill))
    );

    const matchPercentage = (matchingSkills.length / normalizedRequiredSkills.length) * 100;
    return Math.min(matchPercentage, 100);
}

/**
 * Calculate experience match percentage
 * @param candidateExperience - Array of candidate's work experiences
 * @param minimumExperience - Minimum years required by job
 * @returns Percentage (0-100)
 */
function calculateExperienceMatch(candidateExperience: any[], minimumExperience: number): number {
    // Calculate total years of experience
    const totalYears = candidateExperience.reduce((total, exp) => {
        const startDate = new Date(exp.startDate + '-01');
        const endDate = exp.isCurrent ? new Date() : new Date(exp.endDate + '-01');
        const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return total + years;
    }, 0);

    if (minimumExperience === 0) return 100; // No experience required

    // Score based on how close candidate's experience is to required
    if (totalYears >= minimumExperience) {
        // Candidate meets or exceeds requirement
        const excessYears = totalYears - minimumExperience;
        if (excessYears <= 2) {
            return 100; // Perfect match
        } else {
            // Slight penalty for being over-qualified (diminishing returns)
            return Math.max(100 - (excessYears - 2) * 5, 70);
        }
    } else {
        // Candidate has less experience than required
        const shortfall = minimumExperience - totalYears;
        return Math.max(100 - shortfall * 20, 0);
    }
}

/**
 * Calculate location match percentage
 * @param candidateCity - Candidate's city
 * @param jobCity - Job's city
 * @param isRemote - Whether job is remote
 * @param openToRemote - Whether candidate is open to remote
 * @returns Percentage (0-100)
 */
function calculateLocationMatch(
    candidateCity: string | undefined,
    jobCity: string,
    isRemote: boolean,
    openToRemote: boolean
): number {
    // Remote jobs
    if (isRemote && openToRemote) return 100; // Perfect match
    if (isRemote && !openToRemote) return 70; // Job is remote but candidate prefers on-site

    // On-site jobs
    if (!candidateCity) return 50; // Candidate hasn't specified city

    const normalizedCandidateCity = candidateCity.toLowerCase().trim();
    const normalizedJobCity = jobCity.toLowerCase().trim();

    if (normalizedCandidateCity === normalizedJobCity) return 100; // Same city
    if (normalizedCandidateCity.includes(normalizedJobCity) || normalizedJobCity.includes(normalizedCandidateCity)) {
        return 80; // Partial match (e.g., "Lahore" vs "Lahore Cantt")
    }

    return 30; // Different cities
}

/**
 * Calculate education match percentage
 * @param candidateEducation - Array of candidate's education entries
 * @param requiredEducation - Required education level (e.g., "Bachelor's degree")
 * @returns Percentage (0-100)
 */
function calculateEducationMatch(candidateEducation: any[], requiredEducation: string | undefined): number {
    if (!requiredEducation) return 100; // No education requirement

    if (candidateEducation.length === 0) return 30; // No education data

    // Education level hierarchy
    const educationLevels: { [key: string]: number } = {
        'high school': 1,
        'diploma': 2,
        'associate': 3,
        "bachelor's": 4,
        "master's": 5,
        'mba': 5,
        'phd': 6,
        'doctorate': 6,
    };

    // Find candidate's highest education level
    const candidateHighestLevel = candidateEducation.reduce((highest, edu) => {
        const degreeNormalized = edu.degree.toLowerCase();
        for (const [level, rank] of Object.entries(educationLevels)) {
            if (degreeNormalized.includes(level)) {
                return Math.max(highest, rank);
            }
        }
        return highest;
    }, 0);

    // Find required education level
    const requiredNormalized = requiredEducation.toLowerCase();
    let requiredLevel = 0;
    for (const [level, rank] of Object.entries(educationLevels)) {
        if (requiredNormalized.includes(level)) {
            requiredLevel = rank;
            break;
        }
    }

    if (requiredLevel === 0) return 100; // Couldn't parse requirement

    // Score based on comparison
    if (candidateHighestLevel >= requiredLevel) {
        return 100; // Meets or exceeds requirement
    } else {
        const gap = requiredLevel - candidateHighestLevel;
        return Math.max(100 - gap * 25, 0);
    }
}

/**
 * Get match score badge color based on score
 * @param score - Match score (0-100)
 * @returns Tailwind color class
 */
export function getMatchScoreBadgeColor(score: number): string {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-blue-100 text-blue-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
}

/**
 * Get match score label
 * @param score - Match score (0-100)
 * @returns Label string
 */
export function getMatchScoreLabel(score: number): string {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Low Match';
}