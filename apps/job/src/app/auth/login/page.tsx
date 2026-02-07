'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@khanhub/auth';

export default function LoginPage() {
    const router = useRouter();
    const { signInWithEmail, signInWithGoogle } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await signInWithEmail(formData.email, formData.password);
            setIsLoading(false);
            router.push('/');
        } catch (err: any) {
            setIsLoading(false);
            setError(err.message || 'Login failed. Please check your credentials.');
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError('');
        try {
            await signInWithGoogle();
            setIsLoading(false);
            router.push('/');
        } catch (err: any) {
            setIsLoading(false);
            setError(err.message || 'Google sign-in failed.');
        }
    };

    return (
        <div className="flex-grow flex items-center justify-center bg-jobs-neutral py-12 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(circle_at_top_right,rgba(0,95,105,0.05),transparent),radial-gradient(circle_at_bottom_left,rgba(255,111,97,0.05),transparent)]">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <Link href="/" className="inline-block mb-6 transition-transform hover:scale-105 active:scale-95">
                        <div className="flex items-center justify-center gap-2">
                            <div className="bg-jobs-primary p-2 rounded-xl shadow-lg shadow-jobs-primary/30">
                                <ShieldCheck className="h-8 w-8 text-white" />
                            </div>
                            <span className="text-3xl font-black tracking-tighter text-jobs-primary">KHAN<span className="text-jobs-dark">HUB</span></span>
                        </div>
                    </Link>
                    <h2 className="text-3xl font-extrabold text-jobs-dark">Welcome Back</h2>
                    <p className="mt-2 text-sm text-jobs-dark/60 font-medium">
                        Sign in to access your jobs and profile
                    </p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 backdrop-blur-sm bg-white/80">
                    <div className="space-y-4 mb-8">
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-100 text-jobs-dark py-4 rounded-2xl font-bold hover:bg-jobs-neutral transition-all active:scale-[0.98] disabled:opacity-70 shadow-sm"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-100"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-black">
                                <span className="px-4 bg-white text-gray-400">Or continue with email</span>
                            </div>
                        </div>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></div>
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-jobs-primary transition-colors">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        required
                                        type="email"
                                        className="block w-full pl-12 pr-4 py-4 border border-gray-100 rounded-2xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-jobs-primary/5 focus:border-jobs-primary focus:bg-white transition-all sm:text-sm"
                                        placeholder="Enter your email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2 ml-1">
                                    <label className="block text-sm font-bold text-jobs-dark/80">Password</label>
                                    <Link href="/auth/forgot-password" className="text-xs font-bold text-jobs-primary hover:text-jobs-primary/80 transition-colors">
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-jobs-primary transition-colors">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        required
                                        type="password"
                                        className="block w-full pl-12 pr-4 py-4 border border-gray-100 rounded-2xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-jobs-primary/5 focus:border-jobs-primary focus:bg-white transition-all sm:text-sm"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center py-5 px-4 border border-transparent text-lg font-black rounded-2xl text-white bg-jobs-accent hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-jobs-accent/20 transition-all active:scale-[0.98] disabled:opacity-70 shadow-xl shadow-jobs-accent/25"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin h-6 w-6" />
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-10 pt-8 border-t border-gray-100 text-center">
                        <p className="text-sm text-jobs-dark/60 font-medium">
                            Don't have an account?{' '}
                            <Link href="/auth/register" className="font-bold text-jobs-primary hover:text-jobs-primary/80 underline underline-offset-4 decoration-jobs-primary/30 hover:decoration-jobs-primary transition-all">
                                Register now
                            </Link>
                        </p>
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">
                        <div className="h-px w-8 bg-gray-200"></div>
                        <span>Secure Cloud Core</span>
                        <div className="h-px w-8 bg-gray-200"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
