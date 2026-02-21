'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePayment } from '@/hooks/usePayment';
import { PaymentMethod } from '@/types/payment';
import { Upload, CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';

export default function VerifyPaymentPage() {
    const router = useRouter();
    const { user, loading, refreshProfile } = useAuth();
    const { submitPayment, submitting, uploadProgress, error: paymentError } = usePayment();

    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [transactionId, setTransactionId] = useState('');
    const [method, setMethod] = useState<PaymentMethod>('jazzcash');
    const [senderName, setSenderName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [existingPayment, setExistingPayment] = useState<any>(null);
    const [checkingPayment, setCheckingPayment] = useState(true);

    useEffect(() => {
        const checkExistingPayment = async () => {
            if (user?.uid) {
                try {
                    const paymentRef = doc(db, 'payments', user.uid);
                    const paymentSnap = await getDoc(paymentRef);
                    if (paymentSnap.exists()) {
                        setExistingPayment(paymentSnap.data());
                    }
                } catch (err) {
                    console.error('Error checking existing payment:', err);
                } finally {
                    setCheckingPayment(false);
                }
            } else if (!loading) {
                setCheckingPayment(false);
            }
        };

        if (!loading && !user) {
            router.push('/auth/login');
            return;
        }
        if (!loading && user?.paymentStatus === 'approved') {
            if (user.role === 'employer') {
                router.push('/employer/dashboard');
            } else {
                router.push('/dashboard');
            }
            return;
        }

        checkExistingPayment();

        // Pre-fill sender name with user's display name
        if (user?.displayName) {
            setSenderName(user.displayName);
        }
    }, [user, loading, router]);

    const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError('Please upload a valid image (JPG, PNG, or WebP)');
            return;
        }

        // Validate file size (max 10MB - Cloudinary will handle it)
        if (file.size > 10 * 1024 * 1024) {
            setError('Image size must be less than 10MB');
            return;
        }

        setError('');
        setScreenshot(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!screenshot) {
            setError('Please upload payment screenshot');
            return;
        }

        if (!transactionId.trim()) {
            setError('Please enter transaction ID');
            return;
        }

        if (!senderName.trim()) {
            setError('Please enter sender name');
            return;
        }

        try {
            // ✅ Use Cloudinary upload via usePayment hook
            await submitPayment(
                screenshot,
                transactionId.trim(),
                1000, // Amount
                'registration', // Type
                method,
                '' // User notes (optional)
            );

            setSuccess(true);

            // Refresh user profile to get updated payment status
            setTimeout(async () => {
                await refreshProfile();
                if (user?.role === 'employer') {
                    router.push('/employer/dashboard');
                } else {
                    router.push('/dashboard');
                }
            }, 3000);

        } catch (err: any) {
            console.error('Payment submission error:', err);
            setError(err.message || 'Failed to submit payment. Please try again.');
        }
    };

    // Success state
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-blue-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Submitted!</h2>
                    <p className="text-gray-600 mb-6">
                        Your payment is under review. We'll notify you within 24 hours via email.
                    </p>
                    <div className="space-y-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                        <p>Transaction ID: <span className="font-mono text-gray-900">{transactionId}</span></p>
                        <p>Amount: <span className="font-semibold text-teal-600">Rs. 1,000</span></p>
                        <p>Method: <span className="capitalize">{method.replace('_', ' ')}</span></p>
                    </div>
                    <div className="mt-6">
                        <div className="animate-pulse text-teal-600">Redirecting to dashboard...</div>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading || checkingPayment) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 text-teal-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Checking payment status...</p>
                </div>
            </div>
        );
    }

    // Existing pending payment state
    if (existingPayment && existingPayment.status === 'pending') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-blue-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="h-10 w-10 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification in Progress</h2>
                    <p className="text-gray-600 mb-6">
                        We have received your payment proof (Ref: <span className="font-mono text-gray-900">{existingPayment.transactionId}</span>).
                        Our team is currently verifying it. This usually takes 1-2 hours but can take up to 24 hours.
                    </p>
                    <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 text-left mb-6">
                        <p className="font-bold mb-1">What's next?</p>
                        <p>Once approved, you'll get full access to the dashboard. We'll send you an email confirmation.</p>
                    </div>
                    <button
                        onClick={() => router.push(user?.role === 'employer' ? '/employer/dashboard' : '/dashboard')}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4">
                    <h1 className="text-4xl font-black text-gray-900 mb-2">Complete Registration</h1>
                    <p className="text-gray-600">Submit payment proof to activate your account</p>
                </div>

                {/* Error Alert */}
                {(error || paymentError) && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-red-800">{error || paymentError}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Progress */}
                {submitting && uploadProgress > 0 && (
                    <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-800">
                                {uploadProgress < 100 ? 'Uploading screenshot...' : 'Processing payment...'}
                            </span>
                            <span className="text-sm font-bold text-blue-900">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 animate-in fade-in slide-in-from-bottom-4">
                    {/* Payment Amount */}
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl p-6 mb-6">
                        <div className="text-center">
                            <p className="text-sm font-medium opacity-90 mb-1">Registration Fee</p>
                            <p className="text-5xl font-black tracking-tight">Rs. 1,000</p>
                            <p className="text-sm opacity-75 mt-2">One-time payment • Lifetime access</p>
                        </div>
                    </div>

                    {/* Payment Instructions */}
                    <div className="mb-6">
                        <h3 className="font-bold text-lg text-gray-900 mb-4">📱 Payment Instructions</h3>

                        {method === 'jazzcash' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                                <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-xl border-2 border-red-200">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-500 uppercase font-black">JazzCash Number</p>
                                        <p className="text-xl font-black text-red-600">0310-6395220</p>
                                        <p className="text-xs text-gray-400">Title: Muhammad Khan</p>
                                    </div>
                                </div>
                                <ol className="space-y-2 text-sm text-red-700">
                                    <li>1. Open JazzCash App or dial *786#</li>
                                    <li>2. Send <strong>Rs. 1,000</strong> to the number above</li>
                                    <li>3. Take a screenshot of the confirmation screen</li>
                                    <li>4. Enter your Transaction ID and upload screenshot below</li>
                                </ol>
                            </div>
                        )}

                        {method === 'easypaisa' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                                <div className="bg-gradient-to-br from-green-50 to-teal-50 p-4 rounded-xl border-2 border-green-200">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-500 uppercase font-black">EasyPaisa Number</p>
                                        <p className="text-xl font-black text-teal-600">03106395220</p>
                                        <p className="text-xs text-gray-400">Title: Muhammad Khan</p>
                                    </div>
                                </div>
                                <ol className="space-y-2 text-sm text-teal-700">
                                    <li>1. Open EasyPaisa App or dial *786#</li>
                                    <li>2. Send <strong>Rs. 1,000</strong> to the number above</li>
                                    <li>3. Take a screenshot of the confirmation screen</li>
                                    <li>4. Enter your Transaction ID and upload screenshot below</li>
                                </ol>
                            </div>
                        )}

                        {method === 'bank_transfer' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                                <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                                    <div className="flex justify-between items-center border-b pb-2">
                                        <span className="text-xs font-bold text-gray-400">BANK</span>
                                        <span className="font-bold text-teal-600">HBL Bank</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b pb-2">
                                        <span className="text-xs font-bold text-gray-400">TITLE</span>
                                        <span className="font-bold">Muhammad Khan</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-400">IBAN</span>
                                        <span className="font-black text-teal-600 tracking-wider text-sm">PK12 HBL 1234 5678 90</span>
                                    </div>
                                </div>
                                <ol className="space-y-2 text-sm text-teal-700">
                                    <li>1. Transfer <strong>Rs. 1,000</strong> via Banking App or ATM</li>
                                    <li>2. Take screenshot of successful transaction</li>
                                    <li>3. Enter your Reference/Transaction ID below</li>
                                    <li>4. Upload the proof of payment</li>
                                </ol>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Payment Method Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
                            <div className="grid grid-cols-3 gap-4">
                                {(['jazzcash', 'easypaisa', 'bank_transfer'] as PaymentMethod[]).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setMethod(m)}
                                        className={`p-4 border-2 rounded-lg transition ${method === m ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="text-2xl mb-2">
                                            {m === 'jazzcash' && '📱'}
                                            {m === 'easypaisa' && '💳'}
                                            {m === 'bank_transfer' && '🏦'}
                                        </div>
                                        <div className="text-xs font-medium capitalize">{m.replace('_', ' ')}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sender Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sender Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={senderName}
                                onChange={(e) => setSenderName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="Name on payment account"
                            />
                        </div>

                        {/* Transaction ID */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Transaction ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="TXN12345678 or Reference Number"
                            />
                        </div>

                        {/* Screenshot Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Payment Screenshot <span className="text-red-500">*</span>
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-500 transition">
                                {!previewUrl ? (
                                    <div>
                                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                        <label className="cursor-pointer">
                                            <span className="text-teal-600 font-semibold hover:text-teal-700">
                                                Click to upload
                                            </span>
                                            <span className="text-gray-500"> or drag and drop</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleScreenshotChange}
                                                className="hidden"
                                                required
                                            />
                                        </label>
                                        <p className="text-xs text-gray-500 mt-2">JPG, PNG or WebP (max 10MB)</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Image
                                            src={previewUrl}
                                            alt="Payment Screenshot"
                                            width={500}
                                            height={400}
                                            className="max-h-64 mx-auto rounded-lg border object-contain"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setScreenshot(null);
                                                setPreviewUrl(null);
                                            }}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition"
                                        >
                                            ✕
                                        </button>
                                        <p className="text-sm text-gray-600 mt-2">Click ✕ to change image</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-teal-600 text-white py-4 rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
                                </>
                            ) : (
                                'Submit for Verification'
                            )}
                        </button>
                    </form>

                    {/* Help Text */}
                    <div className="mt-6 text-center text-sm text-gray-500">
                        <p>Need help? Contact us at support@khanhub.pk</p>
                    </div>
                </div>
            </div>
        </div>
    );
}