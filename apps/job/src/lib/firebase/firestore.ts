// Firestore Database Helpers
// CRUD operations and queries for Firestore collections

import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    QueryConstraint,
    DocumentData,
    QueryDocumentSnapshot,
    serverTimestamp,
    Timestamp,
    increment,
    arrayUnion,
    arrayRemove,
    WriteBatch,
    writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { Application } from '@/types/application';
import { Job } from '@/types/job';
import { Placement } from '@/types/admin';
import { COLLECTIONS } from '@/types/DATABASE_SCHEMA';

// ==================== GENERIC CRUD OPERATIONS ====================

/**
 * Create a new document
 */
export const createDocument = async <T extends DocumentData>(
    collectionName: string,
    id: string,
    data: T
): Promise<void> => {
    try {
        const docRef = doc(db, collectionName, id);
        await setDoc(docRef, {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error(`Error creating document in ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Get a single document by ID
 */
export const getDocument = async <T>(
    collectionName: string,
    id: string
): Promise<T | null> => {
    try {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data(),
            } as T;
        }

        return null;
    } catch (error) {
        console.error(`Error getting document from ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Update a document
 */
export const updateDocument = async <T extends Partial<DocumentData>>(
    collectionName: string,
    id: string,
    data: T
): Promise<void> => {
    try {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error(`Error updating document in ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Delete a document
 */
export const deleteDocument = async (
    collectionName: string,
    id: string
): Promise<void> => {
    try {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error(`Error deleting document from ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Check if document exists
 */
export const documentExists = async (
    collectionName: string,
    id: string
): Promise<boolean> => {
    try {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
    } catch (error) {
        console.error(`Error checking document existence in ${collectionName}:`, error);
        return false;
    }
};

// ==================== QUERY OPERATIONS ====================

/**
 * Get all documents from a collection
 */
export const getAllDocuments = async <T>(
    collectionName: string
): Promise<T[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as T[];
    } catch (error) {
        console.error(`Error getting all documents from ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Query documents with conditions
 */
export const queryDocuments = async <T>(
    collectionName: string,
    constraints: QueryConstraint[]
): Promise<T[]> => {
    try {
        const q = query(collection(db, collectionName), ...constraints);
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as T[];
    } catch (error) {
        console.error(`Error querying documents from ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Query documents with pagination
 */
export const queryDocumentsPaginated = async <T>(
    collectionName: string,
    constraints: QueryConstraint[],
    pageSize: number,
    lastDoc?: QueryDocumentSnapshot
): Promise<{ documents: T[]; lastDoc: QueryDocumentSnapshot | null }> => {
    try {
        const baseConstraints = [...constraints, limit(pageSize)];

        if (lastDoc) {
            baseConstraints.push(startAfter(lastDoc));
        }

        const q = query(collection(db, collectionName), ...baseConstraints);
        const querySnapshot = await getDocs(q);

        const documents = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as T[];

        const newLastDoc =
            querySnapshot.docs.length > 0
                ? querySnapshot.docs[querySnapshot.docs.length - 1]
                : null;

        return { documents, lastDoc: newLastDoc };
    } catch (error) {
        console.error(`Error querying paginated documents from ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Count documents matching query
 */
export const countDocuments = async (
    collectionName: string,
    constraints: QueryConstraint[] = []
): Promise<number> => {
    try {
        const q = query(collection(db, collectionName), ...constraints);
        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (error) {
        console.error(`Error counting documents in ${collectionName}:`, error);
        throw error;
    }
};

// ==================== BATCH OPERATIONS ====================

/**
 * Create a batch for multiple operations
 */
export const createBatch = (): WriteBatch => {
    return writeBatch(db);
};

/**
 * Batch create multiple documents
 */
export const batchCreateDocuments = async <T extends DocumentData>(
    collectionName: string,
    documents: { id: string; data: T }[]
): Promise<void> => {
    try {
        const batch = writeBatch(db);

        documents.forEach(({ id, data }) => {
            const docRef = doc(db, collectionName, id);
            batch.set(docRef, {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        });

        await batch.commit();
    } catch (error) {
        console.error(`Error batch creating documents in ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Batch update multiple documents
 */
export const batchUpdateDocuments = async <T extends Partial<DocumentData>>(
    collectionName: string,
    updates: { id: string; data: T }[]
): Promise<void> => {
    try {
        const batch = writeBatch(db);

        updates.forEach(({ id, data }) => {
            const docRef = doc(db, collectionName, id);
            batch.update(docRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        });

        await batch.commit();
    } catch (error) {
        console.error(`Error batch updating documents in ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Batch delete multiple documents
 */
export const batchDeleteDocuments = async (
    collectionName: string,
    ids: string[]
): Promise<void> => {
    try {
        const batch = writeBatch(db);

        ids.forEach((id) => {
            const docRef = doc(db, collectionName, id);
            batch.delete(docRef);
        });

        await batch.commit();
    } catch (error) {
        console.error(`Error batch deleting documents from ${collectionName}:`, error);
        throw error;
    }
};

// ==================== FIELD OPERATIONS ====================

/**
 * Increment a numeric field
 */
export const incrementField = async (
    collectionName: string,
    id: string,
    field: string,
    value: number = 1
): Promise<void> => {
    try {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, {
            [field]: increment(value),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error(`Error incrementing field in ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Add item to array field
 */
export const addToArrayField = async <T>(
    collectionName: string,
    id: string,
    field: string,
    value: T
): Promise<void> => {
    try {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, {
            [field]: arrayUnion(value),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error(`Error adding to array field in ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Remove item from array field
 */
export const removeFromArrayField = async <T>(
    collectionName: string,
    id: string,
    field: string,
    value: T
): Promise<void> => {
    try {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, {
            [field]: arrayRemove(value),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error(`Error removing from array field in ${collectionName}:`, error);
        throw error;
    }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Robustly convert Firestore Timestamp, JS Date, or plain object to Date
 */
export const toDate = (date: any): Date => {
    if (!date) return new Date();
    if (date instanceof Date) return date;
    if (typeof date.toDate === 'function') return date.toDate();
    if (date.seconds) return new Date(date.seconds * 1000);
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
};

/**
 * @deprecated Use toDate instead
 */
export const timestampToDate = (timestamp: any): Date => toDate(timestamp);

/**
 * Build query constraints from filters
 */
export const buildQueryConstraints = (filters: {
    field: string;
    operator: any;
    value: any;
}[]): QueryConstraint[] => {
    return filters.map((filter) =>
        where(filter.field, filter.operator, filter.value)
    );
};

/**
 * Build order by constraints
 */
export const buildOrderByConstraints = (
    orderByFields: { field: string; direction: 'asc' | 'desc' }[]
): QueryConstraint[] => {
    return orderByFields.map((orderByField) =>
        orderBy(orderByField.field, orderByField.direction)
    );
};



// ==================== SPECIFIC COLLECTION HELPERS ====================

/**
 * Create a new job
 */
export const createJob = async (jobData: any) => {
    const jobsRef = collection(db, COLLECTIONS.JOBS);
    const newJobRef = doc(jobsRef);
    await setDoc(newJobRef, {
        id: newJobRef.id,
        ...jobData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return newJobRef.id;
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string) => {
    return getDocument(COLLECTIONS.USERS, userId);
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string) => {
    const users = await queryDocuments(COLLECTIONS.USERS, [
        where('email', '==', email),
    ]);
    return users[0] || null;
};

/**
 * Get job by ID
 */
export const getJobById = async (jobId: string) => {
    return getDocument(COLLECTIONS.JOBS, jobId);
};

/**
 * Get active jobs
 */
export const getActiveJobs = async (limitCount: number = 20) => {
    return queryDocuments(COLLECTIONS.JOBS, [
        where('status', '==', 'active'),
        orderBy('postedAt', 'desc'),
        limit(limitCount),
    ]);
};

/**
 * Alias for getActiveJobs to maintain compatibility
 */
export const getApprovedJobs = async (limitCount: number = 20) => getActiveJobs(limitCount);

/**
 * Get jobs by status
 */
export const getJobsByStatus = async (status: string) => {
    return queryDocuments<Job>(COLLECTIONS.JOBS, [
        where('status', '==', status),
        orderBy('postedAt', 'desc'),
    ]);
};

/**
 * Update a job
 */
export const updateJob = async (id: string, data: Partial<Job>) => {
    return updateDocument(COLLECTIONS.JOBS, id, data);
};

/**
 * Get pending jobs (for admin)
 */
export const getPendingJobs = async () => {
    return getJobsByStatus('pending');
};



/**
 * Get applications for a job
 */
export const getApplicationsByJob = async (jobId: string) => {
    return queryDocuments(COLLECTIONS.APPLICATIONS, [
        where('jobId', '==', jobId),
        orderBy('appliedAt', 'desc'),
    ]);
};

/**
 * Get applications by employer
 */
export const getApplicationsByEmployer = async (employerId: string) => {
    return queryDocuments(COLLECTIONS.APPLICATIONS, [
        where('employerId', '==', employerId),
        orderBy('appliedAt', 'desc'),
    ]);
};

/**
 * Get applications by candidate
 */
export const getApplicationsByCandidate = async (candidateId: string) => {
    return queryDocuments(COLLECTIONS.APPLICATIONS, [
        where('candidateId', '==', candidateId),
        orderBy('appliedAt', 'desc'),
    ]);
};

/**
 * Create a new application
 */
export const createApplication = async (applicationData: any): Promise<string> => {
    const applicationRef = doc(collection(db, COLLECTIONS.APPLICATIONS));
    await setDoc(applicationRef, {
        id: applicationRef.id,
        ...applicationData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return applicationRef.id;
};

/**
 * Update an application
 */
export const updateApplication = async (applicationId: string, data: any): Promise<void> => {
    const applicationRef = doc(db, COLLECTIONS.APPLICATIONS, applicationId);
    await updateDoc(applicationRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
};

/**
 * Get pending payments (for admin)
 */
export const getPendingPayments = async () => {
    return queryDocuments(COLLECTIONS.PAYMENTS, [
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'desc'),
    ]);
};

/**
 * Get user's saved jobs
 */
export const getSavedJobs = async (userId: string) => {
    return queryDocuments(COLLECTIONS.SAVED_JOBS, [
        where('userId', '==', userId),
        orderBy('savedAt', 'desc'),
    ]);
};

/**
 * Check if job is saved by user
 */
export const isJobSaved = async (
    userId: string,
    jobId: string
): Promise<boolean> => {
    const savedJobs = await queryDocuments(COLLECTIONS.SAVED_JOBS, [
        where('userId', '==', userId),
        where('jobId', '==', jobId),
    ]);
    return savedJobs.length > 0;
};

// ==================== JOB HELPERS ====================

/**
 * Get jobs by category
 */
export const getJobsByCategory = async (category: string, limitCount: number = 20) => {
    return queryDocuments(COLLECTIONS.JOBS, [
        where('category', '==', category),
        where('status', '==', 'active'),
        orderBy('postedAt', 'desc'),
        limit(limitCount),
    ]);
};

// ==================== PAYMENT HELPERS ====================

/**
 * Create a new payment record
 */
export const createPayment = async (paymentData: any): Promise<string> => {
    const paymentRef = doc(collection(db, COLLECTIONS.PAYMENTS));
    await setDoc(paymentRef, {
        id: paymentRef.id,
        ...paymentData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return paymentRef.id;
};

/**
 * Update a payment record
 */
export const updatePayment = async (paymentId: string, data: any): Promise<void> => {
    const paymentRef = doc(db, COLLECTIONS.PAYMENTS, paymentId);
    await updateDoc(paymentRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
};

/**
 * Get all placements
 */
export const getAllPlacements = async () => {
    return queryDocuments(COLLECTIONS.PLACEMENTS, [
        orderBy('createdAt', 'desc'),
    ]);
};

/**
 * Create a new placement
 */
export const createPlacement = async (placementData: any): Promise<string> => {
    const placementRef = doc(collection(db, COLLECTIONS.PLACEMENTS));
    await setDoc(placementRef, {
        id: placementRef.id,
        ...placementData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return placementRef.id;
};

/**
 * Update a placement record
 */
export const updatePlacement = async (
    id: string,
    data: Partial<Placement>
): Promise<void> => {
    return updateDocument(COLLECTIONS.PLACEMENTS, id, data as any);
};

// ==================== EXPORT ALL ====================

export {
    db,
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp,
    increment,
    arrayUnion,
    arrayRemove,
    writeBatch,
    Timestamp,
};

export type {
    QueryDocumentSnapshot,
    DocumentData,
    QueryConstraint,
};