'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import TagInput from '@/components/ui/TagInput';

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
        skills: [] as string[],
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
                const { db } = await import('@/lib/firebase/firebase-config');

                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data) {
                        setFormData({
                            fullName: data.name || data.displayName || user.displayName || '',
                            phone: data.phone || user.phone || '',
                            location: data.city || user.city || '',
                            experience: data.totalExperience || '',
                            education: data.education || '',
                            skills: Array.isArray(data.skills) ? data.skills : [],
                            bio: data.professionalSummary || data.bio || '',
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

            const { doc, setDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase/firebase-config');

            // Convert skills string to array is no longer needed as TagInput uses array
            const skillsArray = formData.skills;

            await setDoc(doc(db, 'users', user.uid), {
                name: formData.fullName,
                phone: formData.phone,
                city: formData.location,
                totalExperience: formData.experience,
                education: formData.education,
                skills: skillsArray,
                professionalSummary: formData.bio,
                updatedAt: new Date(),
            }, { merge: true });

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
                    Full Name * <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">پورا نام</span>
                </label>
                <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="John Doe · پورا نام"
                />
            </div>

            {/* Phone */}
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number * <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">فون نمبر</span>
                </label>
                <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="+92 300 1234567 · فون نمبر"
                />
            </div>

            {/* Location */}
            <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Location * <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">مقام</span>
                </label>
                <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Karachi, Pakistan · مقام"
                />
            </div>

            {/* Experience */}
            <div>
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience * <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">تجربے کے سال</span>
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
                    Education * <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">تعلیم</span>
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
            <TagInput
                label="Skills"
                urduLabel="مہارتیں"
                tags={formData.skills}
                onChange={(tags) => setFormData(prev => ({ ...prev, skills: tags }))}
                placeholder="e.g. JavaScript, React, Python"
            />

            {/* Bio */}
            <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                    Professional Bio <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">پیشہ ورانہ تعارف</span>
                </label>
                <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Tell companies about yourself... · پیشہ ورانہ تعارف"
                />
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
                {loading ? 'Saving... · محفوظ ہو رہا ہے...' : 'Save Profile · پروفائل محفوظ کریں'}
            </button>
        </form>
    );
}