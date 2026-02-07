'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Loader2, Car, Phone, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@khanhub/auth';

export default function RegisterPage() {
    const router = useRouter();
    const { signUpWithEmail, signInWithGoogle } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await signUpWithEmail(formData.email, formData.password, formData.name, formData.phoneNumber);
            setIsLoading(false);
            router.push('/');
        } catch (err: any) {
            setIsLoading(false);
            setError(err.message || 'Registration failed.');
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
        <div className="flex-grow flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(circle_at_top_right,#f0fdf4,transparent),radial-gradient(circle_at_bottom_left,#f8fafc,transparent)]">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <Link href="/" className="inline-block mb-6 transition-transform hover:scale-105 active:scale-95">
                        <div className="flex items-center justify-center gap-2">
                            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/30">
                                <Car className="h-8 w-8 text-white" />
                            </div>
                            <span className="text-3xl font-black tracking-tighter text-blue-600">KHAN<span className="text-gray-900">HUB</span></span>
                        </div>
                    </Link>
                    <h2 className="text-3xl font-extrabold text-gray-900">Join Transport</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Create an account to start booking with Khanhub Transport
                    </p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 backdrop-blur-sm bg-white/80">
                    <div className="space-y-4 mb-8">
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-[0.98] disabled:opacity-70 shadow-sm"
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

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></div>
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Full Name</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-blue-600 transition-colors">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all sm:text-sm"
                                        placeholder="Mubeen Ahmad"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-blue-600 transition-colors">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        required
                                        type="email"
                                        className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all sm:text-sm"
                                        placeholder="name@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Phone Number</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-blue-600 transition-colors">
                                        <Phone className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        required
                                        type="tel"
                                        className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all sm:text-sm"
                                        placeholder="+92 3XX XXXXXXX"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-blue-600 transition-colors">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        required
                                        type={showPassword ? "text" : "password"}
                                        className="block w-full pl-12 pr-12 py-4 border border-gray-200 rounded-2xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all sm:text-sm"
                                        placeholder="Minimum 8 characters"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Confirm Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-blue-600 transition-colors">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        required
                                        type={showPassword ? "text" : "password"}
                                        className="block w-full pl-12 pr-12 py-4 border border-gray-200 rounded-2xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all sm:text-sm"
                                        placeholder="Repeat your password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="text-[11px] text-gray-500 py-2 ml-1 leading-relaxed text-center">
                            By clicking "Create Account", you agree to our <Link href="/terms" className="text-blue-600 font-bold hover:underline transition-all">Terms</Link> and <Link href="/privacy" className="text-blue-600 font-bold hover:underline transition-all">Privacy</Link>.
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center py-5 px-4 border border-transparent text-lg font-black rounded-2xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-70 shadow-xl shadow-blue-500/25"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin h-6 w-6" />
                                ) : (
                                    <>
                                        Create Account
                                        <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-10 pt-8 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-600 font-medium">
                            Already have an account?{' '}
                            <Link href="/auth/login" className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4 decoration-blue-500/30 hover:decoration-blue-500 transition-all">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
