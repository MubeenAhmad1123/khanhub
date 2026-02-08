'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';

export default function RegisterPage() {
    const router = useRouter();
    const { register, loginWithGoogle, loading } = useAuth();

    const searchParams = useSearchParams();
    const queryRole = searchParams.get('role');

    const [step, setStep] = useState<'role' | 'details'>('role');
    const [role, setRole] = useState<UserRole | null>(null);
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        confirmPassword: '',
        agreeToTerms: false,
    });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleRoleSelection = (selectedRole: UserRole) => {
        setRole(selectedRole);
        setStep('details');
    };

    // Auto-select role if provided in query params
    useState(() => {
        if (queryRole === 'job_seeker' || queryRole === 'employer') {
            setRole(queryRole as any);
            setStep('details');
        }
    });

    const handleGoogleSignup = async (selectedRole: 'job_seeker' | 'employer') => {
        setError('');
        try {
            await loginWithGoogle(selectedRole);
            router.push('/auth/onboarding');
        } catch (err: any) {
            setError(err.message || 'Failed to sign up with Google');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (!formData.agreeToTerms) {
            setError('You must agree to the terms and conditions');
            return;
        }

        if (!role) {
            setError('Please select a role');
            return;
        }

        try {
            await register(
                formData.email.trim(),
                formData.password.trim(),
                formData.displayName.trim(),
                role
            );
            router.push('/auth/onboarding');
        } catch (err: any) {
            setError(err.message || 'Failed to register');
        }
    };

    if (step === 'role') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-teal-700">Join Khanhub Jobs</h1>
                        <p className="text-gray-600 mt-2">Choose how you want to get started</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Job Seeker Card */}
                        <div
                            onClick={() => handleRoleSelection('job_seeker')}
                            className="border-2 border-gray-200 rounded-xl p-8 hover:border-teal-500 hover:shadow-lg transition cursor-pointer"
                        >
                            <div className="text-5xl mb-4">🎯</div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-3">I'm looking for a job</h3>
                            <p className="text-gray-600 mb-4">
                                Find your dream job in Pakistan's top companies
                            </p>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>✓ Browse thousands of jobs</li>
                                <li>✓ Get matched with relevant positions</li>
                                <li>✓ Track your applications</li>
                                <li>✓ Upload CV & intro video</li>
                            </ul>
                            <div className="mt-6 text-sm text-teal-600 font-semibold">
                                Rs. 1,000 registration fee (10 free applications)
                            </div>
                        </div>

                        {/* Employer Card */}
                        <div
                            onClick={() => handleRoleSelection('employer')}
                            className="border-2 border-gray-200 rounded-xl p-8 hover:border-teal-500 hover:shadow-lg transition cursor-pointer"
                        >
                            <div className="text-5xl mb-4">🏢</div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-3">I'm hiring</h3>
                            <p className="text-gray-600 mb-4">
                                Find the perfect candidates for your company
                            </p>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>✓ Post unlimited jobs (FREE)</li>
                                <li>✓ Review qualified candidates</li>
                                <li>✓ See match scores</li>
                                <li>✓ Manage applications easily</li>
                            </ul>
                            <div className="mt-6 text-sm text-green-600 font-semibold">
                                FREE to post jobs!
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-gray-600 mt-8">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-teal-600 font-semibold hover:text-teal-700">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                {/* Back Button */}
                <button
                    onClick={() => setStep('role')}
                    className="text-gray-600 hover:text-gray-800 mb-6 flex items-center gap-2"
                >
                    ← Back to role selection
                </button>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-teal-700">Create Account</h1>
                    <p className="text-gray-600 mt-2">
                        {role === 'job_seeker' ? 'Find your dream job' : 'Start hiring today'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="Muhammad Ali"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="your@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            required
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="••••••••"
                        />
                    </div>

                    <label className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            required
                            checked={formData.agreeToTerms}
                            onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                            className="mt-1"
                        />
                        <span className="text-sm text-gray-600">
                            I agree to the{' '}
                            <Link href="/terms" className="text-teal-600 hover:text-teal-700">
                                Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link href="/privacy" className="text-teal-600 hover:text-teal-700">
                                Privacy Policy
                            </Link>
                        </span>
                    </label>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500">Or continue with</span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => handleGoogleSignup(role as 'job_seeker' | 'employer')}
                    disabled={loading}
                    className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign up with Google
                </button>

                <p className="text-center text-gray-600 mt-6">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="text-teal-600 font-semibold hover:text-teal-700">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
}