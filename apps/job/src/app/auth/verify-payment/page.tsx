'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePayment } from '@/hooks/usePayment';
import { PaymentMethod } from '@/types/payment';

export default function VerifyPaymentPage() {
    const router = useRouter();
    const { user, refreshProfile } = useAuth();
    const { submitPayment, submitting } = usePayment();

    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [transactionId, setTransactionId] = useState('');
    const [method, setMethod] = useState<PaymentMethod>('jazzcash');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!user) {
            router.push('/auth/login');
            return;
        }
        if (user.paymentStatus === 'approved') {
            router.push('/dashboard');
        }
    }, [user, router]);

    const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setScreenshot(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreviewUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!screenshot) {
            setError('Please upload payment screenshot');
            return;
        }

        if (!transactionId.trim()) {
            setError('Please enter transaction ID');
            return;
        }

        try {
            await submitPayment(screenshot, transactionId, 1000, 'registration', method);
            setSuccess(true);
            setTimeout(() => router.push('/dashboard'), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to submit payment');
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Payment Submitted!</h2>
                    <p className="text-gray-600 mb-6">
                        Your payment proof has been submitted. We'll review it within 30 minutes.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-yellow-800">You'll receive an email once approved.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-teal-700 mb-2">Payment Verification</h1>
                    <p className="text-gray-600">Rs. 1,000 Registration Fee | Approved within 30 minutes</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-8">
                    <h3 className="font-bold text-teal-800 mb-3">Payment Instructions:</h3>

                    {method === 'jazzcash' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
                                <div className="text-3xl">📱</div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-black">JazzCash Number</p>
                                    <p className="text-xl font-black text-teal-600">0322-4467554</p>
                                    <p className="text-xs text-gray-400">Title: Mubeen Ahmad</p>
                                </div>
                            </div>
                            <ol className="space-y-2 text-sm text-teal-700">
                                <li>1. Open JazzCash App or dial *786#</li>
                                <li>2. Send <strong>Rs. 1,000</strong> to the number above</li>
                                <li>3. Take a screenshot of the digital receipt</li>
                                <li>4. Enter your Transaction ID and upload screenshot below</li>
                            </ol>
                        </div>
                    )}

                    {method === 'easypaisa' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
                                <div className="text-3xl">💳</div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-black">EasyPaisa Number</p>
                                    <p className="text-xl font-black text-teal-600">0322-4467554</p>
                                    <p className="text-xs text-gray-400">Title: Mubeen Ahmad</p>
                                </div>
                            </div>
                            <ol className="space-y-2 text-sm text-teal-700">
                                <li>1. Open EasyPaisa App or dial *786#</li>
                                <li>2. Send <strong>Rs. 1,000</strong> to the number above</li>
                                <li>3. Take a screenshot of the digital receipt</li>
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
                                    <span className="font-bold">Mubeen Ahmad</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400">IBAN / ACC#</span>
                                    <span className="font-black text-teal-600 tracking-wider">PK12 HBL 0000 1234 5678 90</span>
                                </div>
                            </div>
                            <ol className="space-y-2 text-sm text-teal-700">
                                <li>1. Transfer <strong>Rs. 1,000</strong> via Banking App or ATM</li>
                                <li>2. Download/Screenshot the successful transaction screen</li>
                                <li>3. Enter your Reference/Transaction ID below</li>
                                <li>4. Upload the proof of payment</li>
                            </ol>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
                        <div className="grid grid-cols-3 gap-4">
                            {(['jazzcash', 'easypaisa', 'bank_transfer'] as PaymentMethod[]).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setMethod(m)}
                                    className={`p-4 border-2 rounded-lg transition ${method === m ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Transaction ID
                        </label>
                        <input
                            type="text"
                            required
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            placeholder="TXN12345678"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Screenshot
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        {previewUrl && (
                            <div className="mt-4">
                                <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-contain rounded-lg border" />
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-teal-600 text-white py-4 rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50"
                    >
                        {submitting ? 'Submitting...' : 'Submit for Verification'}
                    </button>
                </form>
            </div>
        </div>
    );
}