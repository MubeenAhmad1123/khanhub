import { UserProfile } from '@/types/user';
import { updateUserProfile } from '../firebase/auth';
import { addPointsHistory } from '../firebase/firestore';

/**
 * Points awarded for different actions
 */
export const POINTS_CONFIG = {
    CV_UPLOADED: 15,
    INTRO_VIDEO: 20,
    PROFILE_COMPLETED: 25,
    JOB_APPLICATION: 5,
    PROFILE_VIEWED_BY_EMPLOYER: 10,
    SHORTLISTED: 15,
    INTERVIEW_SCHEDULED: 20,
    JOB_HIRED: 50,
};

/**
 * Award points to user
 */
export async function awardPoints(
    userId: string,
    action: keyof typeof POINTS_CONFIG,
    description?: string
): Promise<void> {
    const points = POINTS_CONFIG[action];

    // Add to points history
    await addPointsHistory(
        userId,
        action,
        points,
        description || action.replace(/_/g, ' ').toLowerCase()
    );
}

/**
 * Calculate profile strength (0-100%)
 * 
 * Breakdown:
 * - CV uploaded: 20%
 * - Intro video: 20%
 * - 5+ skills: 15%
 * - 1+ experience: 15%
 * - 1+ education: 10%
 * - Summary: 10%
 * - 1+ certification: 10%
 */
export function calculateProfileStrength(profile: UserProfile): number {
    let strength = 0;

    // CV uploaded (20%)
    if (profile.profile.cvUrl) {
        strength += 20;
    }

    // Intro video (20%)
    if (profile.profile.introVideoUrl) {
        strength += 20;
    }

    // Skills (15%)
    if (profile.profile.skills.length >= 5) {
        strength += 15;
    } else if (profile.profile.skills.length > 0) {
        strength += (profile.profile.skills.length / 5) * 15;
    }

    // Experience (15%)
    if (profile.profile.experience.length >= 1) {
        strength += 15;
    }

    // Education (10%)
    if (profile.profile.education.length >= 1) {
        strength += 10;
    }

    // Summary (10%)
    if (profile.profile.summary && profile.profile.summary.length > 50) {
        strength += 10;
    } else if (profile.profile.summary) {
        strength += (profile.profile.summary.length / 50) * 10;
    }

    // Certifications (10%)
    if (profile.profile.certifications.length >= 1) {
        strength += 10;
    }

    return Math.round(strength);
}

/**
 * Update profile strength in user document
 */
export async function updateProfileStrength(userId: string, profile: UserProfile): Promise<void> {
    const strength = calculateProfileStrength(profile);

    await updateUserProfile(userId, {
        profileStrength: strength,
    });
}

/**
 * Get profile strength category
 */
export function getProfileStrengthCategory(strength: number): {
    label: string;
    color: string;
    description: string;
} {
    if (strength >= 80) {
        return {
            label: 'Excellent',
            color: 'text-green-600',
            description: 'Your profile is highly attractive to employers',
        };
    } else if (strength >= 60) {
        return {
            label: 'Good',
            color: 'text-blue-600',
            description: 'Your profile looks good, consider adding more details',
        };
    } else if (strength >= 40) {
        return {
            label: 'Fair',
            color: 'text-yellow-600',
            description: 'Complete more sections to improve your profile',
        };
    } else {
        return {
            label: 'Weak',
            color: 'text-red-600',
            description: 'Your profile needs more information',
        };
    }
}

/**
 * Get next steps to improve profile
 */
export function getProfileImprovementSteps(profile: UserProfile): string[] {
    const steps: string[] = [];

    if (!profile.profile.cvUrl) {
        steps.push('Upload your CV');
    }

    if (!profile.profile.introVideoUrl) {
        steps.push('Record a short intro video');
    }

    if (profile.profile.skills.length < 5) {
        steps.push('Add at least 5 skills');
    }

    if (profile.profile.experience.length === 0) {
        steps.push('Add your work experience');
    }

    if (profile.profile.education.length === 0) {
        steps.push('Add your education');
    }

    if (!profile.profile.summary || profile.profile.summary.length < 50) {
        steps.push('Write a professional summary (at least 50 words)');
    }

    if (profile.profile.certifications.length === 0) {
        steps.push('Add any certifications you have');
    }

    return steps;
}
