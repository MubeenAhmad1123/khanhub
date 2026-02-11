// useAdmin Hook - Admin Operations (FIXED VERSION)
import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    updateDoc,
    getDoc,
    addDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { Payment } from '@/types/payment';
import { Job } from '@/types/job';
import { User } from '@/types/user';
import { AdminDashboardData } from '@/types/admin';
import { sendPaymentApprovalEmail, sendPaymentRejectionEmail, sendJobApprovalEmail, sendJobRejectionEmail } from '@/lib/services/emailService';

export function useAdmin() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [placements, setPlacements] = useState<any[]>([]);

    /**
     * Approve payment - FIXED VERSION
     */
    const approvePayment = async (
        paymentId: string,
        adminId: string,
        adminNotes?: string
    ): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            console.log('🔄 Approving payment:', paymentId);

            const paymentRef = doc(db, 'payments', paymentId);
            const paymentSnap = await getDoc(paymentRef);

            if (!paymentSnap.exists()) {
                throw new Error('Payment not found');
            }

            const payment = paymentSnap.data() as Payment;
            console.log('📄 Payment data:', payment);

            // Update payment status
            await updateDoc(paymentRef, {
                status: 'approved',
                reviewedBy: adminId,
                reviewedAt: serverTimestamp(),
                adminNotes: adminNotes || '',
            });
            console.log('✅ Payment document updated');

            // Update user status
            const userRef = doc(db, 'users', payment.userId);

            if (payment.type === 'registration') {
                await updateDoc(userRef, {
                    paymentStatus: 'approved',
                });
                console.log('✅ User paymentStatus updated to approved');
            } else if (payment.type === 'premium') {
                const premiumStart = new Date();
                const premiumEnd = new Date();
                premiumEnd.setDate(premiumEnd.getDate() + 30);

                await updateDoc(userRef, {
                    isPremium: true,
                    premiumStartDate: premiumStart,
                    premiumEndDate: premiumEnd,
                    premiumJobsViewed: 0,
                });

                await updateDoc(paymentRef, {
                    premiumStartDate: premiumStart,
                    premiumEndDate: premiumEnd,
                });
                console.log('✅ Premium subscription activated');
            }

            // Send approval email (don't let email errors break the approval)
            try {
                await sendPaymentApprovalEmail(
                    payment.userEmail,
                    payment.userName,
                    payment.type
                );
                console.log('✅ Approval email sent');
            } catch (emailError) {
                console.warn('⚠️ Email failed but payment was approved:', emailError);
                // Don't throw - payment is already approved
            }

            console.log('✅ Payment approval completed successfully');

        } catch (err: any) {
            console.error('❌ Error approving payment:', err);
            setError(err.message || 'Failed to approve payment');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Reject payment - FIXED VERSION
     */
    const rejectPayment = async (
        paymentId: string,
        adminId: string,
        rejectionReason: string,
        adminNotes?: string
    ): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            console.log('🔄 Rejecting payment:', paymentId);

            const paymentRef = doc(db, 'payments', paymentId);
            const paymentSnap = await getDoc(paymentRef);

            if (!paymentSnap.exists()) {
                throw new Error('Payment not found');
            }

            const payment = paymentSnap.data() as Payment;

            // Update payment status
            await updateDoc(paymentRef, {
                status: 'rejected',
                reviewedBy: adminId,
                reviewedAt: serverTimestamp(),
                rejectionReason,
                adminNotes: adminNotes || '',
            });
            console.log('✅ Payment document updated to rejected');

            // Send rejection email (don't let email errors break the rejection)
            try {
                await sendPaymentRejectionEmail(
                    payment.userEmail,
                    payment.userName,
                    rejectionReason
                );
                console.log('✅ Rejection email sent');
            } catch (emailError) {
                console.warn('⚠️ Email failed but payment was rejected:', emailError);
                // Don't throw - payment is already rejected
            }

            console.log('✅ Payment rejection completed successfully');

        } catch (err: any) {
            console.error('❌ Error rejecting payment:', err);
            setError(err.message || 'Failed to reject payment');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Approve job posting - FIXED VERSION
     */
    const approveJob = async (
        jobId: string,
        adminId: string,
        isFeatured: boolean = false
    ): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            console.log('🔄 Approving job:', jobId);

            const jobRef = doc(db, 'jobs', jobId);
            const jobSnap = await getDoc(jobRef);

            if (!jobSnap.exists()) {
                throw new Error('Job not found');
            }

            const job = jobSnap.data() as Job;

            await updateDoc(jobRef, {
                status: 'active',
                approvedAt: serverTimestamp(),
                isFeatured,
            });
            console.log('✅ Job document updated to active');

            // Get employer email (don't let email errors break the approval)
            try {
                const employerRef = doc(db, 'users', job.employerId);
                const employerSnap = await getDoc(employerRef);

                if (employerSnap.exists()) {
                    const employer = employerSnap.data() as User;
                    await sendJobApprovalEmail(
                        employer.email,
                        employer.displayName,
                        job.title
                    );
                    console.log('✅ Job approval email sent');
                }
            } catch (emailError) {
                console.warn('⚠️ Email failed but job was approved:', emailError);
                // Don't throw - job is already approved
            }

            console.log('✅ Job approval completed successfully');

        } catch (err: any) {
            console.error('❌ Error approving job:', err);
            setError(err.message || 'Failed to approve job');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Reject job posting - FIXED VERSION
     */
    const rejectJob = async (
        jobId: string,
        adminId: string,
        rejectionReason: string
    ): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            console.log('🔄 Rejecting job:', jobId);

            const jobRef = doc(db, 'jobs', jobId);
            const jobSnap = await getDoc(jobRef);

            if (!jobSnap.exists()) {
                throw new Error('Job not found');
            }

            const job = jobSnap.data() as Job;

            await updateDoc(jobRef, {
                status: 'rejected',
                rejectionReason,
            });
            console.log('✅ Job document updated to rejected');

            // Get employer email (don't let email errors break the rejection)
            try {
                const employerRef = doc(db, 'users', job.employerId);
                const employerSnap = await getDoc(employerRef);

                if (employerSnap.exists()) {
                    const employer = employerSnap.data() as User;
                    await sendJobRejectionEmail(
                        employer.email,
                        employer.displayName,
                        job.title,
                        rejectionReason
                    );
                    console.log('✅ Job rejection email sent');
                }
            } catch (emailError) {
                console.warn('⚠️ Email failed but job was rejected:', emailError);
                // Don't throw - job is already rejected
            }

            console.log('✅ Job rejection completed successfully');

        } catch (err: any) {
            console.error('❌ Error rejecting job:', err);
            setError(err.message || 'Failed to reject job');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Create placement record (when candidate is hired)
     */
    const createPlacement = async (
        applicationId: string,
        jobId: string,
        candidateId: string,
        employerId: string,
        firstMonthSalary: number,
        adminId: string
    ): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            const commissionRate = 0.5; // 50%
            const commissionAmount = firstMonthSalary * commissionRate;

            // Get job and candidate details
            const jobSnap = await getDoc(doc(db, 'jobs', jobId));
            const candidateSnap = await getDoc(doc(db, 'users', candidateId));

            if (!jobSnap.exists() || !candidateSnap.exists()) {
                throw new Error('Job or candidate not found');
            }

            const job = jobSnap.data() as Job;
            const candidate = candidateSnap.data() as User;

            // Create placement record
            await addDoc(collection(db, 'placements'), {
                applicationId,
                jobId,
                candidateId,
                employerId,
                candidateName: candidate.displayName,
                jobTitle: job.title,
                companyName: job.companyName,
                firstMonthSalary,
                commissionRate,
                commissionAmount,
                isPaid: false,
                createdBy: adminId,
                createdAt: serverTimestamp(),
                hiredAt: serverTimestamp(),
            });

            // Update application status
            await updateDoc(doc(db, 'applications', applicationId), {
                status: 'hired',
                hiredAt: serverTimestamp(),
                firstMonthSalary,
            });

        } catch (err: any) {
            setError(err.message || 'Failed to create placement');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Mark commission as paid
     */
    const markCommissionPaid = async (
        placementId: string,
        paymentMethod: string,
        paymentReference: string,
        notes?: string
    ): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            await updateDoc(doc(db, 'placements', placementId), {
                isPaid: true,
                paidAt: serverTimestamp(),
                paymentMethod,
                paymentReference,
                notes: notes || '',
            });

        } catch (err: any) {
            setError(err.message || 'Failed to mark commission as paid');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Get all placements
     */
    const getPlacements = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            const snapshot = await getDocs(query(collection(db, 'placements'), orderBy('createdAt', 'desc')));
            const placementsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setPlacements(placementsData);
        } catch (err: any) {
            setError(err.message || 'Failed to load placements');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Get admin dashboard data
     */
    const getDashboardData = async (): Promise<AdminDashboardData> => {
        try {
            setLoading(true);
            setError(null);

            // Get all users
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const users = usersSnapshot.docs.map(doc => doc.data() as User);

            // Get all jobs
            const jobsSnapshot = await getDocs(collection(db, 'jobs'));
            const jobs = jobsSnapshot.docs.map(doc => doc.data() as Job);

            // Get all applications
            const applicationsSnapshot = await getDocs(collection(db, 'applications'));
            const applications = applicationsSnapshot.size;

            // Get all placements
            const placementsSnapshot = await getDocs(collection(db, 'placements'));
            const placements = placementsSnapshot.docs;

            // Get pending payments
            const pendingPaymentsQuery = query(
                collection(db, 'payments'),
                where('status', '==', 'pending')
            );
            const pendingPayments = await getDocs(pendingPaymentsQuery);

            // Get pending jobs
            const pendingJobsQuery = query(
                collection(db, 'jobs'),
                where('status', '==', 'pending')
            );
            const pendingJobs = await getDocs(pendingJobsQuery);

            // Calculate metrics
            const totalRevenue = placements.reduce((sum, doc) => {
                const placement = doc.data();
                return sum + (placement.commissionAmount || 0);
            }, 0);

            const dashboardData: AdminDashboardData = {
                summary: {
                    totalUsers: users.length,
                    totalJobSeekers: users.filter(u => u.role === 'job_seeker').length,
                    totalEmployers: users.filter(u => u.role === 'employer').length,
                    totalPremiumUsers: users.filter(u => u.isPremium).length,
                    totalJobs: jobs.length,
                    activeJobs: jobs.filter(j => j.status === 'active').length,
                    pendingJobs: jobs.filter(j => j.status === 'pending').length,
                    totalApplications: applications,
                    totalPlacements: placements.length,
                    totalRevenue,
                    monthlyRevenue: 0, // Calculate based on current month
                },
                pendingActions: {
                    paymentsToReview: pendingPayments.size,
                    jobsToReview: pendingJobs.size,
                    flaggedApplications: 0,
                    reportedUsers: 0,
                },
                recentPayments: 0,
                recentJobs: 0,
                recentApplications: 0,
                recentPlacements: 0,
                growth: {
                    usersThisMonth: 0,
                    jobsThisMonth: 0,
                    applicationsThisMonth: 0,
                    revenueThisMonth: 0,
                    usersGrowthRate: 0,
                    jobsGrowthRate: 0,
                    applicationsGrowthRate: 0,
                    revenueGrowthRate: 0,
                },
            };

            console.log('useAdmin [Debug]: Fetched raw counts', {
                users: usersSnapshot.size,
                jobs: jobsSnapshot.size,
                applications: applicationsSnapshot.size,
                placements: placementsSnapshot.size
            });

            return dashboardData;
        } catch (err: any) {
            setError(err.message || 'Failed to load dashboard data');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        placements,
        getPlacements,
        refresh: getPlacements,
        approvePayment,
        rejectPayment,
        approveJob,
        rejectJob,
        createPlacement,
        markCommissionPaid,
        getDashboardData,
    };
}