'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function HomePage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [showFeatures, setShowFeatures] = useState(false);

    // Authenticated users stay on the landing page but see a "Go to Dashboard" button
    // No more automatic redirect from here

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    // Removed auto-redirect early return

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50">
            {/* Navigation Bar */}
            <nav className="bg-white shadow-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-teal-600">KhanHub</h1>
                            <span className="ml-2 text-sm text-gray-500">Pakistan's #1 Job Portal</span>
                        </div>
                        <div className="flex gap-4">
                            {user ? (
                                <Link
                                    href={user.role === 'admin' ? '/admin' : user.role === 'employer' ? '/employer/dashboard' : '/dashboard'}
                                    className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-md"
                                >
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/auth/login"
                                        className="px-6 py-2 text-teal-600 font-medium hover:bg-teal-50 rounded-lg transition-colors"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href="/auth/register"
                                        className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-md"
                                    >
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center mb-16">
                    <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                        Find Your Dream Job
                        <br />
                        <span className="text-teal-600">In Pakistan</span>
                    </h1>
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                        {user ? (
                            <Link
                                href={user.role === 'admin' ? '/admin' : user.role === 'employer' ? '/employer/dashboard' : '/dashboard'}
                                className="px-8 py-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-lg text-lg"
                            >
                                🚀 Go to My Workspace
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/auth/register?role=job_seeker"
                                    className="px-8 py-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-lg text-lg text-center"
                                >
                                    🎯 Join as Job Seeker
                                </Link>
                                <Link
                                    href="/auth/register?role=employer"
                                    className="px-8 py-4 bg-jobs-dark text-white font-semibold rounded-lg hover:bg-black transition-colors shadow-lg text-lg text-center"
                                >
                                    🏢 Join as Hiring Person
                                </Link>
                            </>
                        )}
                        <button
                            onClick={() => setShowFeatures(!showFeatures)}
                            className="px-8 py-4 border-2 border-teal-600 text-teal-600 font-semibold rounded-lg hover:bg-teal-50 transition-colors text-lg"
                        >
                            Learn More
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-20">
                    <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                        <div className="text-4xl font-bold text-teal-600 mb-2">10K+</div>
                        <div className="text-gray-600">Active Jobs</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                        <div className="text-4xl font-bold text-teal-600 mb-2">50K+</div>
                        <div className="text-gray-600">Job Seekers</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                        <div className="text-4xl font-bold text-teal-600 mb-2">5K+</div>
                        <div className="text-gray-600">Companies</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                        <div className="text-4xl font-bold text-teal-600 mb-2">95%</div>
                        <div className="text-gray-600">Success Rate</div>
                    </div>
                </div>

                {/* Features */}
                {showFeatures && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                        <div className="bg-white rounded-lg shadow-lg p-8">
                            <div className="text-5xl mb-4">🎯</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Powered Matching</h3>
                            <p className="text-gray-600">
                                Get matched with jobs based on your skills, experience, and location.
                                Our algorithm finds your perfect fit with 95% accuracy.
                            </p>
                        </div>
                        <div className="bg-white rounded-lg shadow-lg p-8">
                            <div className="text-5xl mb-4">⚡</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Applications</h3>
                            <p className="text-gray-600">
                                Upload your CV once and apply to multiple jobs instantly.
                                Track all your applications in one dashboard.
                            </p>
                        </div>
                        <div className="bg-white rounded-lg shadow-lg p-8">
                            <div className="text-5xl mb-4">✅</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Verified Employers</h3>
                            <p className="text-gray-600">
                                All companies are verified by our team. Apply with confidence
                                knowing you're dealing with legitimate employers.
                            </p>
                        </div>
                    </div>
                )}

                {/* How It Works */}
                <div className="bg-white rounded-2xl shadow-2xl p-12 mb-20">
                    <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
                        How It Works
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center text-2xl font-bold text-teal-600 mx-auto mb-4">
                                1
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Register</h3>
                            <p className="text-gray-600 text-sm">
                                Create your account and choose your role
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center text-2xl font-bold text-teal-600 mx-auto mb-4">
                                2
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Upload CV</h3>
                            <p className="text-gray-600 text-sm">
                                Add your resume and complete your profile
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center text-2xl font-bold text-teal-600 mx-auto mb-4">
                                3
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Get Matched</h3>
                            <p className="text-gray-600 text-sm">
                                Our AI finds the best jobs for you
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center text-2xl font-bold text-teal-600 mx-auto mb-4">
                                4
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Get Hired</h3>
                            <p className="text-gray-600 text-sm">
                                Apply and land your dream job
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="bg-gradient-to-r from-teal-600 to-blue-600 rounded-2xl shadow-2xl p-12 text-center text-white">
                    <h2 className="text-4xl font-bold mb-4">Ready to Start?</h2>
                    <p className="text-xl mb-8 opacity-90">
                        Join Pakistan's fastest-growing job platform today
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Link
                            href="/auth/register"
                            className="px-8 py-4 bg-white text-teal-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg text-lg"
                        >
                            Sign Up as Job Seeker
                        </Link>
                        <Link
                            href="/auth/register"
                            className="px-8 py-4 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800 transition-colors shadow-lg text-lg"
                        >
                            Post Jobs as Employer
                        </Link>
                    </div>
                </div>

                {/* Pricing */}
                <div className="mt-20">
                    <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
                        Simple Pricing
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Free Plan */}
                        <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Basic</h3>
                            <div className="text-4xl font-bold text-teal-600 mb-4">
                                Rs. 1,000
                                <span className="text-lg text-gray-500 font-normal">/one-time</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>10 Job Applications</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>CV Upload & Parsing</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>AI Job Matching</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>Application Tracking</span>
                                </li>
                            </ul>
                            <Link
                                href="/auth/register"
                                className="block w-full text-center px-6 py-3 border-2 border-teal-600 text-teal-600 font-semibold rounded-lg hover:bg-teal-50 transition-colors"
                            >
                                Get Started
                            </Link>
                        </div>

                        {/* Premium Plan */}
                        <div className="bg-gradient-to-br from-teal-600 to-blue-600 rounded-lg shadow-2xl p-8 text-white relative">
                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                                POPULAR
                            </div>
                            <h3 className="text-2xl font-bold mb-2">Premium</h3>
                            <div className="text-4xl font-bold mb-4">
                                Rs. 10,000
                                <span className="text-lg opacity-90 font-normal">/month</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-2">
                                    <span className="text-yellow-300">✓</span>
                                    <span>Unlimited Applications</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-yellow-300">✓</span>
                                    <span>Priority Support</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-yellow-300">✓</span>
                                    <span>Featured Profile</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-yellow-300">✓</span>
                                    <span>Full Employer Contact Info</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-yellow-300">✓</span>
                                    <span>Video Introduction</span>
                                </li>
                            </ul>
                            <Link
                                href="/auth/register"
                                className="block w-full text-center px-6 py-3 bg-white text-teal-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                Upgrade Now
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4">KhanHub</h3>
                            <p className="text-gray-400">
                                Pakistan's most trusted job portal connecting talent with opportunity.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">For Job Seekers</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><Link href="/search" className="hover:text-white">Browse Jobs</Link></li>
                                <li><Link href="/auth/register" className="hover:text-white">Create Account</Link></li>
                                <li><Link href="/dashboard/premium" className="hover:text-white">Upgrade Premium</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">For Employers</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><Link href="/employer/post-job" className="hover:text-white">Post a Job</Link></li>
                                <li><Link href="/auth/register" className="hover:text-white">Employer Signup</Link></li>
                                <li><Link href="/employer/dashboard" className="hover:text-white">Dashboard</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Support</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><Link href="#" className="hover:text-white">Help Center</Link></li>
                                <li><Link href="#" className="hover:text-white">Contact Us</Link></li>
                                <li><Link href="#" className="hover:text-white">Privacy Policy</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                        <p>&copy; 2026 KhanHub. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}