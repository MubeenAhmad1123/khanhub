import { User, JobSeekerProfile } from '@/types/user';
import { POINTS } from '@/types/DATABASE_SCHEMA';

/**
 * Award points to a user for an action
 */
export async function awardPoints(userId: string, actionPoints: number, reason: string): Promise<void> {
    console.log(`Awarding ${actionPoints} points to ${userId} for ${reason}`);
}

/**
 * Award points for video upload
 */
export async function awardPointsForVideo(userId: string): Promise<void> {
    return awardPoints(userId, 20, 'Video Upload');
}

/**
 * Calculate the profile strength percentage for a job seeker
 */
export function calculateProfileStrength(user: User | { profile: JobSeekerProfile }): number {
    if (!user) return 0;

    const profile = 'profile' in user ? user.profile : (user as any).profile;
    if (!profile) return 0;

    let strength = 0;

    // 1. Basic Info
    const hasBasicInfo = 'displayName' in user
        ? (user as User).displayName && (user as User).email && (user as User).industry
        : profile.fullName && profile.phone && profile.location;

    if (hasBasicInfo) {
        strength += POINTS.BASIC_INFO_COMPLETED;
    }

    // 2. CV Uploaded
    if (profile.cvUrl || profile.cvUrl) {
        strength += POINTS.CV_UPLOADED;
    }

    // 3. Video Uploaded
    if (profile.videoUrl || profile.videoResume) {
        strength += POINTS.VIDEO_UPLOADED;
    }

    // 4. Bio / Experience / Education
    if (profile.bio) strength += 10;
    if (profile.experience && profile.experience.length > 0) strength += 10;
    if (profile.education && profile.education.length > 0) strength += 10;

    if (strength >= 90) strength = 100;
    return Math.min(strength, 100);
}

/**
 * Get profile improvement steps
 */
export function getProfileImprovementSteps(user: User | { profile: JobSeekerProfile }): string[] {
    const profile = 'profile' in user ? user.profile : (user as any).profile;
    const steps: string[] = [];
    if (!profile) return ['Complete basic info'];

    if (!profile.cvUrl) steps.push('Upload your CV');
    if (!profile.videoUrl && !profile.videoResume) steps.push('Upload an intro video');
    if (!profile.bio) steps.push('Add a professional bio');

    return steps;
}
