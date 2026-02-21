'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { Eye, EyeOff } from 'lucide-react';

const ADMIN_WHITELIST = [
    'khanhubnetwork@gmail.com',
    'mubeenahma1123@gmail.com',
    'khanhub27@gmail.com',
    'mubeenahmad1123@gmail.com'
];

export default function AdminLoginPage() {
    const router = useRouter();
    const { login, user, loading, refreshProfile } = useAuth();

    const [accessCode, setAccessCode] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [step, setStep] = useState(1); // 1: Secret Code, 2: Email/Password
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const VALID_SECRET = 'KHANHUB2026';


    // If already logged in as admin, redirect
    useEffect(() => {
        if (!loading && user?.role === 'admin') {
            console.log('Already admin, redirecting to dashboard');
            router.push('/admin');
        }
    }, [user, loading, router]);

    const handleVerifyCode = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (accessCode.trim() !== VALID_SECRET) {
            setError('Invalid Admin Access Code');
            return;
        }

        setStep(2);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!ADMIN_WHITELIST.includes(email.toLowerCase().trim())) {
            setError('Access Denied: This email is not authorized to access admin panel.');
            return;
        }

        try {
            setIsProcessing(true);
            await login(email, password);
        } catch (err: any) {
            console.error('Admin login error:', err);

            if (err.code === 'auth/invalid-credential') {
                setError('Invalid email or password for this personal account. Please check your credentials or register first if you haven\'t created an account yet.');
            } else if (err.code === 'auth/user-not-found') {
                setError('No account found with this email. Please register as a user first using this whitelisted email.');
            } else {
                setError(err.message || 'Failed to authenticate');
            }

            setIsProcessing(false);
        }
    };

    // Promotion logic for whitelisted users
    useEffect(() => {
        const checkAndPromote = async () => {
            if (user && user.role !== 'admin' && ADMIN_WHITELIST.includes(user.email.toLowerCase())) {
                try {
                    setIsProcessing(true);
                    await updateDoc(doc(db, 'users', user.uid), {
                        role: 'admin',
                        paymentStatus: 'approved',
                        isPremium: true
                    });
                    console.log('✅ Whitelisted user promoted to admin in Firestore');

                    // CRITICAL: Refresh the local auth state so isAdmin becomes true
                    await refreshProfile();
                    console.log('✅ Local auth profile refreshed');
                } catch (error) {
                    console.error('Error promoting whitelisted user:', error);
                    setError('Failed to update admin role. Please contact system administrator.');
                    setIsProcessing(false);
                }
            }
        };

        if (user) {
            checkAndPromote();
        }
    }, [user, refreshProfile]);

    // Show loading
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                    <h2 className="text-2xl font-bold text-white">Loading...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="inline-block p-3 bg-teal-100 rounded-2xl mb-4">
                        <span className="text-3xl">🛡️</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800">Admin Portal</h1>
                    <p className="text-slate-500 mt-2">Khanhub Jobs Management</p>
                    <div className="flex justify-center gap-2 mt-4">
                        <div className={`h-1.5 w-6 rounded-full transition-colors ${step === 1 ? 'bg-teal-500' : 'bg-slate-200'}`}></div>
                        <div className={`h-1.5 w-6 rounded-full transition-colors ${step === 2 ? 'bg-teal-500' : 'bg-slate-200'}`}></div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
                        {error}
                    </div>
                )}

                {/* Step 1: Secret Code */}
                {step === 1 && (
                    <form onSubmit={handleVerifyCode} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Admin Access Code
                            </label>
                            <input
                                type="password"
                                required
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-center text-2xl tracking-[0.5em]"
                                placeholder="••••••••"
                            />
                            <p className="text-xs text-slate-400 mt-2 text-center">
                                Enter the master administrative secret
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-700 transition flex items-center justify-center gap-2"
                        >
                            Continue to Login
                        </button>
                    </form>
                )}

                {/* Step 2: Email/Password */}
                {step === 2 && (
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Admin Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                                placeholder="name@example.com"
                                disabled={isProcessing}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 pr-12 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••"
                                    disabled={isProcessing}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Authenticating...
                                </>
                            ) : (
                                'Verify & Enter Dashboard'
                            )}
                        </button>

                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                            <span className="text-xl">💡</span>
                            <div className="text-xs text-blue-700 leading-relaxed">
                                <strong>Important:</strong> You must use the password of your <strong>personal KhanHub account</strong>. If you haven't created an account for this email yet, please <Link href="/auth/register" className="underline font-bold">Register here</Link> first.
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setStep(1);
                                setError('');
                            }}
                            className="w-full text-slate-500 text-sm font-medium hover:text-slate-700 transition"
                        >
                            ← Back to Access Code
                        </button>
                    </form>
                )}

                {/* Footer Links */}
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <Link href="/auth/login" className="text-sm text-teal-600 font-medium hover:text-teal-700">
                        Go to User Login
                    </Link>
                </div>
            </div>
        </div>
    );
}