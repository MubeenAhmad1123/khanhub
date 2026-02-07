'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DollarSign, Clock, Briefcase, Users, CheckCircle, XCircle, Loader2, TrendingUp } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { updatePayment } from '@/lib/firebase/firestore';
import { updateUserProfile } from '@/lib/firebase/auth';
import { sendPaymentApprovalEmail, sendPaymentRejectionEmail } from '@/lib/services/emailService';

export default function AdminDashboardPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [authenticated, setAuthenticated] = useState(false);
    const [error, setError] = useState('');
    const { pendingPayments, placements, loading, refresh } = useAdmin();

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
            setAuthenticated(true);
            setError('');
        } else {
            setError('Invalid password');
        }
    };

    const handleApprovePayment = async (paymentId: string, userId: string, userEmail: string, userName: string, amount: number) => {
        try {
            // Update payment status
            await updatePayment(paymentId, {
                status: 'approved',
                reviewedBy: 'admin',
                reviewedAt: new Date(),
            });

            // Update user profile
            await updateUserProfile(userId, {
                registrationApproved: true,
                registrationPaid: true,
            });

            // Send approval email
            await sendPaymentApprovalEmail(userEmail, userName, amount);

            // Refresh data
            refresh();
        } catch (err) {
            console.error('Error approving payment:', err);
            alert('Failed to approve payment');
        }
    };

    const handleRejectPayment = async (paymentId: string, userEmail: string, userName: string) => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            // Update payment status
            await updatePayment(paymentId, {
                status: 'rejected',
                reviewedBy: 'admin',
                reviewedAt: new Date(),
                rejectionReason: reason,
            });

            // Send rejection email
            await sendPaymentRejectionEmail(userEmail, userName, reason);

            // Refresh data
            refresh();
        } catch (err) {
            console.error('Error rejecting payment:', err);
            alert('Failed to reject payment');
        }
    };

    if (!authenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-jobs-neutral px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl">
                    <h2 className="text-2xl font-black text-jobs-dark mb-6 text-center">Admin Access</h2>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                placeholder="Enter admin password"
                                required
                            />
                        </div>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-jobs-primary text-white py-3 rounded-xl font-bold hover:opacity-90 transition-all"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-jobs-primary" />
            </div>
        );
    }

    const totalRevenue = placements.reduce((sum, p) => sum + p.commissionAmount, 0);
    const pendingRevenue = placements
        .filter(p => p.commissionStatus === 'pending')
        .reduce((sum, p) => sum + p.commissionAmount, 0);

    return (
        <div className="min-h-screen bg-jobs-neutral p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-jobs-dark mb-2">Admin Dashboard</h1>
                    <p className="text-jobs-dark/60">Manage payments, jobs, and placements</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-green-100 p-3 rounded-xl">
                                <DollarSign className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">
                            Rs. {totalRevenue.toLocaleString()}
                        </div>
                        <div className="text-sm text-jobs-dark/60">Total Revenue</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-yellow-100 p-3 rounded-xl">
                                <Clock className="h-6 w-6 text-yellow-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">
                            {pendingPayments.length}
                        </div>
                        <div className="text-sm text-jobs-dark/60">Pending Payments</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-blue-100 p-3 rounded-xl">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">
                            {placements.length}
                        </div>
                        <div className="text-sm text-jobs-dark/60">Total Placements</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-orange-100 p-3 rounded-xl">
                                <TrendingUp className="h-6 w-6 text-orange-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">
                            Rs. {pendingRevenue.toLocaleString()}
                        </div>
                        <div className="text-sm text-jobs-dark/60">Pending Commission</div>
                    </div>
                </div>

                {/* Pending Payments */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 mb-8">
                    <h2 className="text-2xl font-black text-jobs-dark mb-6">Pending Payments</h2>

                    {pendingPayments.length === 0 ? (
                        <p className="text-jobs-dark/60 text-center py-8">No pending payments</p>
                    ) : (
                        <div className="space-y-4">
                            {pendingPayments.map((payment) => (
                                <div key={payment.id} className="border border-gray-100 rounded-2xl p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="font-bold text-jobs-dark">
                                                Payment #{payment.id.slice(0, 8)}
                                            </div>
                                            <div className="text-sm text-jobs-dark/60 mt-1">
                                                Amount: <strong>Rs. {payment.amount.toLocaleString()}</strong>
                                            </div>
                                            <div className="text-sm text-jobs-dark/60">
                                                Type: {payment.type === 'registration' ? 'Registration' : 'Premium'}
                                            </div>
                                            <div className="text-xs text-jobs-dark/50 mt-1">
                                                Submitted: {payment.createdAt.toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <a
                                            href={payment.screenshotUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block"
                                        >
                                            <img
                                                src={payment.screenshotUrl}
                                                alt="Payment screenshot"
                                                className="w-full max-w-md rounded-xl border-2 border-gray-100 hover:border-jobs-primary transition-colors cursor-pointer"
                                            />
                                        </a>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleApprovePayment(
                                                payment.id,
                                                payment.userId,
                                                '', // userEmail - need to fetch from users collection
                                                '', // userName - need to fetch from users collection
                                                payment.amount
                                            )}
                                            className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-600 transition-colors"
                                        >
                                            <CheckCircle className="h-5 w-5" />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleRejectPayment(
                                                payment.id,
                                                '', // userEmail
                                                ''  // userName
                                            )}
                                            className="flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-600 transition-colors"
                                        >
                                            <XCircle className="h-5 w-5" />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link
                        href="/admin/jobs"
                        className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:border-jobs-primary transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-jobs-primary transition-colors">
                                <Briefcase className="h-6 w-6 text-blue-600 group-hover:text-white" />
                            </div>
                            <div>
                                <div className="font-bold text-jobs-dark">Manage Jobs</div>
                                <div className="text-xs text-jobs-dark/60">Approve/reject postings</div>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/admin/placements"
                        className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:border-jobs-accent transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-orange-100 p-3 rounded-xl group-hover:bg-jobs-accent transition-colors">
                                <Users className="h-6 w-6 text-orange-600 group-hover:text-white" />
                            </div>
                            <div>
                                <div className="font-bold text-jobs-dark">Placements</div>
                                <div className="text-xs text-jobs-dark/60">Track commissions</div>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/admin/analytics"
                        className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:border-green-500 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-500 transition-colors">
                                <TrendingUp className="h-6 w-6 text-green-600 group-hover:text-white" />
                            </div>
                            <div>
                                <div className="font-bold text-jobs-dark">Analytics</div>
                                <div className="text-xs text-jobs-dark/60">View insights</div>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
