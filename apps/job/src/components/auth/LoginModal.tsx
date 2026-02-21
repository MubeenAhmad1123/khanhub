'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, X } from 'lucide-react';

export default function LoginModal() {
    const router = useRouter();
    const { login, loginWithGoogle, user, loading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        // Only show if user is NOT logged in
        const seen = localStorage.getItem('hasSeenLoginModal');

        if (!user && !seen) {
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [user]);

    // Redirection logic after login within modal
    useEffect(() => {
        if (user && isOpen) {
            handlePostLoginNavigation();
            setIsOpen(false);
        }
    }, [user, isOpen]);

    const handlePostLoginNavigation = () => {
        if (!user) return;

        // Admin gets immediate access
        if (user.role === 'admin') {
            router.push('/admin');
            return;
        }

        // Check onboarding status first for both Job Seekers and Employers
        if (!user.onboardingCompleted) {
            router.push('/auth/onboarding');
            return;
        }

        // Standard redirects
        if (user.role === 'employer') {
            router.push('/employer/dashboard');
        } else {
            // Job seeker flow
            if (user.paymentStatus === 'approved') {
                router.push('/dashboard');
            } else {
                router.push('/auth/verify-payment');
            }
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('hasSeenLoginModal', 'true');
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await login(email.trim(), password);
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to login');
        }
    };

    const handleGoogleLogin = async (role: 'job_seeker' | 'employer') => {
        setError('');
        try {
            await loginWithGoogle(role);
        } catch (err: any) {
            console.error('Google login error:', err);
            setError(err.message || 'Failed to login with Google');
        }
    };

    if (!isOpen || user) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto animate-in zoom-in-95 duration-300 relative">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-8">
                    {/* Logo/Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-black text-teal-700 italic">Khanhub <span className="text-slate-900 not-italic">Jobs</span></h2>
                        <p className="text-gray-600 mt-2 font-medium">Welcome back!</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none"
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

                        <div className="flex items-center justify-between py-1">
                            <label className="flex items-center cursor-pointer group">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                                <span className="ml-2 text-sm text-gray-500 group-hover:text-gray-700 font-medium">Remember me</span>
                            </label>
                            <Link href="/auth/reset-password" onClick={handleClose} className="text-sm font-bold text-teal-600 hover:text-teal-700">
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-teal-600 text-white h-12 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-teal-700 transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-100"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase tracking-widest font-black text-slate-300 bg-white px-4">
                            Or continue with
                        </div>
                    </div>

                    {/* Google Login Options */}
                    <div className="grid grid-cols-1 gap-3">
                        <button
                            type="button"
                            onClick={() => handleGoogleLogin('job_seeker')}
                            disabled={loading}
                            className="flex items-center justify-center gap-3 w-full h-12 border-2 border-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 group"
                        >
                            <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="text-sm">Google (Job Seeker)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleGoogleLogin('employer')}
                            disabled={loading}
                            className="flex items-center justify-center gap-3 w-full h-12 border-2 border-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 group"
                        >
                            <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="text-sm">Google (Employer)</span>
                        </button>
                    </div>

                    {/* Footer Links */}
                    <div className="mt-8 text-center space-y-4">
                        <p className="text-sm text-gray-500 font-medium">
                            Don't have an account?{' '}
                            <Link href="/auth/register" onClick={handleClose} className="text-teal-600 font-bold hover:underline">
                                Sign up
                            </Link>
                        </p>

                        <div className="pt-4 border-t border-slate-50">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                                Internal System? <Link href="/admin/login" onClick={handleClose} className="text-slate-400 hover:text-teal-600 transition-colors">Admin Login</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
