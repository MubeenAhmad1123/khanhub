'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            alert('Please enter your email');
            return;
        }

        try {
            setLoading(true);

            const { sendPasswordResetEmail } = await import('firebase/auth');
            const { auth } = await import('@/lib/firebase/config');

            await sendPasswordResetEmail(auth, email);

            setSent(true);
        } catch (error: any) {
            console.error('Reset password error:', error);

            if (error.code === 'auth/user-not-found') {
                alert('No account found with this email');
            } else if (error.code === 'auth/invalid-email') {
                alert('Invalid email address');
            } else {
                alert('Failed to send reset email. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h2>
                    <p className="text-gray-600 mb-6">
                        We've sent a password reset link to <strong>{email}</strong>.
                        Please check your inbox and follow the instructions to reset your password.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => setSent(false)}
                            className="w-full bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium"
                        >
                            Send Again
                        </button>
                        <Link
                            href="/auth/login"
                            className="block w-full text-center border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
                    <p className="mt-2 text-gray-600">
                        Enter your email and we'll send you a link to reset your password
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white rounded-lg shadow-lg p-8">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="your.email@example.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-600 text-white px-4 py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>

                    <div className="text-center">
                        <Link
                            href="/auth/login"
                            className="text-teal-600 hover:text-teal-700 font-medium"
                        >
                            ← Back to Login
                        </Link>
                    </div>
                </form>

                {/* Info */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-blue-700">
                                If you don't receive an email within a few minutes, please check your spam folder.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}