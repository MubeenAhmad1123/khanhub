import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { UserProfile } from '@/types/user';

/**
 * Create a new user profile in Firestore
 */
export async function createUserProfile(
    uid: string,
    role: 'job_seeker' | 'employer' | 'admin',
    email: string,
    displayName: string,
    additionalData?: Partial<UserProfile>
): Promise<void> {
    const userRef = doc(db, 'users', uid);

    const userData: UserProfile = {
        uid,
        role,
        email,
        displayName,
        photoURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),

        // Job Seeker specific fields
        registrationPaid: false,
        registrationPaymentProof: null,
        registrationApproved: false,
        isPremium: false,
        premiumExpiresAt: null,
        premiumJobsViewed: 0,
        freeApplicationsUsed: 0,
        points: 0,
        profileStrength: 0,

        // Profile data
        profile: {
            phone: null,
            location: null,
            currentJobTitle: null,
            preferredJobTitle: null,
            summary: null,
            cvUrl: null,
            introVideoUrl: null,
            skills: [],
            experience: [],
            education: [],
            certifications: [],
        },

        // Employer specific fields
        companyName: null,
        companyLogo: null,
        companyDescription: null,
        companyWebsite: null,
        companySize: null,
        industry: null,

        ...additionalData,
    };

    await setDoc(userRef, userData);
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        return {
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            premiumExpiresAt: data.premiumExpiresAt?.toDate() || null,
        } as UserProfile;
    }

    return null;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    uid: string,
    data: Partial<UserProfile>
): Promise<void> {
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Check if user has premium access
 */
export async function checkPremiumStatus(uid: string): Promise<boolean> {
    const profile = await getUserProfile(uid);

    if (!profile || !profile.isPremium) {
        return false;
    }

    if (profile.premiumExpiresAt && profile.premiumExpiresAt < new Date()) {
        // Premium expired, update user status
        await updateUserProfile(uid, { isPremium: false });
        return false;
    }

    return true;
}
