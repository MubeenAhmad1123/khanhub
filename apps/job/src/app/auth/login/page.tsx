'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
    const router = useRouter();
    const { login, loginWithGoogle, user, loading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Redirect user based on role and payment status
    useEffect(() => {
        if (!loading && user) {
            console.log('=== LOGIN REDIRECT CHECK ===');
            console.log('User:', user.email);
            console.log('Role:', user.role);
            console.log('Onboarding:', user.onboardingCompleted);
            console.log('Payment Status:', user.paymentStatus);
            console.log('===========================');

            // Admin gets immediate access
            if (user.role === 'admin') {
                console.log('→ Redirecting ADMIN to /admin');
                router.push('/admin');
                return;
            }

            // Employer flow
            if (user.role === 'employer') {
                if (!user.onboardingCompleted) {
                    console.log('→ Redirecting EMPLOYER to ONBOARDING');
                    router.push('/auth/onboarding');
                    return;
                }
                console.log('→ Redirecting EMPLOYER to /employer/dashboard');
                router.push('/employer/dashboard');
                return;
            }

            // Job seeker flow - check onboarding first
            if (!user.onboardingCompleted) {
                console.log('→ Redirecting to ONBOARDING (not completed)');
                router.push('/auth/onboarding');
                return;
            }

            // Then check payment status
            if (user.paymentStatus === 'pending') {
                console.log('→ Redirecting to DASHBOARD (payment pending)');
                router.push('/dashboard');
                return;
            }

            if (user.paymentStatus === 'rejected') {
                console.log('→ Redirecting to VERIFY PAYMENT (payment rejected)');
                router.push('/auth/verify-payment');
                return;
            }

            if (user.paymentStatus === 'approved') {
                console.log('→ Redirecting to DASHBOARD (payment approved)');
                router.push('/dashboard');
                return;
            }

            // Default: if no payment status set, go to payment page
            console.log('→ Redirecting to VERIFY PAYMENT (no payment status)');
            router.push('/auth/verify-payment');
        }
    }, [user, loading, router]);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await login(email.trim(), password);
            // Don't redirect here - useEffect will handle it
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to login');
        }
    };

    const handleGoogleLogin = async (role: 'job_seeker' | 'employer') => {
        setError('');

        try {
            await loginWithGoogle(role);
            // Don't redirect here - useEffect will handle it
        } catch (err: any) {
            console.error('Google login error:', err);
            setError(err.message || 'Failed to login with Google');
        }
    };

    // Show loading while checking auth
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg font-semibold">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-teal-700">Khanhub Jobs</h1>
                    <p className="text-gray-600 mt-2">Welcome back!</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleEmailLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="your@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center">
                            <input type="checkbox" className="mr-2" />
                            <span className="text-sm text-gray-600">Remember me</span>
                        </label>
                        <Link href="/auth/reset-password" className="text-sm text-teal-600 hover:text-teal-700">
                            Forgot password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500">Or continue with</span>
                    </div>
                </div>

                {/* Google Login Options */}
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => handleGoogleLogin('job_seeker')}
                        disabled={loading}
                        className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google (Job Seeker)
                    </button>

                    <button
                        type="button"
                        onClick={() => handleGoogleLogin('employer')}
                        disabled={loading}
                        className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google (Employer)
                    </button>
                </div>

                {/* Register Link */}
                <p className="text-center text-gray-600 mt-6">
                    Don't have an account?{' '}
                    <Link href="/auth/register" className="text-teal-600 font-semibold hover:text-teal-700">
                        Sign up
                    </Link>
                </p>

                {/* Admin Setup Link */}
                <p className="text-center text-gray-400 text-xs mt-8 italic">
                    Internal System? <Link href="/admin/login" className="hover:underline">Admin Login</Link>
                </p>
            </div>
        </div>
    );
}