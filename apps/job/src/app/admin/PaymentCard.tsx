'use client';

import { useState, useEffect } from 'react';
import { Payment } from '@/types/payment';
import { formatDistanceToNow, addMinutes, differenceInSeconds } from 'date-fns';

interface PaymentCardProps {
    payment: Payment;
    onApprove: (paymentId: string) => Promise<void>;
    onReject: (paymentId: string, reason: string) => Promise<void>;
}

export default function PaymentCard({ payment, onApprove, onReject }: PaymentCardProps) {
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isWithinWindow, setIsWithinWindow] = useState(true);

    useEffect(() => {
        if (!payment.submittedAt) return;

        const timer = setInterval(() => {
            const submittedAt = (payment.submittedAt as any).toDate ? (payment.submittedAt as any).toDate() : new Date(payment.submittedAt as any);
            const expiryTime = addMinutes(submittedAt, 30);
            const now = new Date();
            const diff = differenceInSeconds(expiryTime, now);

            if (diff <= 0) {
                setTimeLeft('Expired');
                setIsWithinWindow(false);
                clearInterval(timer);
            } else {
                const minutes = Math.floor(diff / 60);
                const seconds = diff % 60;
                setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
                setIsWithinWindow(true);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [payment.submittedAt]);

    // Calculate time since submission
    const timeAgo = payment.submittedAt
        ? formatDistanceToNow((payment.submittedAt as any).toDate ? (payment.submittedAt as any).toDate() : new Date(payment.submittedAt as any), { addSuffix: true })
        : 'Unknown time';

    const handleApprove = async () => {
        try {
            setIsApproving(true);
            await onApprove(payment.id);
        } catch (error) {
            console.error('Approve error:', error);
            alert('Failed to approve payment');
        } finally {
            setIsApproving(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }

        try {
            setIsRejecting(true);
            await onReject(payment.id, rejectReason);
            setShowRejectModal(false);
            setRejectReason('');
        } catch (error) {
            console.error('Reject error:', error);
            alert('Failed to reject payment');
        } finally {
            setIsRejecting(false);
        }
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Payment #{payment.id.slice(0, 8)}
                        </h3>
                        <p className="text-sm text-gray-500">{timeAgo}</p>
                        {isWithinWindow && (
                            <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                ⏰ {timeLeft} remaining
                            </span>
                        )}
                        {!isWithinWindow && (
                            <span className="inline-block mt-1 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                ⚠️ Window Expired
                            </span>
                        )}
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        Pending
                    </span>
                </div>

                {/* Payment Details */}
                <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Amount</p>
                            <p className="text-lg font-semibold text-gray-900">
                                Rs. {payment.amount.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Payment Method</p>
                            <p className="text-gray-900 capitalize">{payment.method}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Type</p>
                            <p className="text-gray-900 capitalize">{payment.type}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Transaction ID</p>
                            <p className="text-gray-900 font-mono text-sm">
                                {payment.transactionId || 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="pt-3 border-t">
                        <p className="text-sm text-gray-500">User ID</p>
                        <p className="text-gray-900 font-mono text-sm">{payment.userId}</p>
                    </div>
                </div>

                {/* Screenshot */}
                {payment.screenshotUrl && (
                    <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-2">Payment Screenshot</p>
                        <a
                            href={payment.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                        >
                            <img
                                src={payment.screenshotUrl}
                                alt="Payment screenshot"
                                className="w-full max-h-64 object-contain border rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
                            />
                        </a>
                        <a
                            href={payment.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-teal-600 hover:text-teal-700 mt-2 inline-block"
                        >
                            View Full Size →
                        </a>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleApprove}
                        disabled={isApproving || isRejecting}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        {isApproving ? 'Approving...' : '✓ Approve Payment'}
                    </button>
                    <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={isApproving || isRejecting}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        ✗ Reject
                    </button>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">Reject Payment</h3>
                        <p className="text-gray-600 mb-4">
                            Please provide a reason for rejecting this payment. The user will be notified.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g., Screenshot is unclear, wrong amount, duplicate payment..."
                            className="w-full border rounded-lg p-3 mb-4 h-24 resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                                disabled={isRejecting}
                                className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isRejecting || !rejectReason.trim()}
                                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isRejecting ? 'Rejecting...' : 'Reject Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}