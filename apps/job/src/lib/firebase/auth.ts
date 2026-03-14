// Firebase Authentication Helpers
// Authentication utility functions for user management

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    updateEmail,
    updatePassword,
    User as FirebaseUser,
    UserCredential,
} from 'firebase/auth';
import { auth, db } from './firebase-config';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { User, UserRole, CreateUserData } from '@/types/user';

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<User | null> {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));

        if (userDoc.exists()) {
            return {
                uid,
                ...userDoc.data(),
            } as User;
        }

        return null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}

/**
 * Create new user profile in Firestore
 */
export async function createUserProfile(userData: Partial<User>): Promise<void> {
    try {
        const { uid, ...data } = userData;

        if (!uid) throw new Error('User ID is required');

        await setDoc(doc(db, 'users', uid), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }, { merge: true });

        // Add admin notification
        const { addDoc, collection } = await import('firebase/firestore');
        await addDoc(collection(db, 'adminNotifications'), {
            type: 'new_user',
            title: 'New User Registered',
            message: `${data.displayName || data.name || 'A new user'} just joined as ${data.role || 'user'}.`,
            read: false,
            targetId: uid,
            targetType: 'user',
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
}

/**
 * Update user profile in Firestore
 */
export async function updateUserProfile(uid: string, updates: Partial<User>): Promise<void> {
    try {
        const { doc, setDoc, serverTimestamp, getDoc } = await import('firebase/firestore');
        // Dynamic import to avoid circular dependency if any, though pointSystem doesn't import auth.ts usually
        const { calculateProfileStrength } = await import('@/lib/services/pointsSystem');

        const userRef = doc(db, 'users', uid);

        // 1. Get current data to ensure complete profile for calculation
        const currentDoc = await getDoc(userRef);
        const currentData = currentDoc.data() as User | undefined;

        // 2. Prepare updates with recalculated strength if applicable
        let finalUpdates = { ...updates };

        // Only recalculate if we have profile data to work with or are updating profile
        if (currentData?.role === 'job_seeker' || updates.role === 'job_seeker') {
            const mergedUser = {
                ...currentData,
                ...updates,
                profile: {
                    ...(currentData?.profile || {}),
                    ...(updates.profile || {})
                }
            };

            // Calculate new strength using full user object
            const newStrength = calculateProfileStrength(mergedUser as any);

            // Apply new strength to updates (ensuring we preserve other profile fields)
            finalUpdates = {
                ...finalUpdates,
                profile: {
                    ...(currentData?.profile || {}),
                    ...(updates.profile || {}),
                    profileStrength: newStrength
                }
            } as any;
        }

        await setDoc(userRef, {
            ...finalUpdates,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
}

/**
 * Check if user exists
 */
export async function userExists(uid: string): Promise<boolean> {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        return userDoc.exists();
    } catch (error) {
        console.error('Error checking user existence:', error);
        return false;
    }
}

/**
 * Delete user account — removes all Firestore data then deletes the Auth user.
 * Requires the user to have recently authenticated (Firebase requirement).
 */
/**
 * Wipes all Firestore data associated with a user UID.
 * This does NOT delete the Auth account.
 */
export async function wipeUserData(uid: string): Promise<void> {
    const {
        collection, query, where, getDocs, deleteDoc, doc: firestoreDoc,
    } = await import('firebase/firestore');

    // Helper: delete all docs in a collection matching a field/value
    const deleteWhere = async (col: string, field: string, value: string) => {
        const q = query(collection(db, col), where(field, '==', value));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    };

    // 1. Delete user's videos
    await deleteWhere('videos', 'userId', uid);

    // 2. Delete user's payments
    await deleteWhere('payments', 'userId', uid);

    // 3. Delete user's notifications
    await deleteWhere('notifications', 'userId', uid);

    // 4. Delete user's activity log entries
    await deleteWhere('activity_log', 'userId', uid);

    // 5. Delete connections (can be stored under seekerId OR employerId)
    const [connSnap1, connSnap2] = await Promise.all([
        getDocs(query(collection(db, 'connections'), where('seekerId', '==', uid))),
        getDocs(query(collection(db, 'connections'), where('employerId', '==', uid))),
    ]);
    await Promise.all([
        ...connSnap1.docs.map(d => deleteDoc(d.ref)),
        ...connSnap2.docs.map(d => deleteDoc(d.ref)),
    ]);

    // 6. Delete job postings (if employer)
    await deleteWhere('jobPostings', 'employerId', uid);

    // 7. Delete placements
    const [placeSnap1, placeSnap2] = await Promise.all([
        getDocs(query(collection(db, 'placements'), where('candidateId', '==', uid))),
        getDocs(query(collection(db, 'placements'), where('employerId', '==', uid))),
    ]);
    await Promise.all([
        ...placeSnap1.docs.map(d => deleteDoc(d.ref)),
        ...placeSnap2.docs.map(d => deleteDoc(d.ref)),
    ]);

    // 8. Delete points history
    await deleteWhere('points_history', 'userId', uid);

    // 9. Delete the user's Firestore document
    await deleteDoc(firestoreDoc(db, 'users', uid));

    // 11. Wipe all files from Firebase Storage (New)
    try {
        const { deleteAllUserFiles, deletePaymentStorage } = await import('./storage');

        // Delete personal and company assets
        await deleteAllUserFiles(uid);

        // Delete payment screenshots (using paymentsSnap collected previously or re-fetch)
        // To be safe, we re-fetch if payments were already deleted above
        const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('userId', '==', uid)));
        await Promise.all(paymentsSnap.docs.map(d => deletePaymentStorage(d.id)));

        console.log(`✅ Fully wiped all Storage and Firestore data for ${uid}`);
    } catch (storageError) {
        console.warn('Non-critical error during Storage cleanup:', storageError);
    }
}

/**
 * Delete user account — removes all Firestore data then deletes the Auth user.
 * Requires the user to have recently authenticated (Firebase requirement).
 */
export async function deleteUserAccount(uid: string): Promise<void> {
    try {
        const { deleteUser } = await import('firebase/auth');

        // 1-9. Wipe Firestore Data
        await wipeUserData(uid);

        // 10. Delete Firebase Auth account
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === uid) {
            await deleteUser(currentUser);
        }
    } catch (error: any) {
        console.error('deleteUserAccount error:', error);
        if (error.code === 'auth/requires-recent-login') {
            throw new Error(
                'For your security, please log out and sign in again before deleting your account.'
            );
        }
        throw error;
    }
}
