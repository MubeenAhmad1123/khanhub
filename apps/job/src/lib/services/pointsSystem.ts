// ==========================================
// POINTS SYSTEM (FIXED IMPORTS)
// ==========================================
// Award and track points for user actions

import { db } from '@/lib/firebase/firebase-config'; // ✅ Fixed path
import { collection, addDoc, updateDoc, doc, increment, Timestamp } from 'firebase/firestore';
import { POINTS, COLLECTIONS } from '@/types/DATABASE_SCHEMA'; // ✅ Fixed path

/**
 * Award points to a user and log in points_history
 * @param userId - User ID
 * @param points - Number of points to award
 * @param reason - Reason for awarding points
 */
export async function awardPoints(userId: string, points: number, reason: string): Promise<void> {
    try {
        // Update user's total points (handling both field aliases for compatibility)
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        await updateDoc(userRef, {
            points: increment(points),
            totalPoints: increment(points),
            updatedAt: Timestamp.now(),
        });

        // Log in points history
        await addDoc(collection(db, COLLECTIONS.POINTS_HISTORY), {
            userId,
            points,
            reason,
            createdAt: Timestamp.now(),
        });

        console.log(`✅ Awarded ${points} points to ${userId} for: ${reason}`);
    } catch (error) {
        console.error('❌ Error awarding points:', error);
        throw error;
    }
}

/**
 * Award points for CV upload
 * @param userId - User ID
 */
export async function awardPointsForCV(userId: string): Promise<void> {
    await awardPoints(userId, POINTS.CV_UPLOADED, 'CV uploaded');
}

/**
 * Award points for video upload
 * @param userId - User ID
 */
export async function awardPointsForVideo(userId: string): Promise<void> {
    await awardPoints(userId, POINTS.VIDEO_UPLOADED, 'Intro video uploaded');
}

/**
 * Award points for profile completion
 * @param userId - User ID
 */
export async function awardPointsForProfileCompletion(userId: string): Promise<void> {
    await awardPoints(userId, POINTS.PROFILE_COMPLETED, 'Profile completed (100%)');
}

/**
 * Award points for job application
 * @param userId - User ID
 */
export async function awardPointsForJobApplication(userId: string): Promise<void> {
    await awardPoints(userId, POINTS.JOB_APPLIED, 'Applied to job');
}

/**
 * Award points for profile view by employer
 * @param userId - User ID
 */
export async function awardPointsForProfileView(userId: string): Promise<void> {
    await awardPoints(userId, POINTS.PROFILE_VIEWED, 'Profile viewed by employer');
}

/**
 * Calculate profile strength percentage (0-100)
 * @param jobSeeker - Job seeker profile data
 * @returns Profile strength percentage
 */
export function calculateProfileStrength(jobSeeker: any): number {
    let strength = 0;

    // Handle both direct profile object or User object with nested profile
    const p = jobSeeker.profile || jobSeeker;

    // Onboarding/Basic Info (20%)
    if (jobSeeker.onboardingCompleted) strength += 20;

    // CV uploaded (15%)
    if (p.cvUrl) strength += 15;

    // Video uploaded (15%)
    if (p.videoUrl) strength += 15;

    // Skills (15%) - minimum 5 skills
    if (p.skills && p.skills.length >= 5) strength += 15;
    else if (p.skills && p.skills.length > 0) strength += 10;

    // Experience (15%) - at least 1 entry
    if (p.experience && p.experience.length >= 1) strength += 15;

    // Education (10%) - at least 1 entry
    if (p.education && p.education.length >= 1) strength += 10;

    // Bio/Summary (10%) - at least 50 characters
    if (p.bio && p.bio.length >= 50) strength += 10;
    else if (p.bio && p.bio.length > 0) strength += 5;

    return Math.min(strength, 100);
}

/**
 * Check if profile is complete (100%)
 * @param profileStrength - Current profile strength
 * @returns True if profile is 100% complete
 */
export function isProfileComplete(profileStrength: number): boolean {
    return profileStrength === 100;
}

/**
 * Get profile strength color for UI
 * @param strength - Profile strength (0-100)
 * @returns Tailwind color class
 */
export function getProfileStrengthColor(strength: number): string {
    if (strength === 100) return 'bg-green-500';
    if (strength >= 70) return 'bg-blue-500';
    if (strength >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
}

/**
 * Get profile strength label
 * @param strength - Profile strength (0-100)
 * @returns Label string
 */
export function getProfileStrengthLabel(strength: number): string {
    if (strength === 100) return 'Complete';
    if (strength >= 70) return 'Strong';
    if (strength >= 40) return 'Good';
    return 'Weak';
}

/**
 * Get next action to improve profile
 * @param jobSeeker - Job seeker profile data
 * @returns Suggestion string
 */
export function getProfileCompletionSuggestion(jobSeeker: any): string {
    const s = jobSeeker.profile || jobSeeker;
    if (!jobSeeker.onboardingCompleted) return 'Complete your basic information';
    if (!s.cvUrl) return 'Upload your CV to increase profile strength';
    if (!s.videoUrl) return 'Add an intro video to stand out';
    if (!s.skills || s.skills.length < 5) return 'Add at least 5 skills';
    if (!s.experience || s.experience.length === 0) return 'Add your work experience';
    if (!s.education || s.education.length === 0) return 'Add your education';
    if (!s.bio || s.bio.length < 50) return 'Write a professional summary (50+ characters)';
    if (!s.certifications || s.certifications.length === 0) return 'Add certifications to reach 100%';
    return 'Your profile is complete!';
}

/**
 * Get list of improvement steps
 * @param jobSeeker - Job seeker profile data
 * @returns Array of improvement strings
 */
export function getProfileImprovementSteps(jobSeeker: any): string[] {
    const steps: string[] = [];
    if (!jobSeeker.cvUrl) steps.push('Upload your CV');
    if (!jobSeeker.videoUrl) steps.push('Add an intro video');
    if (!jobSeeker.skills || jobSeeker.skills.length < 5) steps.push('Add more skills (5+ recommended)');
    if (!jobSeeker.experience || jobSeeker.experience.length === 0) steps.push('Add work experience');
    if (!jobSeeker.education || jobSeeker.education.length === 0) steps.push('Add education');
    if (!jobSeeker.bio || jobSeeker.bio.length < 50) steps.push('Expand your bio (50+ chars)');
    if (!jobSeeker.certifications || jobSeeker.certifications.length === 0) steps.push('Add certifications');
    return steps;
}