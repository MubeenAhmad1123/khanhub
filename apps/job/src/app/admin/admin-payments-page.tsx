'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Payment } from '@/types/payment';
import {
    collection, doc, updateDoc, serverTimestamp, query, orderBy, onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { Loader2, CheckCircle, XCircle, Clock, Eye, AlertCircle } from 'lucide-react';
import Image from 'next/image';

export default function AdminPaymentsPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            router.push('/admin/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!user || user.role !== 'admin') return;

        setLoadingPayments(true);
        const q = query(collection(db, 'payments'), orderBy('submittedAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const paymentsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Payment[];

            setPayments(paymentsList);
            setLoadingPayments(false);
        }, (error) => {
            console.error('Error loading payments:', error);
            setLoadingPayments(false);
        });

        return () => unsubscribe();
    }, [user]);

    const filteredPayments = filter === 'all'
        ? payments
        : payments.filter(p => p.status === filter);

    const stats = {
        total: payments.length,
        pending: payments.filter(p => p.status === 'pending').length,
        approved: payments.filter(p => p.status === 'approved').length,
        rejected: payments.filter(p => p.status === 'rejected').length,
    };

    const handleApprove = async (payment: Payment) => {
        if (!confirm(`Approve payment from ${payment.userEmail}?`)) return;

        setProcessing(true);
        try {
            // Update payment status
            await updateDoc(doc(db, 'payments', payment.id), {
                status: 'approved',
                reviewedBy: user?.uid,
                reviewedAt: serverTimestamp(),
            });

            // Update user payment status
            await updateDoc(doc(db, 'users', payment.userId), {
                paymentStatus: 'approved',
                updatedAt: serverTimestamp(),
            });

            // If premium payment, also update premium status
            if (payment.type === 'premium') {
                const premiumStart = new Date();
                const premiumEnd = new Date();
                premiumEnd.setDate(premiumEnd.getDate() + 30);

                await updateDoc(doc(db, 'users', payment.userId), {
                    isPremium: true,
                    premiumStartDate: premiumStart,
                    premiumEndDate: premiumEnd,
                });

                await updateDoc(doc(db, 'payments', payment.id), {
                    premiumStartDate: premiumStart,
                    premiumEndDate: premiumEnd,
                });
            }

            alert('Payment approved successfully! User will be notified in real-time.');
        } catch (error) {
            console.error('Error approving payment:', error);
            alert('Failed to approve payment');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedPayment) return;
        if (!rejectionReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }

        setProcessing(true);
        try {
            // Update payment status
            await updateDoc(doc(db, 'payments', selectedPayment.id), {
                status: 'rejected',
                rejectionReason: rejectionReason,
                reviewedBy: user?.uid,
                reviewedAt: serverTimestamp(),
            });

            // Update user payment status
            await updateDoc(doc(db, 'users', selectedPayment.userId), {
                paymentStatus: 'rejected',
                updatedAt: serverTimestamp(),
            });

            alert('Payment rejected. User will be notified in real-time.');
            setShowModal(false);
            setSelectedPayment(null);
            setRejectionReason('');
        } catch (error) {
            console.error('Error rejecting payment:', error);
            alert('Failed to reject payment');
        } finally {
            setProcessing(false);
        }
    };

    const openRejectModal = (payment: Payment) => {
        setSelectedPayment(payment);
        setShowModal(true);
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-gray-900 mb-2">Payment Verification</h1>
                    <p className="text-gray-600">Review and approve user payments</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Payments"
                        value={stats.total}
                        icon={<Clock className="h-6 w-6" />}
                        color="blue"
                    />
                    <StatCard
                        title="Pending Review"
                        value={stats.pending}
                        icon={<AlertCircle className="h-6 w-6" />}
                        color="yellow"
                    />
                    <StatCard
                        title="Approved"
                        value={stats.approved}
                        icon={<CheckCircle className="h-6 w-6" />}
                        color="green"
                    />
                    <StatCard
                        title="Rejected"
                        value={stats.rejected}
                        icon={<XCircle className="h-6 w-6" />}
                        color="red"
                    />
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-md p-4 mb-6">
                    <div className="flex gap-4">
                        <FilterButton
                            label="All"
                            count={stats.total}
                            active={filter === 'all'}
                            onClick={() => setFilter('all')}
                        />
                        <FilterButton
                            label="Pending"
                            count={stats.pending}
                            active={filter === 'pending'}
                            onClick={() => setFilter('pending')}
                            color="yellow"
                        />
                        <FilterButton
                            label="Approved"
                            count={stats.approved}
                            active={filter === 'approved'}
                            onClick={() => setFilter('approved')}
                            color="green"
                        />
                        <FilterButton
                            label="Rejected"
                            count={stats.rejected}
                            active={filter === 'rejected'}
                            onClick={() => setFilter('rejected')}
                            color="red"
                        />
                    </div>
                </div>

                {/* Payments List */}
                {loadingPayments ? (
                    <div className="text-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto" />
                    </div>
                ) : filteredPayments.length > 0 ? (
                    <div className="space-y-4">
                        {filteredPayments.map((payment) => (
                            <PaymentCard
                                key={payment.id}
                                payment={payment}
                                onApprove={handleApprove}
                                onReject={openRejectModal}
                                processing={processing}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <p className="text-gray-500">No payments found</p>
                    </div>
                )}

                {/* Rejection Modal */}
                {showModal && selectedPayment && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                            <h2 className="text-2xl font-bold mb-4">Reject Payment</h2>
                            <p className="text-gray-600 mb-4">
                                User: <strong>{selectedPayment.userEmail}</strong>
                            </p>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rejection Reason *
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                placeholder="e.g., Invalid transaction ID, Screenshot not clear, Wrong amount..."
                                required
                            />
                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setSelectedPayment(null);
                                        setRejectionReason('');
                                    }}
                                    disabled={processing}
                                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={processing || !rejectionReason.trim()}
                                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Rejecting...
                                        </>
                                    ) : (
                                        'Reject Payment'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: any) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        green: 'bg-green-50 text-green-600',
        red: 'bg-red-50 text-red-600',
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div className={`inline-flex p-3 rounded-lg mb-4 ${colorClasses[color]}`}>
                {icon}
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
    );
}

