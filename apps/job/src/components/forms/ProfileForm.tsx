'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ProfileFormProps {
    onSuccess?: () => void;
}

export default function ProfileForm({ onSuccess }: ProfileFormProps) {
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        location: '',
        experience: '',
        education: '',
        skills: '',
        bio: '',
    });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // Load existing profile
    useEffect(() => {
        if (!user) return;

        const loadProfile = async () => {
            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase/config');

                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const profile = userDoc.data()?.profile;
                    if (profile) {
                        setFormData({
                            fullName: profile.fullName || '',
                            phone: profile.phone || '',
                            location: profile.location || '',
                            experience: profile.experience || '',
                            education: profile.education || '',
                            skills: profile.skills?.join(', ') || '',
                            bio: profile.bio || '',
                        });
                    }
                }
            } catch (error) {
                console.error('Load profile error:', error);
            } finally {
                setInitialLoading(false);
            }
        };

        loadProfile();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        try {
            setLoading(true);

            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase/config');

            // Convert skills string to array
            const skillsArray = formData.skills
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s.length > 0);

            await updateDoc(doc(db, 'users', user.uid), {
                'profile.fullName': formData.fullName,
                'profile.phone': formData.phone,
                'profile.location': formData.location,
                'profile.experience': parseInt(formData.experience) || 0,
                'profile.education': formData.education,
                'profile.skills': skillsArray,
                'profile.bio': formData.bio,
            });

            alert('Profile updated successfully!');

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Update profile error:', error);
            alert('Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                </label>
                <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="John Doe"
                />
            </div>

            {/* Phone */}
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                </label>
                <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="+92 300 1234567"
                />
            </div>

            {/* Location */}
            <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                </label>
                <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Karachi, Pakistan"
                />
            </div>

            {/* Experience */}
            <div>
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience *
                </label>
                <select
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                    <option value="">Select experience</option>
                    <option value="0">Fresh Graduate / No Experience</option>
                    <option value="1">1-2 years</option>
                    <option value="3">3-5 years</option>
                    <option value="6">6-10 years</option>
                    <option value="11">10+ years</option>
                </select>
            </div>

            {/* Education */}
            <div>
                <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-2">
                    Education *
                </label>
                <select
                    id="education"
                    name="education"
                    value={formData.education}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                    <option value="">Select education level</option>
                    <option value="Matriculation">Matriculation</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Bachelor's Degree">Bachelor's Degree</option>
                    <option value="Master's Degree">Master's Degree</option>
                    <option value="PhD">PhD</option>
                </select>
            </div>

            {/* Skills */}
            <div>
                <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-2">
                    Skills * (comma-separated)
                </label>
                <input
                    type="text"
                    id="skills"
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="JavaScript, React, Node.js, Python"
                />
                <p className="text-sm text-gray-500 mt-1">
                    Separate skills with commas
                </p>
            </div>

            {/* Bio */}
            <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                    Professional Bio
                </label>
                <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Tell employers about yourself..."
                />
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
                {loading ? 'Saving...' : 'Save Profile'}
            </button>
        </form>
    );
}