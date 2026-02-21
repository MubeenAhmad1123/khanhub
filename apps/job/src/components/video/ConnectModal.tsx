'use client';

import { useState } from 'react';
import { X, Send, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { useConnections } from '@/hooks/useConnections';
import { useAuth } from '@/hooks/useAuth';
import { Timestamp } from 'firebase/firestore';

interface ConnectModalProps {
    seekerId: string;
    seekerName: string;
    isOpen: boolean;
    onClose: () => void;
}

type ModalState = 'REQUEST' | 'PAYMENT' | 'SUCCESS';

export default function ConnectModal({ seekerId, seekerName, isOpen, onClose }: ConnectModalProps) {
    const { requestConnection, loading: connectionLoading } = useConnections();
    const { user } = useAuth();
    const [modalState, setModalState] = useState<ModalState>('REQUEST');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleRequest = async () => {
        try {
            setIsSubmitting(true);
            setError(null);
            await requestConnection(seekerId, seekerName, message);
            setModalState('PAYMENT');
        } catch (err: any) {
            setError(err.message || 'Failed to send request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMockPayment = () => {
        // In a real app, this would redirect to a checkout or show a payment form
        // For now, we move to success state (admin would verify the actual payment later in a real flow)
        setModalState('SUCCESS');
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative p-6 text-center border-b border-gray-50">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        {modalState === 'REQUEST' && <Send className="w-8 h-8 text-blue-600" />}
                        {modalState === 'PAYMENT' && <CreditCard className="w-8 h-8 text-orange-600" />}
                        {modalState === 'SUCCESS' && <CheckCircle2 className="w-8 h-8 text-green-600" />}
                    </div>
                    <h2 className="text-xl font-black text-gray-900 leading-tight">
                        {modalState === 'REQUEST' && `Connect with ${seekerName}`}
                        {modalState === 'PAYMENT' && 'Reveal Contact Info'}
                        {modalState === 'SUCCESS' && 'Request Sent!'}
                    </h2>
                </div>

                {/* Body */}
                <div className="p-6">
                    {modalState === 'REQUEST' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">
                                Interested in this candidate? Send a connection request to initiate the process.
                            </p>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
                                    Why do you want to connect? (Optional)
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Briefly describe why you're interested..."
                                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 min-h-[100px] text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {modalState === 'PAYMENT' && (
                        <div className="space-y-4 text-center">
                            <p className="text-sm text-gray-600">
                                To reveal <span className="font-bold">{seekerName}'s</span> direct phone number and LinkedIn, a one-time connection fee is required.
                            </p>
                            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                                <p className="text-xs font-bold text-orange-800 uppercase tracking-widest mb-1">Fee Amount</p>
                                <p className="text-3xl font-black text-orange-600">1,000 PKR</p>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                Once paid, our team will verify the payment and reveal the contact details within 2-4 hours. You'll receive a notification.
                            </p>
                        </div>
                    )}

                    {modalState === 'SUCCESS' && (
                        <div className="text-center space-y-4 py-4">
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Great! Your request has been sent to the admin team. Please complete the payment via the bank details in your dashboard.
                            </p>
                            <div className="bg-green-50 p-4 rounded-2xl text-left">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-green-600" />
                                    <span className="text-xs font-bold text-green-800 uppercase tracking-widest">Bank Details</span>
                                </div>
                                <p className="text-sm font-bold text-green-900">Meezan Bank</p>
                                <p className="text-xs text-green-700">Acc: 1234 5678 9012 3456</p>
                                <p className="text-xs text-green-700">Ahmad Mubeen</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs font-medium rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-0">
                    {modalState === 'REQUEST' && (
                        <button
                            onClick={handleRequest}
                            disabled={isSubmitting}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-blue-500/25 active:scale-95"
                        >
                            {isSubmitting ? 'Sending...' : 'Send Request'}
                        </button>
                    )}

                    {modalState === 'PAYMENT' && (
                        <button
                            onClick={handleMockPayment}
                            className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-orange-500/25 active:scale-95"
                        >
                            Proceed to Payment
                        </button>
                    )}

                    {modalState === 'SUCCESS' && (
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-sm transition-all active:scale-95"
                        >
                            Back to Browse
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
