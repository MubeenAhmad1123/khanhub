'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/firebase-config';
import {
    collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { writeActivityLog } from '@/hooks/useActivityLog';
import PaymentCard from '@/components/admin/PaymentCard';
import { Payment } from '@/types/payment';
import {
    Loader2,
    CreditCard,
    CheckCircle,
    Clock,
    XCircle,
    DollarSign,
    TrendingUp,
    Calendar
} from 'lucide-react';
import { startOfDay, startOfMonth, isAfter } from 'date-fns';
import { toDate } from '@/lib/firebase/firestore';

export default function AdminPaymentsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

    useEffect(() => {
        const q = query(collection(db, 'payments'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            // Sort by createdAt desc
            list.sort((a, b) => {
                const timeA = (a as any).createdAt?.seconds || 0;
                const timeB = (b as any).createdAt?.seconds || 0;
                return timeB - timeA;
            });
            setPayments(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleApprove = async (paymentId: string) => {
        const payment = payments.find(p => p.id === paymentId);
        if (!payment) return;

        try {
            // 1. Update payment doc
            await updateDoc(doc(db, 'payments', paymentId), {
                status: 'approved',
                reviewedBy: user?.uid,
                reviewedAt: serverTimestamp(),
            });

            // 2. Update user doc based on payment type
            const userUpdate: any = {
                paymentStatus: 'approved',
                updatedAt: serverTimestamp(),
            };

            if (payment.type === 'premium') {
                const now = new Date();
                const end = new Date();
                end.setDate(end.getDate() + 30);
                userUpdate.isPremium = true;
                userUpdate.premiumStartDate = now;
                userUpdate.premiumEndDate = end;
            } else if (payment.type === 'video_upload') {
                userUpdate.video_upload_enabled = true;
                userUpdate.profile_status = 'video_pending';
            } else if (payment.type === 'connection' && (payment as any).connectionId) {
                // Connection Reveal Logic
                await updateDoc(doc(db, 'connections', (payment as any).connectionId), {
                    status: 'approved',
                    approvedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });

                // Also notify the seeker that someone connected
                await addDoc(collection(db, 'notifications'), {
                    userId: (payment as any).seekerId,
                    type: 'new_connection',
                    title: 'New Connection Revealed!',
                    message: `${payment.userEmail || 'An employer'} has revealed your contact info. Expect a call soon!`,
                    read: false,
                    createdAt: serverTimestamp()
                });
            }

            await updateDoc(doc(db, 'users', payment.userId), userUpdate);

            // 3. Write notification
            await addDoc(collection(db, 'notifications'), {
                userId: payment.userId,
                type: 'payment_approved',
                title: 'Payment Approved',
                message: `Your payment of Rs. ${payment.amount} has been approved.`,
                read: false,
                createdAt: serverTimestamp()
            });

            // 4. Write activity log
            await writeActivityLog({
                admin_id: user?.uid || 'system',
                action_type: 'payment_approved',
                target_id: paymentId,
                target_type: 'payment',
                note: `Approved Rs. ${payment.amount} ${payment.type} fee for ${payment.userEmail || payment.userId}`
            });

            toast('Payment approved', 'success');
        } catch (err) {
            console.error(err);
            toast('Failed to approve payment', 'error');
        }
    };

    const handleReject = async (paymentId: string, reason: string) => {
        const payment = payments.find(p => p.id === paymentId);
        if (!payment) return;

        try {
            // 1. Update payment doc
            await updateDoc(doc(db, 'payments', paymentId), {
                status: 'rejected',
                rejectionReason: reason,
                reviewedBy: user?.uid,
                reviewedAt: serverTimestamp(),
            });

            // 2. Update user doc (set paymentStatus back to something that lets them re-submit if needed)
            await updateDoc(doc(db, 'users', payment.userId), {
                paymentStatus: 'rejected', // UI should handle this to allow re-submission
                profile_status: 'incomplete',
                updatedAt: serverTimestamp(),
            });

            // 3. Write notification
            await addDoc(collection(db, 'notifications'), {
                userId: payment.userId,
                type: 'payment_rejected',
                title: 'Payment Rejected',
                message: `Your payment was rejected: ${reason}. Please try again.`,
                read: false,
                createdAt: serverTimestamp()
            });

            // 4. Write activity log
            await writeActivityLog({
                admin_id: user?.uid || 'system',
                action_type: 'payment_rejected',
                target_id: paymentId,
                target_type: 'payment',
                note: `Rejected payment for ${payment.userEmail || payment.userId}: ${reason}`
            });

            toast('Payment rejected', 'info');
        } catch (err) {
            console.error(err);
            toast('Failed to reject payment', 'error');
        }
    };

    // Stats Calculation
    const today = startOfDay(new Date());
    const firstOfMonth = startOfMonth(new Date());

    const stats = {
        totalApproved: payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0),
        todayRevenue: payments
            .filter(p => p.status === 'approved' && p.reviewedAt && isAfter(toDate(p.reviewedAt), today))
            .reduce((sum, p) => sum + p.amount, 0),
        monthRevenue: payments
            .filter(p => p.status === 'approved' && p.reviewedAt && isAfter(toDate(p.reviewedAt), firstOfMonth))
            .reduce((sum, p) => sum + p.amount, 0),
        pendingCount: payments.filter(p => p.status === 'pending').length,
    };

    const filteredPayments = payments.filter(p => filter === 'all' || p.status === filter);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-100 italic font-bold">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                LOADING PAYMENTS...
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tighter">
                        <CreditCard className="w-8 h-8 text-blue-600" />
                        Finances & Payments
                    </h1>
                    <p className="text-slate-500 font-bold">Verify bank transfers and activate memberships</p>
                </div>
            </div>

            {/* Summary Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Today Revenue', value: `Rs. ${stats.todayRevenue.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-green-500' },
                    { label: 'This Month', value: `Rs. ${stats.monthRevenue.toLocaleString()}`, icon: <Calendar className="w-5 h-5" />, color: 'bg-blue-500' },
                    { label: 'Total Approved', value: `Rs. ${stats.totalApproved.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: 'bg-teal-500' },
                    { label: 'Pending Now', value: stats.pendingCount, icon: <Clock className="w-5 h-5" />, color: 'bg-orange-500' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-2">
                            <div className={`${stat.color} p-2 rounded-lg text-white`}>
                                {stat.icon}
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'all', label: 'All Payments', count: payments.length },
                    { id: 'pending', label: 'Pending Queue', count: stats.pendingCount },
                    { id: 'approved', label: 'Approved', count: payments.filter(p => p.status === 'approved').length },
                    { id: 'rejected', label: 'Rejected', count: payments.filter(p => p.status === 'rejected').length },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id as any)}
                        className={`px-5 py-2.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 border-2 ${filter === tab.id
                            ? `bg-slate-900 border-slate-900 text-white shadow-lg`
                            : `bg-white border-slate-100 text-slate-500 hover:border-slate-300`
                            }`}
                    >
                        {tab.label}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {filteredPayments.length === 0 ? (
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center">
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
                        <CheckCircle className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">No payments found</h3>
                    <p className="text-slate-500 font-bold">Nothing to show in this view.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xL:grid-cols-3 gap-8">
                    {filteredPayments.map(payment => (
                        <PaymentCard
                            key={payment.id}
                            payment={payment}
                            onApprove={handleApprove}
                            onReject={handleReject}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}