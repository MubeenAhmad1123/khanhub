'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, CheckCircle, Clock, XCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { usePayment } from '@/hooks/usePayment';
import { validateImage } from '@/lib/firebase/storage';

export default function VerifyPaymentPage() {
    const router = useRouter();
    const { user, profile, loading: authLoading } = useAuth();
    const { submitPayment, submitting } = usePayment(user?.uid || null);

    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [amount, setAmount] = useState<number>(1000);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Redirect if not authenticated
        if (!authLoading && !user) {
            router.push('/auth/login');
        }

        // Redirect if already approved
        if (profile?.registrationApproved) {
            router.push('/dashboard');
        }
    }, [authLoading, user, profile, router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        const validation = validateImage(file);
        if (!validation.valid) {
            setError(validation.error || 'Invalid file');
            return;
        }

        setScreenshot(file);
        setError('');

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!screenshot) {
            setError('Please upload payment screenshot');
            return;
        }

        try {
            await submitPayment('registration', amount, screenshot);
            setSuccess(true);
        } catch (err) {
            setError('Failed to submit payment. Please try again.');
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-jobs-primary" />
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-jobs-neutral px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl text-center">
                    <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-black text-jobs-dark mb-4">Payment Submitted!</h2>
                    <p className="text-jobs-dark/60 mb-8">
                        Your payment is under review. You'll receive an email once it's approved (usually within 24 hours).
                    </p>
                    <Link
                        href="/"
                        className="inline-block bg-jobs-primary text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all"
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-jobs-neutral py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full">
                <div className="text-center mb-8">
                    <div className="bg-jobs-primary p-3 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Upload className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-jobs-dark">Verify Your Payment</h2>
                    <p className="mt-2 text-jobs-dark/60 font-medium">
                        Upload proof of payment to activate your account
                    </p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
                    {/* Payment Instructions */}
                    <div className="bg-blue-50 p-6 rounded-2xl mb-8 border border-blue-100">
                        <h3 className="font-black text-blue-900 mb-3">Payment Instructions</h3>
                        <ol className="space-y-2 text-sm text-blue-800">
                            <li className="flex gap-2">
                                <span className="font-bold">1.</span>
                                <span>Transfer <strong>Rs. 1,000</strong> to JazzCash: <strong>03XX-XXXXXXX</strong></span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold">2.</span>
                                <span>Take a screenshot of the successful transaction</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold">3.</span>
                                <span>Upload the screenshot below</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold">4.</span>
                                <span>Wait for admin approval (usually within 24 hours)</span>
                            </li>
                        </ol>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Amount Selection */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">
                                Payment Amount
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setAmount(1000)}
                                    className={`p-4 rounded-2xl border-2 transition-all ${amount === 1000
                                        ? 'border-jobs-primary bg-jobs-primary/5 font-black'
                                        : 'border-gray-100 hover:border-jobs-primary/30'
                                        }`}
                                >
                                    <div className="text-2xl font-black text-jobs-primary">Rs. 1,000</div>
                                    <div className="text-xs text-jobs-dark/60">Registration Fee</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAmount(10000)}
                                    className={`p-4 rounded-2xl border-2 transition-all ${amount === 10000
                                        ? 'border-jobs-accent bg-jobs-accent/5 font-black'
                                        : 'border-gray-100 hover:border-jobs-accent/30'
                                        }`}
                                >
                                    <div className="text-2xl font-black text-jobs-accent">Rs. 10,000</div>
                                    <div className="text-xs text-jobs-dark/60">Premium (1 Month)</div>
                                </button>
                            </div>
                        </div>

                        {/* Screenshot Upload */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">
                                Upload Payment Screenshot
                            </label>

                            {!previewUrl ? (
                                <label className="block cursor-pointer">
                                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-jobs-primary hover:bg-jobs-primary/5 transition-all">
                                        <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                        <p className="text-sm font-bold text-jobs-dark mb-1">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-jobs-dark/50">
                                            PNG, JPG or WebP (max. 5MB)
                                        </p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </div>
                                </label>
                            ) : (
                                <div className="relative w-full h-96">
                                    <Image
                                        src={previewUrl}
                                        alt="Payment screenshot"
                                        fill
                                        unoptimized
                                        className="object-contain rounded-2xl border-2 border-gray-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setScreenshot(null);
                                            setPreviewUrl(null);
                                        }}
                                        className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors z-10"
                                    >
                                        <XCircle className="h-5 w-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></div>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!screenshot || submitting}
                            className="w-full bg-jobs-accent text-white py-5 rounded-2xl font-black text-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-jobs-accent/25 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-6 w-6" />
                                    Submit for Approval
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-jobs-dark/60">
                            <Clock className="h-4 w-4" />
                            <span>Approval usually takes 12-24 hours</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
