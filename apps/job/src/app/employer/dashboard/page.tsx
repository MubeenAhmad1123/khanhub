'use client';

import { useEffect } from 'use';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, Users, Clock, TrendingUp, Plus, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function EmployerDashboardPage() {
    const router = useRouter();
    const { user, profile, loading, isEmployer } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/auth/login');
            } else if (!isEmployer) {
                router.push('/dashboard');
            }
        }
    }, [loading, user, isEmployer, router]);

    if (loading || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-jobs-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-jobs-neutral py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-jobs-dark mb-2">
                        Welcome, {profile.companyName || profile.displayName}! 🏢
                    </h1>
                    <p className="text-jobs-dark/60">
                        Manage your job postings and applications
                    </p>
                </div>

                {/* Quick Post Button */}
                <div className="mb-8">
                    <Link
                        href="/employer/post-job"
                        className="inline-flex items-center gap-2 bg-jobs-accent text-white px-8 py-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-jobs-accent/30"
                    >
                        <Plus className="h-5 w-5" />
                        Post a New Job
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-blue-100 p-3 rounded-xl">
                                <Briefcase className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">0</div>
                        <div className="text-sm text-jobs-dark/60">Active Jobs</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-green-100 p-3 rounded-xl">
                                <Users className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">0</div>
                        <div className="text-sm text-jobs-dark/60">Total Applications</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-yellow-100 p-3 rounded-xl">
                                <Clock className="h-6 w-6 text-yellow-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">0</div>
                        <div className="text-sm text-jobs-dark/60">Pending Review</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-purple-100 p-3 rounded-xl">
                                <TrendingUp className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">0</div>
                        <div className="text-sm text-jobs-dark/60">Total Views</div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Recent Jobs */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-jobs-dark">Your Job Postings</h2>
                                <Link
                                    href="/employer/jobs"
                                    className="text-sm font-bold text-jobs-primary hover:underline"
                                >
                                    View All
                                </Link>
                            </div>

                            <div className="text-center py-12">
                                <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 mb-4">No job postings yet</p>
                                <Link
                                    href="/employer/post-job"
                                    className="inline-flex items-center gap-2 bg-jobs-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition"
                                >
                                    <Plus className="h-5 w-5" />
                                    Post Your First Job
                                </Link>
                            </div>
                        </div>

                        {/* Recent Applications */}
                        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-jobs-dark">Recent Applications</h2>
                                <Link
                                    href="/employer/applications"
                                    className="text-sm font-bold text-jobs-primary hover:underline"
                                >
                                    View All
                                </Link>
                            </div>

                            <div className="text-center py-12">
                                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No applications yet</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Quick Actions & Tips */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                            <h3 className="font-black text-jobs-dark mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <Link
                                    href="/employer/post-job"
                                    className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-jobs-primary hover:bg-jobs-primary/5 transition-all"
                                >
                                    <div className="bg-blue-100 p-2 rounded-lg">
                                        <Plus className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <span className="font-bold text-jobs-dark text-sm">Post New Job</span>
                                </Link>

                                <Link
                                    href="/employer/applications"
                                    className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all"
                                >
                                    <div className="bg-green-100 p-2 rounded-lg">
                                        <Users className="h-5 w-5 text-green-600" />
                                    </div>
                                    <span className="font-bold text-jobs-dark text-sm">View Applications</span>
                                </Link>

                                <Link
                                    href="/employer/profile"
                                    className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all"
                                >
                                    <div className="bg-purple-100 p-2 rounded-lg">
                                        <FileText className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <span className="font-bold text-jobs-dark text-sm">Edit Company Profile</span>
                                </Link>
                            </div>
                        </div>

                        {/* Tips Card */}
                        <div className="bg-gradient-to-br from-jobs-primary to-blue-600 p-6 rounded-3xl shadow-lg text-white">
                            <h3 className="font-black mb-4">💡 Hiring Tips</h3>
                            <div className="space-y-3 text-sm">
                                <p>✓ Write clear, detailed job descriptions</p>
                                <p>✓ List specific skills and requirements</p>
                                <p>✓ Offer competitive salaries</p>
                                <p>✓ Respond to applications quickly</p>
                                <p>✓ Use match scores to find best candidates</p>
                            </div>
                        </div>

                        {/* Commission Info */}
                        <div className="bg-yellow-50 p-6 rounded-3xl border border-yellow-100">
                            <h3 className="font-black text-yellow-900 mb-3">📊 Commission Structure</h3>
                            <p className="text-sm text-yellow-800 mb-3">
                                When you hire a candidate through our platform:
                            </p>
                            <div className="bg-white p-4 rounded-xl">
                                <div className="text-2xl font-black text-jobs-accent">50%</div>
                                <div className="text-xs text-jobs-dark/60">of first month salary</div>
                            </div>
                            <p className="text-xs text-yellow-700 mt-3">
                                You'll receive an invoice after marking a candidate as hired
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
