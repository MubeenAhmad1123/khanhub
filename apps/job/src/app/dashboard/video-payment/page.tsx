'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePayment } from '@/hooks/usePayment';
import { PAYMENT_AMOUNTS, PaymentMethod, JAZZCASH_ACCOUNT_INFO, EASYPAISA_ACCOUNT_INFO, BANK_ACCOUNT_INFO } from '@/types/payment';
import { Loader2, Upload, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function VideoPaymentPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { submitPayment, submitting, uploadProgress, error: paymentError } = usePayment();

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('jazzcash');
    const [transactionId, setTransactionId] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!user) {
        router.push('/auth/login');
        return null;
    }

    // If already enabled, redirect to upload
    if (user.video_upload_enabled) {
        router.push('/dashboard/upload-video');
        return null;
    }

    // If pending, show pending state
    if (user.profile_status === 'payment_pending') {
        return (
            <div className="min-h-screen bg-[#F8FAFF] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Pending</h2>
                    <p className="text-gray-600 mb-8">
                        We have received your payment proof. Our team is verifying it. This usually takes less than 30 minutes.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setScreenshot(file);
            setScreenshotPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!screenshot) return;

        try {
            await submitPayment(
                screenshot,
                transactionId,
                PAYMENT_AMOUNTS.video_upload,
                'video_upload',
                selectedMethod
            );

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard');
            }, 3000);
        } catch (err) {
            console.error('Payment submission failed:', err);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#F8FAFF] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Submitted!</h2>
                    <p className="text-gray-600 mb-8">
                        Your payment proof has been submitted successfully. You'll be notified once approved.
                    </p>
                    <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFF] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
                        Activate Your <span className="text-blue-600">Video Profile</span>
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Pay a one-time fee of <span className="font-bold text-slate-900">PKR {PAYMENT_AMOUNTS.video_upload.toLocaleString()}</span> to upload your introduction video.
                        Once approved, you'll be discoverable by top employers.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Payment Details */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-blue-600" />
                                Payment Methods
                            </h3>

                            <div className="space-y-4">
                                {/* JazzCash */}
                                <div
                                    onClick={() => setSelectedMethod('jazzcash')}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedMethod === 'jazzcash'
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-slate-100 hover:border-blue-200'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-slate-900">JazzCash</span>
                                        {selectedMethod === 'jazzcash' && <CheckCircle className="w-5 h-5 text-blue-600" />}
                                    </div>
                                    <div className="text-sm text-slate-600 space-y-1">
                                        <p>Account Title: <span className="font-mono font-medium text-slate-900">{JAZZCASH_ACCOUNT_INFO.accountTitle}</span></p>
                                        <p>Account Number: <span className="font-mono font-medium text-slate-900 bg-yellow-100 px-2 py-0.5 rounded">{JAZZCASH_ACCOUNT_INFO.accountNumber}</span></p>
                                    </div>
                                </div>

                                {/* Easypaisa */}
                                <div
                                    onClick={() => setSelectedMethod('easypaisa')}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedMethod === 'easypaisa'
                                            ? 'border-green-600 bg-green-50'
                                            : 'border-slate-100 hover:border-green-200'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-slate-900">Easypaisa</span>
                                        {selectedMethod === 'easypaisa' && <CheckCircle className="w-5 h-5 text-green-600" />}
                                    </div>
                                    <div className="text-sm text-slate-600 space-y-1">
                                        <p>Account Title: <span className="font-mono font-medium text-slate-900">{EASYPAISA_ACCOUNT_INFO.accountTitle}</span></p>
                                        <p>Account Number: <span className="font-mono font-medium text-slate-900 bg-green-100 px-2 py-0.5 rounded">{EASYPAISA_ACCOUNT_INFO.accountNumber}</span></p>
                                    </div>
                                </div>

                                {/* Bank Transfer */}
                                <div
                                    onClick={() => setSelectedMethod('bank_transfer')}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedMethod === 'bank_transfer'
                                            ? 'border-purple-600 bg-purple-50'
                                            : 'border-slate-100 hover:border-purple-200'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-slate-900">Bank Transfer</span>
                                        {selectedMethod === 'bank_transfer' && <CheckCircle className="w-5 h-5 text-purple-600" />}
                                    </div>
                                    <div className="text-sm text-slate-600 space-y-1">
                                        <p>Bank: <span className="font-medium text-slate-900">{BANK_ACCOUNT_INFO.bankName}</span></p>
                                        <p>Account Number: <span className="font-mono font-medium text-slate-900">{BANK_ACCOUNT_INFO.accountNumber}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-xl p-4 flex gap-4 items-start">
                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-800 leading-relaxed">
                                <strong>One-time fee:</strong> You will never be charged again to keep your video live.
                                This fee helps us maintain the platform and verify serious candidates.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Upload Form */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                        <h3 className="text-xl font-bold text-slate-900 mb-6">Submit Payment Proof</h3>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Amount Display */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Amount to Pay</label>
                                <div className="text-2xl font-black text-slate-900">PKR {PAYMENT_AMOUNTS.video_upload.toLocaleString()}</div>
                            </div>

                            {/* Transaction ID */}
                            <div>
                                <label htmlFor="tid" className="block text-sm font-medium text-slate-700 mb-2">Transaction ID / Reference No.</label>
                                <input
                                    type="text"
                                    id="tid"
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    placeholder="e.g. 12345678"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    required // Made required since it's standard practice
                                />
                            </div>

                            {/* Screenshot Upload */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Screenshot</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:bg-slate-50 transition-colors relative cursor-pointer group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        required
                                    />
                                    <div className="space-y-1 text-center">
                                        {screenshotPreview ? (
                                            <div className="relative w-full h-48 mx-auto">
                                                <Image
                                                    src={screenshotPreview}
                                                    alt="Preview"
                                                    fill
                                                    className="object-contain rounded-lg"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="mx-auto h-12 w-12 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                                <div className="flex text-sm text-slate-600">
                                                    <span className="relative rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                        Upload a file
                                                    </span>
                                                    <p className="pl-1">or drag and drop</p>
                                                </div>
                                                <p className="text-xs text-slate-500">PNG, JPG, WEBP up to 5MB</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {paymentError && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
                                    {paymentError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting || !screenshot || !transactionId}
                                className="w-full flex items-center justify-center py-4 px-8 rounded-full text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02]"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                        Submitting {uploadProgress > 0 && uploadProgress < 100 ? `${uploadProgress}%` : ''}...
                                    </>
                                ) : (
                                    'Submit Payment Proof'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