function FilterButton({ label, count, active, onClick, color = 'teal' }: any) {
    const activeColors = {
        teal: 'bg-teal-600 text-white',
        yellow: 'bg-yellow-500 text-white',
        green: 'bg-green-600 text-white',
        red: 'bg-red-600 text-white',
    };

    return (
        <button
            onClick={onClick}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${active
                ? activeColors[color]
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
        >
            {label} ({count})
        </button>
    );
}

function PaymentCard({ payment, onApprove, onReject, processing }: any) {
    const [showScreenshot, setShowScreenshot] = useState(false);

    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
    };

    const statusIcons = {
        pending: <Clock className="h-5 w-5" />,
        approved: <CheckCircle className="h-5 w-5" />,
        rejected: <XCircle className="h-5 w-5" />,
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Payment Info */}
                <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">{payment.userEmail}</h3>
                            <p className="text-sm text-gray-600">{payment.userName || 'No name'}</p>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${statusColors[payment.status]}`}>
                            {statusIcons[payment.status]}
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Amount:</span>
                            <p className="font-semibold">Rs. {payment.amount.toLocaleString()}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Type:</span>
                            <p className="font-semibold capitalize">{payment.type}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Method:</span>
                            <p className="font-semibold capitalize">{payment.method.replace('_', ' ')}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Transaction ID:</span>
                            <p className="font-semibold">{payment.transactionId}</p>
                        </div>
                    </div>

                    {payment.userNotes && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <span className="text-xs text-gray-500">User Notes:</span>
                            <p className="text-sm">{payment.userNotes}</p>
                        </div>
                    )}

                    {payment.rejectionReason && (
                        <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-500">
                            <span className="text-xs text-red-600 font-semibold">Rejection Reason:</span>
                            <p className="text-sm text-red-800">{payment.rejectionReason}</p>
                        </div>
                    )}
                </div>

                {/* Screenshot */}
                <div className="lg:w-64">
                    <button
                        onClick={() => setShowScreenshot(!showScreenshot)}
                        className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-teal-500 transition-all relative group"
                    >
                        <Image
                            src={payment.screenshotUrl}
                            alt="Payment Screenshot"
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="h-8 w-8 text-white" />
                        </div>
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">Click to view full size</p>
                </div>
            </div>

            {/* Actions */}
            {payment.status === 'pending' && (
                <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
                    <button
                        onClick={() => onReject(payment)}
                        disabled={processing}
                        className="flex-1 px-6 py-3 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                        <XCircle className="h-5 w-5" />
                        Reject
                    </button>
                    <button
                        onClick={() => onApprove(payment)}
                        disabled={processing}
                        className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium flex items-center justify-center gap-2"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-5 w-5" />
                                Approve
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Screenshot Modal */}
            {showScreenshot && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowScreenshot(false)}
                >
                    <div className="relative max-w-4xl w-full h-full flex items-center justify-center">
                        <Image
                            src={payment.screenshotUrl}
                            alt="Payment Screenshot"
                            fill
                            className="object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}