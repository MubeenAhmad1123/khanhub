'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function AdminLoginPage() {
    const router = useRouter();
    const { login, user, loading } = useAuth();

    const [accessCode, setAccessCode] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const MASTER_EMAIL = 'mubeenahmad1123@gmail.com';
    const MASTER_PASSWORD = 'KhanhubAdmin@2026';
    const VALID_SECRET = 'KHANHUB2026';

    // If already logged in as admin, redirect
    useEffect(() => {
        if (!loading && user?.role === 'admin') {
            console.log('Already admin, redirecting to dashboard');
            router.push('/admin');
        }
    }, [user, loading, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate access code
        if (accessCode.trim() !== VALID_SECRET) {
            setError('Invalid Admin Access Code');
            return;
        }

        try {
            setIsProcessing(true);

            // Login with master credentials
            await login(MASTER_EMAIL, MASTER_PASSWORD);

            // After successful login, the useEffect will check role and redirect
            // If role is not admin, we'll show option to update it

        } catch (err: any) {
            console.error('Admin login error:', err);

            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Master admin account not found or wrong password. Please check credentials.');
            } else {
                setError(err.message || 'Failed to authenticate');
            }

            setIsProcessing(false);
        }
    };

    // Helper function to promote current user to admin
    const promoteToAdmin = async () => {
        if (!user) return;

        try {
            setIsProcessing(true);

            await updateDoc(doc(db, 'users', user.uid), {
                role: 'admin',
                paymentStatus: 'approved',
                isPremium: true
            });

            alert('Role updated to admin! Refreshing...');
            window.location.reload();

        } catch (error) {
            console.error('Error promoting to admin:', error);
            setError('Failed to update role. Check Firestore permissions.');
            setIsProcessing(false);
        }
    };

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

    // If logged in but not admin, show promotion option
    if (user && user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                    <div className="text-center mb-8">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h1 className="text-2xl font-bold text-slate-800">Not Admin</h1>
                        <p className="text-slate-500 mt-2">Logged in as: {user.email}</p>
                        <p className="text-sm text-gray-400 mt-1">Current role: {user.role}</p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={promoteToAdmin}
                            disabled={isProcessing}
                            className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition disabled:opacity-50"
                        >
                            {isProcessing ? 'Updating...' : '🔧 Promote to Admin'}
                        </button>

                        <button
                            onClick={async () => {
                                const { signOut } = await import('firebase/auth');
                                const { auth } = await import('@/lib/firebase/config');
                                await signOut(auth);
                                window.location.reload();
                            }}
                            className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition"
                        >
                            Logout & Try Again
                        </button>
                    </div>
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
                </div>

                {/* Error Message */}
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
                            disabled={isProcessing}
                        />
                        <p className="text-xs text-slate-400 mt-2 text-center">
                            Enter your secret administrative password
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Verifying...
                            </>
                        ) : (
                            'Access Admin Dashboard'
                        )}
                    </button>
                </form>

                {/* Debug Info (only in development) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 font-mono mb-2">
                            <strong>Development Mode</strong>
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                            Code: {VALID_SECRET}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                            Email: {MASTER_EMAIL}
                        </p>
                    </div>
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