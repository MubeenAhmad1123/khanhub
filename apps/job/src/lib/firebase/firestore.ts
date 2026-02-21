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
    Unsubscribe,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { COLLECTIONS } from '@/types/DATABASE_SCHEMA';
import { Placement } from '@/types/admin';


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
// ==================== REAL-TIME LISTENER OPERATIONS ====================

/**
 * Subscribe to real-time updates for a collection with query constraints
 * @param collectionName - Name of the collection
 * @param constraints - Query constraints (where, orderBy, limit, etc.)
 * @param onUpdate - Callback when data updates
 * @param onError - Callback when error occurs
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToCollection = <T>(
    collectionName: string,
    constraints: QueryConstraint[],
    onUpdate: (documents: T[]) => void,
    onError?: (error: Error) => void
): Unsubscribe => {
    try {
        const q = query(collection(db, collectionName), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const documents = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as T[];

                onUpdate(documents);
            },
            (error) => {
                console.error(`Real-time listener error for ${collectionName}:`, error);
                if (onError) onError(error as Error);
            }
        );

        return unsubscribe;
    } catch (error) {
        console.error(`Error setting up real-time listener for ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Subscribe to a single document's real-time updates
 * @param collectionName - Name of the collection
 * @param documentId - Document ID
 * @param onUpdate - Callback when document updates
 * @param onError - Callback when error occurs
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToDocument = <T>(
    collectionName: string,
    documentId: string,
    onUpdate: (document: T | null) => void,
    onError?: (error: Error) => void
): Unsubscribe => {
    try {
        const docRef = doc(db, collectionName, documentId);

        const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const document = {
                        id: docSnap.id,
                        ...docSnap.data(),
                    } as T;
                    onUpdate(document);
                } else {
                    onUpdate(null);
                }
            },
            (error) => {
                console.error(`Real-time listener error for document ${documentId}:`, error);
                if (onError) onError(error as Error);
            }
        );

        return unsubscribe;
    } catch (error) {
        console.error(`Error setting up real-time listener for document ${documentId}:`, error);
        throw error;
    }
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