// useAdmin Hook - Admin Operations (FIXED)
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

export interface AdminDashboardData {
    summary: {
        totalUsers: number;
        totalJobSeekers: number;
        totalEmployers: number;
        totalActiveVideos: number;
        totalConnections: number;
        totalRevenue: number;
        monthlyRevenue: number;
    };
    pendingActions: {
        paymentsToReview: number;
        videosToReview: number;
    };
}

export function useAdmin() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [placements, setPlacements] = useState<any[]>([]);

    const approvePayment = async (
        paymentId: string,
        adminId: string
    ): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            const paymentRef = doc(db, 'payments', paymentId);
            const paymentSnap = await getDoc(paymentRef);

            if (!paymentSnap.exists()) throw new Error('Payment not found');
            const payment = paymentSnap.data() as Payment;

            await updateDoc(paymentRef, {
                status: 'approved',
                reviewedBy: adminId,
                reviewedAt: serverTimestamp(),
            });

            const userRef = doc(db, 'users', payment.userId);
            if (payment.type === 'premium') {
                const end = new Date();
                end.setDate(end.getDate() + 30);
                await updateDoc(userRef, {
                    isPremium: true,
                    premiumStartDate: serverTimestamp(),
                    premiumEndDate: end,
                });
            } else if (payment.type === 'video_upload') {
                await updateDoc(userRef, {
                    video_upload_enabled: true,
                    profile_status: 'video_pending',
                });
            } else if (payment.type === 'connection' && (payment as any).connectionId) {
                await updateDoc(doc(db, 'connections', (payment as any).connectionId), {
                    status: 'approved',
                    approvedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            }

            await addDoc(collection(db, 'notifications'), {
                userId: payment.userId,
                type: 'payment_approved',
                title: 'Payment Approved',
                message: `Your payment of Rs. ${payment.amount} has been approved.`,
                read: false,
                createdAt: serverTimestamp()
            });

        } catch (err: any) {
            setError(err.message || 'Failed to approve payment');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const rejectPayment = async (
        paymentId: string,
        adminId: string,
        rejectionReason: string
    ): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            const paymentRef = doc(db, 'payments', paymentId);
            const paymentSnap = await getDoc(paymentRef);
            if (!paymentSnap.exists()) throw new Error('Payment not found');
            const payment = paymentSnap.data() as Payment;

            await updateDoc(paymentRef, {
                status: 'rejected',
                rejectionReason,
                reviewedBy: adminId,
                reviewedAt: serverTimestamp(),
            });

            await addDoc(collection(db, 'notifications'), {
                userId: payment.userId,
                type: 'payment_rejected',
                title: 'Payment Rejected',
                message: `Your payment was rejected: ${rejectionReason}`,
                read: false,
                createdAt: serverTimestamp()
            });

        } catch (err: any) {
            setError(err.message || 'Failed to reject payment');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const getDashboardData = async (): Promise<AdminDashboardData> => {
        try {
            setLoading(true);
            const usersSnap = await getDocs(collection(db, 'users'));
            const connsSnap = await getDocs(collection(db, 'connections'));
            const paymentsSnap = await getDocs(collection(db, 'payments'));

            const users = usersSnap.docs.map(d => d.data());
            const payments = paymentsSnap.docs.map(d => d.data() as Payment);

            const approvedPayments = payments.filter(p => p.status === 'approved');

            return {
                summary: {
                    totalUsers: users.length,
                    totalJobSeekers: users.filter(u => u.role === 'job_seeker').length,
                    totalEmployers: users.filter(u => u.role === 'employer').length,
                    totalActiveVideos: users.filter(u => u.profile_status === 'active').length,
                    totalConnections: connsSnap.size,
                    totalRevenue: approvedPayments.reduce((s, p) => s + (p.amount || 0), 0),
                    monthlyRevenue: 0,
                },
                pendingActions: {
                    paymentsToReview: payments.filter(p => p.status === 'pending').length,
                    videosToReview: users.filter(u => u.profile_status === 'video_submitted').length,
                }
            };
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        placements,
        approvePayment,
        rejectPayment,
        getDashboardData
    };
}