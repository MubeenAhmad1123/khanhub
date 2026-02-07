import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Job } from '@/types/job';
import { JobApplication } from '@/types/application';
import { Payment } from '@/types/payment';
import { Placement } from '@/types/admin';

// ==================== JOBS ====================

export async function createJob(jobData: Omit<Job, 'id'>): Promise<string> {
    const jobsRef = collection(db, 'jobs');
    const docRef = await addDoc(jobsRef, {
        ...jobData,
        postedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function getJobById(jobId: string): Promise<Job | null> {
    const jobRef = doc(db, 'jobs', jobId);
    const jobSnap = await getDoc(jobRef);

    if (jobSnap.exists()) {
        const data = jobSnap.data();
        return {
            id: jobSnap.id,
            ...data,
            deadline: data.deadline?.toDate(),
            postedAt: data.postedAt?.toDate(),
            expiresAt: data.expiresAt?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
        } as Job;
    }

    return null;
}

export async function getJobsByEmployer(employerId: string): Promise<Job[]> {
    const jobsRef = collection(db, 'jobs');
    const q = query(jobsRef, where('employerId', '==', employerId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        deadline: doc.data().deadline?.toDate(),
        postedAt: doc.data().postedAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
    } as Job));
}

export async function getApprovedJobs(limitCount?: number): Promise<Job[]> {
    const jobsRef = collection(db, 'jobs');
    let q = query(jobsRef, where('status', '==', 'approved'), orderBy('postedAt', 'desc'));

    if (limitCount) {
        q = query(q, limit(limitCount));
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        deadline: doc.data().deadline?.toDate(),
        postedAt: doc.data().postedAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
    } as Job));
}

export async function updateJob(jobId: string, data: Partial<Job>): Promise<void> {
    const jobRef = doc(db, 'jobs', jobId);
    await updateDoc(jobRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteJob(jobId: string): Promise<void> {
    const jobRef = doc(db, 'jobs', jobId);
    await deleteDoc(jobRef);
}

export async function getJobsByStatus(status: string): Promise<Job[]> {
    const jobsRef = collection(db, 'jobs');
    const q = query(jobsRef, where('status', '==', status), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        deadline: doc.data().deadline?.toDate(),
        postedAt: doc.data().postedAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
    } as Job));
}


// ==================== APPLICATIONS ====================

export async function createApplication(appData: Omit<JobApplication, 'id'>): Promise<string> {
    const appsRef = collection(db, 'applications');
    const docRef = await addDoc(appsRef, {
        ...appData,
        appliedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function getApplicationById(appId: string): Promise<JobApplication | null> {
    const appRef = doc(db, 'applications', appId);
    const appSnap = await getDoc(appRef);

    if (appSnap.exists()) {
        const data = appSnap.data();
        return {
            id: appSnap.id,
            ...data,
            appliedAt: data.appliedAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
        } as JobApplication;
    }

    return null;
}

export async function getApplicationsByJobSeeker(jobSeekerId: string): Promise<JobApplication[]> {
    const appsRef = collection(db, 'applications');
    const q = query(appsRef, where('candidateId', '==', jobSeekerId), orderBy('appliedAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        appliedAt: doc.data().appliedAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
    } as JobApplication));
}

export async function getApplicationsByEmployer(employerId: string): Promise<JobApplication[]> {
    const appsRef = collection(db, 'applications');
    const q = query(appsRef, where('employerId', '==', employerId), orderBy('appliedAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        appliedAt: doc.data().appliedAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
    } as JobApplication));
}

export async function getApplicationsByJob(jobId: string): Promise<JobApplication[]> {
    const appsRef = collection(db, 'applications');
    const q = query(appsRef, where('jobId', '==', jobId), orderBy('appliedAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        appliedAt: doc.data().appliedAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
    } as JobApplication));
}

export async function updateApplication(appId: string, data: Partial<JobApplication>): Promise<void> {
    const appRef = doc(db, 'applications', appId);
    await updateDoc(appRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

// Alias for consistency
export const getApplicationsByCandidate = getApplicationsByJobSeeker;


// ==================== PAYMENTS ====================

export async function createPayment(paymentData: Omit<Payment, 'id'>): Promise<string> {
    const paymentsRef = collection(db, 'payments');
    const docRef = await addDoc(paymentsRef, {
        ...paymentData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function getPaymentById(paymentId: string): Promise<Payment | null> {
    const paymentRef = doc(db, 'payments', paymentId);
    const paymentSnap = await getDoc(paymentRef);

    if (paymentSnap.exists()) {
        const data = paymentSnap.data();
        return {
            id: paymentSnap.id,
            ...data,
            reviewedAt: data.reviewedAt?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
        } as Payment;
    }

    return null;
}

export async function getPendingPayments(): Promise<Payment[]> {
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        reviewedAt: doc.data().reviewedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
    } as Payment));
}

export async function updatePayment(paymentId: string, data: Partial<Payment>): Promise<void> {
    const paymentRef = doc(db, 'payments', paymentId);
    await updateDoc(paymentRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

// ==================== PLACEMENTS ====================

export async function createPlacement(placementData: Omit<Placement, 'id'>): Promise<string> {
    const placementsRef = collection(db, 'placements');
    const docRef = await addDoc(placementsRef, {
        ...placementData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function getAllPlacements(): Promise<Placement[]> {
    const placementsRef = collection(db, 'placements');
    const q = query(placementsRef, orderBy('hiredAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        hiredAt: doc.data().hiredAt?.toDate(),
        commissionDueDate: doc.data().commissionDueDate?.toDate(),
        commissionPaidAt: doc.data().commissionPaidAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
    } as Placement));
}

export async function updatePlacement(placementId: string, data: Partial<Placement>): Promise<void> {
    const placementRef = doc(db, 'placements', placementId);
    await updateDoc(placementRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

// ==================== SAVED JOBS ====================

export async function saveJob(userId: string, jobId: string): Promise<void> {
    const savedJobRef = doc(db, 'saved_jobs', userId, 'jobs', jobId);
    await setDoc(savedJobRef, {
        jobId,
        savedAt: serverTimestamp(),
    });
}

export async function unsaveJob(userId: string, jobId: string): Promise<void> {
    const savedJobRef = doc(db, 'saved_jobs', userId, 'jobs', jobId);
    await deleteDoc(savedJobRef);
}

export async function getSavedJobs(userId: string): Promise<string[]> {
    const savedJobsRef = collection(db, 'saved_jobs', userId, 'jobs');
    const querySnapshot = await getDocs(savedJobsRef);

    return querySnapshot.docs.map(doc => doc.data().jobId as string);
}

// ==================== POINTS HISTORY ====================

export async function addPointsHistory(
    userId: string,
    action: string,
    points: number,
    description: string
): Promise<void> {
    const pointsRef = collection(db, 'points_history');
    await addDoc(pointsRef, {
        userId,
        action,
        points,
        description,
        createdAt: serverTimestamp(),
    });
}

export async function getPointsHistory(userId: string): Promise<any[]> {
    const pointsRef = collection(db, 'points_history');
    const q = query(pointsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
    }));
}
