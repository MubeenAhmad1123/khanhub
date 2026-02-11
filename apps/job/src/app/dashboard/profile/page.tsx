'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Auth check
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
    }, [authLoading, user, router]);

    // Fetch profile
    useEffect(() => {
        if (!user) return;

        const fetchProfile = async () => {
            try {
                setLoading(true);
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase/firebase-config');

                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setProfile(userDoc.data());
                }
            } catch (error) {
                console.error('Fetch profile error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    const profileStrength = profile?.stats?.profileStrength || 0;
    const hasCV = !!profile?.profile?.cvUrl;
    const hasVideo = !!profile?.profile?.videoUrl;
    const isProfileComplete = profile?.profile?.fullName && profile?.profile?.skills?.length > 0;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                    <p className="text-gray-600 mt-2">Manage your profile and boost your visibility to employers</p>
                </div>

                {/* Profile Strength */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Profile Strength</h3>
                            <p className="text-sm text-gray-600">Complete your profile to attract more employers</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-teal-600">{profileStrength}%</p>
                            <p className="text-sm text-gray-500">
                                {profile?.totalPoints || 0} points
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                        <div
                            className="bg-teal-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${profileStrength}%` }}
                        ></div>
                    </div>

                    {/* Completion Tips */}
                    <div className="space-y-2">
                        {!isProfileComplete && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-yellow-500">⚠️</span>
                                <span className="text-gray-700">Complete your basic information (+25 points)</span>
                            </div>
                        )}
                        {!hasCV && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-yellow-500">⚠️</span>
                                <span className="text-gray-700">Upload your CV (+15 points)</span>
                            </div>
                        )}
                        {!hasVideo && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-yellow-500">⚠️</span>
                                <span className="text-gray-700">Add an introduction video (+20 points)</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Link
                        href="/dashboard/profile/cv"
                        className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-2xl">
                                📄
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Upload CV</h3>
                                <p className="text-sm text-gray-600">
                                    {hasCV ? 'Update your CV' : 'Add your CV'}
                                </p>
                                {hasCV && <p className="text-xs text-green-600 mt-1">✓ CV Uploaded</p>}
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/profile/video"
                        className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl">
                                🎥
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Intro Video</h3>
                                <p className="text-sm text-gray-600">
                                    {hasVideo ? 'Update your video' : 'Record introduction'}
                                </p>
                                {hasVideo && <p className="text-xs text-green-600 mt-1">✓ Video Uploaded</p>}
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/premium"
                        className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-white"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-2xl">
                                💎
                            </div>
                            <div>
                                <h3 className="font-semibold">Upgrade to Premium</h3>
                                <p className="text-sm opacity-90">Unlimited applications</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Profile Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h3>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-500">Full Name</label>
                                <p className="text-gray-900 font-medium">
                                    {profile?.profile?.fullName || 'Not provided'}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Email</label>
                                <p className="text-gray-900 font-medium">{user?.email}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Phone</label>
                                <p className="text-gray-900 font-medium">
                                    {profile?.profile?.phone || 'Not provided'}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Location</label>
                                <p className="text-gray-900 font-medium">
                                    {profile?.profile?.location || 'Not provided'}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Experience</label>
                                <p className="text-gray-900 font-medium">
                                    {profile?.profile?.experience
                                        ? `${profile.profile.experience} years`
                                        : 'Not provided'}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Education</label>
                                <p className="text-gray-900 font-medium">
                                    {profile?.profile?.education || 'Not provided'}
                                </p>
                            </div>
                        </div>

                        {/* Skills */}
                        <div>
                            <label className="text-sm text-gray-500 mb-2 block">Skills</label>
                            {profile?.profile?.skills && profile.profile.skills.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {profile.profile.skills.map((skill: string, index: number) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">No skills added</p>
                            )}
                        </div>

                        {/* Bio */}
                        <div>
                            <label className="text-sm text-gray-500 mb-2 block">Bio</label>
                            <p className="text-gray-900">
                                {profile?.profile?.bio || 'No bio provided'}
                            </p>
                        </div>
                    </div>

                    {/* Edit Button */}
                    <div className="mt-6">
                        <Link
                            href="/dashboard/profile/edit"
                            className="inline-block bg-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Edit Profile
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}