// src/app/auth/signin/page.tsx (CREATE THIS FILE)
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function SignInPage() {
    const { user, loading, signInWithGoogle } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if already signed in
    useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, router]);

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-success-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-neutral-600 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render sign-in form if already authenticated
    if (user) {
        return null;
    }

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            await signInWithGoogle();
            router.push('/');
        } catch (error) {
            console.error('Sign-in error:', error);
            toast.error('Failed to sign in. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-success-50 flex items-center justify-center px-4 py-12">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div
                    className="absolute top-0 left-0 w-full h-full"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233B82F6' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            <div className="relative max-w-md w-full">
                {/* Card */}
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border-2 border-white/50 p-8 md:p-12">
                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30">
                                <Image
                                    src="/logo.webp"
                                    alt="KhanHub Logo"
                                    width={56}
                                    height={56}
                                    className="w-full h-full object-cover rounded-2xl"
                                />
                            </div>
                            <span className="font-display font-bold text-2xl text-neutral-900">
                                Khan<span className="text-primary-600">Hub</span>
                            </span>
                        </Link>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="font-display font-bold text-3xl text-neutral-900 mb-3">
                            Welcome Back
                        </h1>
                        <p className="text-neutral-600">
                            Sign in to access your account and continue with KhanHub
                        </p>
                    </div>

                    {/* Google Sign-In Button */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="w-full group relative px-6 py-4 bg-white hover:bg-gray-50 border-2 border-neutral-200 hover:border-primary-300 rounded-xl font-semibold text-neutral-700 hover:text-neutral-900 transition-all duration-300 flex items-center justify-center gap-3 shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <>
                                {/* Google Icon */}
                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span>Continue with Google</span>
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-neutral-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-neutral-500 font-medium">
                                Powered by Firebase
                            </span>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 text-neutral-600">
                            <svg className="w-5 h-5 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Secure Firebase Authentication</span>
                        </div>
                        <div className="flex items-center gap-3 text-neutral-600">
                            <svg className="w-5 h-5 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>No password required</span>
                        </div>
                        <div className="flex items-center gap-3 text-neutral-600">
                            <svg className="w-5 h-5 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Access all KhanHub services</span>
                        </div>
                    </div>

                    {/* Terms */}
                    <p className="mt-8 text-center text-xs text-neutral-500">
                        By continuing, you agree to our{' '}
                        <Link href="/terms" className="text-primary-600 hover:text-primary-700 font-semibold">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy-policy" className="text-primary-600 hover:text-primary-700 font-semibold">
                            Privacy Policy
                        </Link>
                    </p>
                </div>

                {/* Back to Home */}
                <div className="mt-6 text-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-neutral-600 hover:text-primary-600 transition-colors text-sm font-medium"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Homepage
                    </Link>
                </div>
            </div>
        </div>
    );
}