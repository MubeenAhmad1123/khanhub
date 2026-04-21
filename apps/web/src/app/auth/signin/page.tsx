'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { loginUniversal } from '@/lib/hq/auth/universalAuth';
import { isSuperadminEmail } from '@/lib/hq/auth/superadminWhitelist';
import { provisionSuperadminAndSetSession } from '@/app/hq/actions/auth';
import { Info, Lock, User as UserIcon, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

export default function SignInPage() {
    const { user, loading, signInWithGoogle } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [authType, setAuthType] = useState<'google' | 'id'>('google');

    // Universal Login States
    const [customId, setCustomId] = useState('');
    const [password, setPassword] = useState('');

    // Redirect if already signed in (as regular user, not superadmin)
    useEffect(() => {
        if (user && !isSuperadminEmail(user.email)) {
            console.log('[SignInPage] Firebase user detected, redirecting to /');
            router.push('/');
        }
    }, [user, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Verifying Session...</p>
                </div>
            </div>
        );
    }

    if (user && !isSuperadminEmail(user.email)) return null;

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            const firebaseUser = await signInWithGoogle();
            if (!firebaseUser) {
                toast.error('Sign-in was cancelled.');
                return;
            }

            // ── Superadmin whitelist check ──────────────────────────────
            if (isSuperadminEmail(firebaseUser.email)) {
                // Get ID token and provision via Server Action (bypasses Firestore rules)
                const idToken = await firebaseUser.getIdToken();
                const result = await provisionSuperadminAndSetSession(idToken);

                if (!result.success) {
                    toast.error(result.error || 'Failed to set up admin session.');
                    return;
                }

                // Set local HQ session from what the server returned
                const session = {
                    uid: firebaseUser.uid,
                    customId: result.session?.customId || 'SUPER-ADMIN',
                    name: result.session?.name || firebaseUser.displayName || 'Super Admin',
                    role: 'superadmin',
                    loginTime: Date.now(),
                    email: firebaseUser.email,
                    photoUrl: firebaseUser.photoURL,
                };
                localStorage.setItem('hq_session', JSON.stringify(session));
                localStorage.setItem('hq_login_time', Date.now().toString());

                toast.success('Welcome, Super Admin!');
                window.location.href = '/hq/dashboard/superadmin';
                return;
            }

            // Regular Google user — send to main site
            router.push('/');
        } catch (error) {
            console.error('Sign-in error:', error);
            toast.error('Failed to sign in. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUniversalLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customId || !password) {
            toast.error('Please enter both User ID and Password');
            return;
        }

        setIsLoading(true);
        try {
            console.log('[SignInPage] Initiating universal login for:', customId);
            const result = await loginUniversal(customId, password);
            console.log('[SignInPage] Login result:', result);
            if (result.success) {
                toast.success('Successfully logged in!');
                if (result.redirectUrl) {
                    console.log('[SignInPage] Proceeding to redirect:', result.redirectUrl);
                    window.location.href = result.redirectUrl;
                }
            } else {
                toast.error(result.error || 'Invalid credentials');
            }
        } catch (error) {
            console.error('[SignInPage] Universal login error:', error);
            toast.error('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-400/20 blur-[120px] rounded-full" />
            </div>

            <div className="relative max-w-lg w-full">
                {/* Branding Section */}
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6">
                        <Link href="/" className="group flex flex-col items-center">
                            <div className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-500/20 transition-transform group-hover:scale-105 duration-500">
                                <Image
                                    src="/logo.webp"
                                    alt="Khan Hub"
                                    width={80}
                                    height={80}
                                    className="w-16 h-16 object-contain rounded-2xl"
                                />
                            </div>
                            <h2 className="mt-4 font-black text-3xl tracking-tighter text-gray-900">
                                Khan<span className="text-blue-600">Hub</span>
                            </h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mt-1">Universal Access Portal</p>
                        </Link>
                    </div>
                </div>

                {/* Main Auth Card */}
                <div className="bg-white/70 backdrop-blur-2xl rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white/80 p-8 md:p-12 transition-all duration-500">

                    {/* Method Toggle */}
                    <div className="flex p-1 bg-gray-100 rounded-2xl mb-8">
                        <button
                            onClick={() => setAuthType('google')}
                            className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${authType === 'google' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            Google Sign-in
                        </button>
                        <button
                            onClick={() => setAuthType('id')}
                            className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${authType === 'id' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            User ID &amp; Pass
                        </button>
                    </div>

                    {authType === 'google' ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center">
                                <h3 className="text-xl font-black text-gray-900">Secure Access</h3>
                                <p className="text-gray-500 text-sm mt-2">Continue with your official Google account</p>
                            </div>

                            {/* Superadmin notice */}
                            <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                                <ShieldCheck size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                                <p className="text-[11px] font-medium text-indigo-700 leading-relaxed">
                                    HQ Superadmin access is granted via Google only. Only authorized accounts will be directed to the admin portal.
                                </p>
                            </div>

                            <button
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                                className="w-full group relative px-6 py-5 bg-white hover:bg-gray-50 border-2 border-gray-100 hover:border-blue-200 rounded-[1.5rem] font-bold text-gray-700 hover:text-gray-900 transition-all duration-300 flex items-center justify-center gap-4 shadow-sm hover:shadow-xl disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                ) : (
                                    <span className="flex items-center gap-4">
                                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Continue with Google
                                    </span>
                                )}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleUniversalLogin} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-4">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <UserIcon size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="User ID (e.g. REHAB-STF-001)"
                                        value={customId}
                                        onChange={(e) => setCustomId(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-2xl py-5 pl-14 pr-5 font-bold text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                                        required
                                    />
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-2xl py-5 pl-14 pr-5 font-bold text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full group py-5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-2xl font-black text-white shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:translate-y-0"
                            >
                                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                    <>
                                        Sign In to Department
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Footer Info */}
                    <div className="mt-10 pt-8 border-t border-gray-100">
                        <div className="flex items-start gap-3 bg-blue-50/50 p-4 rounded-2xl">
                            <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-[11px] font-medium text-blue-800/70 leading-relaxed italic">
                                Use your departmental credentials provided by the administrator. Universal login supports all staff, managers, and specialized roles across 7 departments.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Secondary Links */}
                <div className="mt-8 flex justify-center gap-8">
                    <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors">Home</Link>
                    <Link href="/terms" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors">Terms</Link>
                    <Link href="/privacy" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors">Privacy</Link>
                </div>
            </div>
        </div>
    );
}
