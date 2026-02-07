'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Briefcase,
    FileText,
    Video,
    Award,
    TrendingUp,
    CheckCircle,
    Clock,
    BookmarkPlus,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export default function DashboardPage() {
    const router = useRouter();
    const { user, profile: authProfile, loading, isJobSeeker, registrationApproved } = useAuth();
    const { profile, profileStrength, improvementSteps } = useProfile(user?.uid || null, authProfile);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/auth/login');
            } else if (!isJobSeeker) {
                // Redirect non-job seekers
                if (authProfile?.role === 'employer') {
                    router.push('/employer/dashboard');
                } else if (authProfile?.role === 'admin') {
                    router.push('/admin/dashboard');
                }
            } else if (!registrationApproved) {
                router.push('/auth/verify-payment');
            }
        }
    }, [loading, user, isJobSeeker, registrationApproved, authProfile, router]);

    if (loading || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-jobs-primary" />
            </div>
        );
    }

    const getStrengthColor = (strength: number) => {
        if (strength >= 80) return 'bg-green-500';
        if (strength >= 60) return 'bg-blue-500';
        if (strength >= 40) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getStrengthLabel = (strength: number) => {
        if (strength >= 80) return 'Excellent';
        if (strength >= 60) return 'Good';
        if (strength >= 40) return 'Fair';
        return 'Needs Work';
    };

    return (
        <div className="min-h-screen bg-jobs-neutral py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-jobs-dark mb-2">
                        Welcome back, {profile.displayName}! 👋
                    </h1>
                    <p className="text-jobs-dark/60">
                        Here's your job search dashboard
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-blue-100 p-3 rounded-xl">
                                <Briefcase className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">{profile.freeApplicationsUsed}</div>
                        <div className="text-sm text-jobs-dark/60">Applications Sent</div>
                        <div className="text-xs text-jobs-dark/50 mt-1">
                            {profile.isPremium ? 'Unlimited' : `${10 - profile.freeApplicationsUsed} free left`}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-green-100 p-3 rounded-xl">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">{profileStrength}%</div>
                        <div className="text-sm text-jobs-dark/60">Profile Strength</div>
                        <div className="text-xs text-jobs-dark/50 mt-1">{getStrengthLabel(profileStrength)}</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-yellow-100 p-3 rounded-xl">
                                <Award className="h-6 w-6 text-yellow-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">{profile.points}</div>
                        <div className="text-sm text-jobs-dark/60">Points Earned</div>
                        <div className="text-xs text-jobs-dark/50 mt-1">Keep completing tasks!</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="bg-purple-100 p-3 rounded-xl">
                                <BookmarkPlus className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-jobs-dark">0</div>
                        <div className="text-sm text-jobs-dark/60">Saved Jobs</div>
                        <div className="text-xs text-jobs-dark/50 mt-1">Your wishlist</div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Profile Strength */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Profile Strength Card */}
                        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-jobs-dark">Profile Strength</h2>
                                <span className={`px-4 py-2 rounded-full text-white text-sm font-bold ${getStrengthColor(profileStrength)
                                    }`}>
                                    {profileStrength}%
                                </span>
                            </div>

                            <div className="mb-6">
                                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${getStrengthColor(profileStrength)
                                            }`}
                                        style={{ width: `${profileStrength}%` }}
                                    ></div>
                                </div>
                            </div>

                            {improvementSteps.length > 0 && (
                                <>
                                    <h3 className="font-bold text-jobs-dark mb-4">Next Steps to Improve:</h3>
                                    <div className="space-y-3">
                                        {improvementSteps.map((step, index) => (
                                            <div key={index} className="flex items-start gap-3">
                                                <div className="bg-jobs-primary/10 p-2 rounded-lg mt-0.5">
                                                    <CheckCircle className="h-4 w-4 text-jobs-primary" />
                                                </div>
                                                <span className="text-jobs-dark/80">{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {profileStrength === 100 && (
                                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                    <p className="text-green-800 font-bold flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5" />
                                        Perfect! Your profile is 100% complete
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                            <h2 className="text-xl font-black text-jobs-dark mb-6">Quick Actions</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Link
                                    href="/dashboard/profile/cv"
                                    className="flex items-center gap-4 p-4 border-2 border-gray-100 rounded-2xl hover:border-jobs-primary hover:bg-jobs-primary/5 transition-all group"
                                >
                                    <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-jobs-primary group-hover:text-white transition-colors">
                                        <FileText className="h-6 w-6 text-blue-600 group-hover:text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-jobs-dark">Upload CV</div>
                                        <div className="text-xs text-jobs-dark/60">PDF or DOCX</div>
                                    </div>
                                </Link>

                                <Link
                                    href="/dashboard/profile/video"
                                    className="flex items-center gap-4 p-4 border-2 border-gray-100 rounded-2xl hover:border-jobs-accent hover:bg-jobs-accent/5 transition-all group"
                                >
                                    <div className="bg-orange-100 p-3 rounded-xl group-hover:bg-jobs-accent group-hover:text-white transition-colors">
                                        <Video className="h-6 w-6 text-orange-600 group-hover:text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-jobs-dark">Intro Video</div>
                                        <div className="text-xs text-jobs-dark/60">Record or upload</div>
                                    </div>
                                </Link>

                                <Link
                                    href="/search"
                                    className="flex items-center gap-4 p-4 border-2 border-gray-100 rounded-2xl hover:border-green-500 hover:bg-green-50 transition-all group"
                                >
                                    <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-500 group-hover:text-white transition-colors">
                                        <Briefcase className="h-6 w-6 text-green-600 group-hover:text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-jobs-dark">Browse Jobs</div>
                                        <div className="text-xs text-jobs-dark/60">Find opportunities</div>
                                    </div>
                                </Link>

                                <Link
                                    href="/dashboard/applications"
                                    className="flex items-center gap-4 p-4 border-2 border-gray-100 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
                                >
                                    <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                        <Clock className="h-6 w-6 text-purple-600 group-hover:text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-jobs-dark">My Applications</div>
                                        <div className="text-xs text-jobs-dark/60">Track status</div>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Premium & Tips */}
                    <div className="space-y-6">
                        {/* Premium Upgrade */}
                        {!profile.isPremium && (
                            <div className="bg-gradient-to-br from-jobs-accent to-orange-600 p-8 rounded-3xl shadow-lg text-white">
                                <div className="bg-white/20 p-3 rounded-xl w-fit mb-4">
                                    <Award className="h-8 w-8" />
                                </div>
                                <h3 className="text-2xl font-black mb-2">Upgrade to Premium</h3>
                                <p className="text-white/90 mb-6 text-sm">
                                    Unlock unlimited applications, see full company details, and get priority support
                                </p>
                                <div className="text-3xl font-black mb-4">Rs. 10,000<span className="text-lg font-normal">/month</span></div>
                                <Link
                                    href="/dashboard/premium"
                                    className="block w-full bg-white text-jobs-accent py-3 rounded-xl font-bold text-center hover:bg-white/90 transition-all"
                                >
                                    Upgrade Now
                                </Link>
                            </div>
                        )}

                        {profile.isPremium && (
                            <div className="bg-gradient-to-br from-green-500 to-green-600 p-8 rounded-3xl shadow-lg text-white">
                                <div className="bg-white/20 p-3 rounded-xl w-fit mb-4">
                                    <CheckCircle className="h-8 w-8" />
                                </div>
                                <h3 className="text-2xl font-black mb-2">Premium Active!</h3>
                                <p className="text-white/90 mb-4 text-sm">
                                    Enjoy unlimited applications and full job details
                                </p>
                                {profile.premiumExpiresAt && (
                                    <div className="text-sm">
                                        Expires: {new Date(profile.premiumExpiresAt).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tips Card */}
                        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                            <h3 className="font-black text-jobs-dark mb-4">💡 Pro Tips</h3>
                            <div className="space-y-3 text-sm text-jobs-dark/80">
                                <p>✓ Complete your profile to increase visibility</p>
                                <p>✓ Upload a professional CV and intro video</p>
                                <p>✓ Apply to jobs that match your skills</p>
                                <p>✓ Check your match score before applying</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
