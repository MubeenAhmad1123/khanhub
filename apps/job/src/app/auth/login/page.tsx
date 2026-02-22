'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

export default function LoginPage() {
    const router = useRouter();
    const { login, loginWithGoogle, user, loading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Redirect user based on role and payment status
    useEffect(() => {
        if (!loading && user) {
            // Admin gets immediate access
            if (user.role === 'admin') {
                router.push('/admin');
                return;
            }

            // If onboarding not done → finish it first
            if (!user.onboardingCompleted) {
                router.push('/auth/onboarding');
                return;
            }

            // Payment approved → send to correct dashboard
            if (user.paymentStatus === 'approved') {
                router.push(user.role === 'employer' ? '/employer/dashboard' : '/dashboard');
                return;
            }

            // Pending / rejected / missing → payment page
            router.push('/auth/verify-payment');
        }
    }, [user, loading, router]);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email.trim(), password);
            // useEffect handles redirect
        } catch (err: any) {
            setError(err.message || 'Failed to login. Check your email and password.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async (role: 'job_seeker' | 'employer') => {
        setError('');
        setIsLoading(true);
        try {
            await loginWithGoogle(role);
            // useEffect handles redirect
        } catch (err: any) {
            setError(err.message || 'Failed to login with Google.');
        } finally {
            setIsLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
                    <h1 className="text-3xl font-bold text-teal-700">KhanHub Jobs</h1>
                    <p className="text-gray-600 mt-2">Welcome back!</p>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                {/* Email / Password Form */}
                <form onSubmit={handleEmailLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                            placeholder="your@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-teal-600 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm text-gray-600">Remember me</span>
                        </label>
                        <Link href="/auth/reset-password" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                            Forgot password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Logging in...</> : 'Login'}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500">Or continue with</span>
                    </div>
                </div>

                {/* Google Buttons */}
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => handleGoogleLogin('job_seeker')}
                        disabled={isLoading}
                        className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        <GoogleIcon />
                        Google (Job Seeker)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleGoogleLogin('employer')}
                        disabled={isLoading}
                        className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        <GoogleIcon />
                        Google (Employer)
                    </button>
                </div>

                {/* Links */}
                <p className="text-center text-gray-600 mt-6">
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/register" className="text-teal-600 font-semibold hover:text-teal-700">
                        Sign up
                    </Link>
                </p>
                <p className="text-center text-gray-400 text-xs mt-4 italic">
                    Internal System?{' '}
                    <Link href="/admin/login" className="hover:underline">Admin Login</Link>
                </p>
            </div>
        </div>
    );
}