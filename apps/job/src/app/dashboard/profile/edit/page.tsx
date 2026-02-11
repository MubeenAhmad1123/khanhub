'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, Save, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function EditProfilePage() {
    const router = useRouter();
    const { user, loading: authLoading, updateProfile } = useAuth();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<any>({
        fullName: '',
        phone: '',
        location: '',
        bio: '',
        experience: 0,
        education: '',
        skills: '',
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
        if (user?.profile) {
            setFormData({
                fullName: (user as any).profile.fullName || user.displayName || '',
                phone: (user as any).profile.phone || '',
                location: (user as any).profile.location || '',
                bio: (user as any).profile.bio || '',
                experience: (user as any).profile.yearsOfExperience || (user as any).profile.experience || 0,
                education: (user as any).profile.education || '',
                skills: (user as any).profile.skills?.join(', ') || '',
            });
        } else if (user) {
            setFormData((prev: any) => ({
                ...prev,
                fullName: user.displayName || '',
            }));
        }
    }, [authLoading, user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            const skillsArray = formData.skills
                .split(',')
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0);

            const updates: any = {
                displayName: formData.fullName,
                profile: {
                    ...(user.profile || {}),
                    fullName: formData.fullName,
                    phone: formData.phone,
                    location: formData.location,
                    bio: formData.bio,
                    yearsOfExperience: Number(formData.experience),
                    education: formData.education,
                    skills: skillsArray,
                }
            };

            // Award points if this is the first time completing basic info
            const isFirstTime = !user.profile?.fullName || !user.profile?.phone;

            await updateProfile(updates);

            if (isFirstTime) {
                try {
                    const { awardPoints } = await import('@/lib/services/pointsSystem');
                    const { POINTS } = await import('@/types/DATABASE_SCHEMA');
                    await awardPoints(user.uid, POINTS.BASIC_INFO_COMPLETED, 'Basic profile information completed');
                    alert('🎉 Profile updated! You earned 25 points!');
                } catch (pErr) {
                    console.error('Failed to award points:', pErr);
                    alert('Profile updated successfully!');
                }
            } else {
                alert('Profile updated successfully!');
            }

            router.push('/dashboard/profile');
        } catch (error) {
            console.error('Update profile error:', error);
            alert('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Back Button */}
                <Link
                    href="/dashboard/profile"
                    className="inline-flex items-center text-teal-600 hover:text-teal-700 font-medium mb-8 group"
                >
                    <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Profile
                </Link>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-8 py-8 text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <Sparkles className="w-6 h-6" />
                            <h1 className="text-3xl font-black">Edit Profile</h1>
                        </div>
                        <p className="opacity-90">Complete your profile to unlock all features and earn points.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Full Name */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium"
                                    placeholder="Your full name"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium"
                                    placeholder="e.g. 0300-1234567"
                                />
                            </div>

                            {/* Location */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium"
                                    placeholder="City, Country"
                                />
                            </div>

                            {/* Experience */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Years of Experience</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.experience}
                                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium"
                                />
                            </div>

                            {/* Education */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Highest Education</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.education}
                                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium"
                                    placeholder="e.g. BS Computer Science"
                                />
                            </div>
                        </div>

                        {/* Skills */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Skills (comma separated)</label>
                            <input
                                type="text"
                                required
                                value={formData.skills}
                                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium"
                                placeholder="React, Node.js, UI/UX, Sales..."
                            />
                        </div>

                        {/* Bio */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Professional Summary</label>
                            <textarea
                                required
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                rows={4}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium resize-none"
                                placeholder="Tell us about yourself..."
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="flex-1 px-8 py-4 border-2 border-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-[2] bg-teal-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Save Profile
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
