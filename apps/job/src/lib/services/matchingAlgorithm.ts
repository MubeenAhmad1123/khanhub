import { UserProfile } from '@/types/user';
import { Job } from '@/types/job';

/**
 * Calculate job match score based on candidate profile and job requirements
 * 
 * Scoring breakdown:
 * - Skills matching: 40%
 * - Experience years: 30%
 * - Location matching: 15%
 * - Education matching: 15%
 */
export function calculateMatchScore(
    candidateProfile: UserProfile,
    job: Job
): number {
    let score = 0;

    // 1. Skills Matching (40 points)
    const candidateSkills = candidateProfile.profile.skills.map(s => s.toLowerCase());
    const requiredSkills = job.requiredSkills.map(s => s.toLowerCase());

    if (requiredSkills.length > 0) {
        const matchedSkills = requiredSkills.filter(skill =>
            candidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))
        );
        const skillsMatchPercentage = matchedSkills.length / requiredSkills.length;
        score += skillsMatchPercentage * 40;
    } else {
        // If no required skills specified, give full points
        score += 40;
    }

    // 2. Experience Years Matching (30 points)
    const totalExperienceYears = candidateProfile.profile.experience.reduce((total, exp) => {
        const years = calculateYearsOfExperience(exp.startDate, exp.endDate, exp.current);
        return total + years;
    }, 0);

    if (job.requiredExperience > 0) {
        if (totalExperienceYears >= job.requiredExperience) {
            score += 30;
        } else {
            const experiencePercentage = totalExperienceYears / job.requiredExperience;
            score += experiencePercentage * 30;
        }
    } else {
        // If no experience required, give full points
        score += 30;
    }

    // 3. Location Matching (15 points)
    if (candidateProfile.profile.location) {
        const candidateLocation = candidateProfile.profile.location.toLowerCase();
        const jobLocation = job.location.toLowerCase();
        const jobCity = job.city.toLowerCase();

        if (
            candidateLocation.includes(jobCity) ||
            jobCity.includes(candidateLocation) ||
            candidateLocation.includes(jobLocation) ||
            job.locationType === 'remote'
        ) {
            score += 15;
        }
    }

    // 4. Education Matching (15 points)
    if (job.requiredEducation && candidateProfile.profile.education.length > 0) {
        const requiredEduLower = job.requiredEducation.toLowerCase();
        const hasMatchingEducation = candidateProfile.profile.education.some(edu =>
            edu.degree.toLowerCase().includes(requiredEduLower) ||
            requiredEduLower.includes(edu.degree.toLowerCase())
        );

        if (hasMatchingEducation) {
            score += 15;
        }
    } else if (!job.requiredEducation) {
        // If no education requirement, give full points
        score += 15;
    }

    return Math.round(score);
}

/**
 * Calculate years of experience from date range
 */
function calculateYearsOfExperience(
    startDate: string,
    endDate: string | null,
    current: boolean
): number {
    try {
        const start = new Date(startDate);
        const end = current ? new Date() : (endDate ? new Date(endDate) : new Date());

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

        return diffYears;
    } catch (error) {
        return 0;
    }
}

/**
 * Get match score category
 */
export function getMatchCategory(score: number): {
    label: string;
    color: string;
    description: string;
} {
    if (score >= 80) {
        return {
            label: 'Excellent Match',
            color: 'text-green-600',
            description: 'Your profile strongly matches this job',
        };
    } else if (score >= 60) {
        return {
            label: 'Good Match',
            color: 'text-blue-600',
            description: 'Your profile matches most requirements',
        };
    } else if (score >= 40) {
        return {
            label: 'Fair Match',
            color: 'text-yellow-600',
            description: 'Some of your qualifications match',
        };
    } else {
        return {
            label: 'Low Match',
            color: 'text-gray-600',
            description: 'Consider building more relevant experience',
        };
    }
}

/**
 * Get recommended jobs based on candidate profile
 */
export function getRecommendedJobs(
    candidateProfile: UserProfile,
    availableJobs: Job[],
    limit: number = 10
): Array<{ job: Job; matchScore: number }> {
    const jobsWithScores = availableJobs.map(job => ({
        job,
        matchScore: calculateMatchScore(candidateProfile, job),
    }));

    // Sort by match score descending
    jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);

    return jobsWithScores.slice(0, limit);
}
