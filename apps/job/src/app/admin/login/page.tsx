'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLoginPage() {
    const router = useRouter();
    const { login, register, refreshProfile, user, loading } = useAuth();

    const [accessCode, setAccessCode] = useState('');
    const [error, setError] = useState('');
    const [isPromoting, setIsPromoting] = useState(false);

    const MASTER_EMAIL = 'mubeenahmad1123@gmail.com';
    const MASTER_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_MASTER_PASSWORD || 'KhanhubAdmin@2026';
    const VALID_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'KHANHUB2026';

    // Redirect admin to dashboard once authenticated and role is confirmed
    useEffect(() => {
        if (user && user.role === 'admin') {
            console.log('Admin detected, redirecting...');
            router.push('/admin');
        }
    }, [user, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (accessCode.trim() !== VALID_SECRET) {
            setError('Invalid Admin Access Code. Please check your code and try again.');
            return;
        }

        try {
            console.log('Attempting admin login...');
            setIsPromoting(false);

            const { auth } = await import('@/lib/firebase/config');
            const { updateUserProfile: updateProfileHelper } = await import('@/lib/firebase/auth');

            try {
                await login(MASTER_EMAIL, MASTER_PASSWORD);
                console.log('Auth successful.');

                // After login, we must ensure the user has the admin role
                if (auth.currentUser) {
                    setIsPromoting(true);
                    console.log('Promoting user to admin in Firestore...');
                    await updateProfileHelper(auth.currentUser.uid, {
                        role: 'admin',
                        paymentStatus: 'approved',
                        isPremium: true
                    });

                    // Force refresh profile in auth state
                    await refreshProfile();
                    console.log('Profile refreshed.');
                }
            } catch (err: any) {
                console.log('Login or promotion failed, checking reason...', err.code || err.message);

                // If account doesn't exist, create it automatically as Admin
                if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                    console.log('Creating new admin account...');
                    await register(
                        MASTER_EMAIL,
                        MASTER_PASSWORD,
                        'System Admin',
                        'admin'
                    );

                    // Ensure the created profile has all the admin flags
                    if (auth.currentUser) {
                        setIsPromoting(true);
                        await updateProfileHelper(auth.currentUser.uid, {
                            paymentStatus: 'approved',
                            isPremium: true
                        });
                        await refreshProfile();
                    }
                } else if (err.message?.includes('permissions')) {
                    console.error('Permission error during promotion. Redirecting anyway to see if role already exists.');
                } else {
                    throw err;
                }
            }

            setIsPromoting(false);
            console.log('Finalizing redirect...');

            // Explicitly redirect
            router.push('/admin');

            // Hard fallback if not redirected
            setTimeout(() => {
                if (window.location.pathname.includes('/login')) {
                    console.log('Router push failed, using hard redirect.');
                    window.location.href = '/admin';
                }
            }, 1000);
        } catch (err: any) {
            console.error('Admin login error:', err);
            setIsPromoting(false);
            setError(err.message || 'Failed to authenticate admin access.');
        }
    };

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
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6">
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
                            Enter your secret administrative password to access the dashboard.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || isPromoting}
                        className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {(loading || isPromoting) ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                {isPromoting ? 'Setting Up Dashboard...' : 'Verifying Access...'}
                            </>
                        ) : (
                            'Access Admin Dashboard'
                        )}
                    </button>
                </form>

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
