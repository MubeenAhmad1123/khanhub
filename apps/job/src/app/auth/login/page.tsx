'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

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
    const { login, loginWithGoogle, user, isAuthenticated, loading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/feed');
        }
    }, [isAuthenticated, router]);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email.trim(), password);
        } catch (err: any) {
            setError(err.message || 'Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async (role: 'job_seeker' | 'employer') => {
        setError('');
        setIsLoading(true);
        try {
            await loginWithGoogle(role);
        } catch (err: any) {
            setError(err.message || 'Google login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-6 selection:bg-[#FF0069] selection:text-white">
            <div className="max-w-md w-full space-y-12">
                {/* Logo Section */}
                <div className="text-center">
                    <h1 className="text-5xl font-black font-syne tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-[#FF0069] to-[#7638FA]">
                        JOBREEL
                    </h1>
                    <p className="text-[#888888] font-dm-sans uppercase tracking-[0.3em] text-[10px] mt-2">
                        Welcome Back to the Feed
                    </p>
                </div>

                <div className="bg-[#0D0D0D] p-8 md:p-10 rounded-[32px] border border-[#1F1F1F] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF0069]/5 blur-[60px] rounded-full" />

                    <h2 className="text-xl font-black font-syne uppercase tracking-tight mb-8">
                        Login
                    </h2>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-[#888888] ml-1">Email</label>
                            <div className="relative group/input">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888888] group-focus-within/input:text-[#FF0069] transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ali@example.com"
                                    className="w-full bg-black border border-[#1F1F1F] rounded-xl pl-12 pr-4 py-4 focus:border-[#FF0069] outline-none transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-[#888888] ml-1">Password</label>
                            <div className="relative group/input">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888888] group-focus-within/input:text-[#FF0069] transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-black border border-[#1F1F1F] rounded-xl pl-12 pr-12 py-4 focus:border-[#FF0069] outline-none transition-all font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888] hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-5 rounded-[20px] font-black font-syne uppercase italic tracking-[0.2em] text-sm bg-gradient-to-r from-[#FF0069] to-[#7638FA] hover:shadow-[0_0_30px_rgba(255,0,105,0.3)] transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    Enter Feed
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#1F1F1F]" /></div>
                        <div className="relative flex justify-center text-[10px] font-black uppercase text-[#888888] tracking-widest bg-[#0D0D0D] px-4">OR FAST TRACK</div>
                    </div>

                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => handleGoogleLogin('job_seeker')}
                            className="w-full py-4 bg-black border border-[#1F1F1F] rounded-xl font-bold text-sm hover:border-[#888888] transition-all flex items-center justify-center gap-3"
                        >
                            <GoogleIcon />
                            Sign in with Google
                        </button>
                    </div>
                </div>

                <p className="text-center text-[#888888] font-dm-sans text-sm">
                    New here? <Link href="/auth/register" className="text-[#FF0069] font-bold hover:underline">Create Account</Link>
                </p>
            </div>
        </div>
    );
}
