'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@khanhub/auth';

export default function LoginPage() {
    const router = useRouter();
    const { signInWithEmail } = useAuth();
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
            router.push('/surgical'); // Redirect to products after login
        } catch (err: any) {
            setIsLoading(false);
            setError(err.message || 'Login failed. Please check your credentials.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(circle_at_top_right,#f0f9ff,transparent),radial-gradient(circle_at_bottom_left,#e0f2fe,transparent)]">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <Link href="/" className="inline-block mb-6">
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-3xl font-black tracking-tighter text-blue-600">KHAN<span className="text-gray-900">HUB</span></span>
                        </div>
                    </Link>
                    <h2 className="text-3xl font-extrabold text-gray-900 font-outfit">Welcome Back</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Sign in to access your orders and medical profile
                    </p>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 glass">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        required
                                        type="email"
                                        className="block w-full pl-10 px-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all sm:text-sm"
                                        placeholder="Enter your email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-bold text-gray-700">Password</label>
                                    <Link href="/auth/forgot-password" className="text-xs font-bold text-blue-600 hover:text-blue-500">
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        required
                                        type="password"
                                        className="block w-full pl-10 px-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all sm:text-sm"
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
                                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-black rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98] disabled:opacity-70 shadow-lg shadow-blue-500/25"
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

                    <div className="mt-8 pt-8 border-t text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link href="/auth/register" className="font-bold text-blue-600 hover:text-blue-500">
                                Register now
                            </Link>
                        </p>
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 uppercase tracking-widest font-bold">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Secure Enterprise Core</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
