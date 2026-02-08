'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import PaymentCard from '@/components/admin/PaymentCard';
import { Payment } from '@/types/payment';

export default function AdminPaymentsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { approvePayment, rejectPayment } = useAdmin();

    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

    // Auth check
    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'admin')) {
            router.push('/auth/login');
        }
    }, [authLoading, user, router]);

    // Fetch payments
    useEffect(() => {
        if (!user) return;

        const fetchPayments = async () => {
            try {
                setLoading(true);
                const { getDocs, collection, query, where, orderBy } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase/config');

                let q;
                if (filter === 'all') {
                    q = query(
                        collection(db, 'payments'),
                        orderBy('createdAt', 'desc')
                    );
                } else {
                    q = query(
                        collection(db, 'payments'),
                        where('status', '==', filter),
                        orderBy('createdAt', 'desc')
                    );
                }

                const snapshot = await getDocs(q);
                const paymentsData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Payment[];

                setPayments(paymentsData);
            } catch (error) {
                console.error('Fetch payments error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPayments();
    }, [user, filter]);

    const handleApprove = async (paymentId: string) => {
        await approvePayment(paymentId);
        // Refresh payments list
        setPayments((prev) =>
            prev.map((p) => (p.id === paymentId ? { ...p, status: 'approved' as const } : p))
        );
    };

    const handleReject = async (paymentId: string, reason: string) => {
        await rejectPayment(paymentId, reason);
        // Refresh payments list
        setPayments((prev) =>
            prev.map((p) => (p.id === paymentId ? { ...p, status: 'rejected' as const } : p))
        );
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading payments...</p>
                </div>
            </div>
        );
    }

    const pendingCount = payments.filter((p) => p.status === 'pending').length;
    const approvedCount = payments.filter((p) => p.status === 'approved').length;
    const rejectedCount = payments.filter((p) => p.status === 'rejected').length;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
                    <p className="text-gray-600 mt-2">
                        Approve or reject payment submissions. Act quickly within 30-minute window!
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-500">Total Payments</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{payments.length}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg shadow p-6 border-l-4 border-yellow-500">
                        <p className="text-sm text-yellow-700">Pending</p>
                        <p className="text-3xl font-bold text-yellow-900 mt-2">{pendingCount}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-500">
                        <p className="text-sm text-green-700">Approved</p>
                        <p className="text-3xl font-bold text-green-900 mt-2">{approvedCount}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg shadow p-6 border-l-4 border-red-500">
                        <p className="text-sm text-red-700">Rejected</p>
                        <p className="text-3xl font-bold text-red-900 mt-2">{rejectedCount}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow mb-6 p-4">
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            All ({payments.length})
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'pending'
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Pending ({pendingCount})
                        </button>
                        <button
                            onClick={() => setFilter('approved')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'approved'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Approved ({approvedCount})
                        </button>
                        <button
                            onClick={() => setFilter('rejected')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'rejected'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Rejected ({rejectedCount})
                        </button>
                    </div>
                </div>

                {/* Payments List */}
                {payments.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No {filter !== 'all' && filter} payments
                        </h3>
                        <p className="text-gray-600">
                            {filter === 'pending'
                                ? 'All caught up! No pending payments to review.'
                                : `No ${filter} payments found.`}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {payments.map((payment) => {
                            if (payment.status === 'pending') {
                                return (
                                    <PaymentCard
                                        key={payment.id}
                                        payment={payment}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                    />
                                );
                            }

                            // Show approved/rejected payments as cards (non-interactive)
                            return (
                                <div
                                    key={payment.id}
                                    className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${payment.status === 'approved'
                                            ? 'border-green-500'
                                            : 'border-red-500'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                Payment #{payment.id.slice(0, 8)}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {payment.createdAt
                                                    ? new Date(payment.createdAt.toDate()).toLocaleDateString()
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                        <span
                                            className={`px-3 py-1 rounded-full text-sm font-medium ${payment.status === 'approved'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}
                                        >
                                            {payment.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Amount</p>
                                            <p className="text-lg font-semibold text-gray-900">
                                                Rs. {payment.amount.toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Payment Method</p>
                                            <p className="text-gray-900 capitalize">{payment.paymentMethod}</p>
                                        </div>
                                    </div>
                                    {payment.rejectionReason && (
                                        <div className="mt-4 p-3 bg-red-50 rounded-lg">
                                            <p className="text-sm text-red-700">
                                                <strong>Rejection Reason:</strong> {payment.rejectionReason}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}