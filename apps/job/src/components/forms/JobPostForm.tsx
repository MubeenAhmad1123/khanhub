'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface JobPostFormProps {
    onSuccess?: () => void;
    isAdmin?: boolean;
}

export default function JobPostForm({ onSuccess, isAdmin = false }: JobPostFormProps) {
    const router = useRouter();
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        title: '',
        company: '',
        location: '',
        locationType: 'on-site',
        type: 'full-time',
        category: '',
        experience: '',
        salaryMin: '',
        salaryMax: '',
        description: '',
        requirements: '',
        skills: '',
    });
    const [companyLogo, setCompanyLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Handle logo file selection
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }
            setCompanyLogo(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Upload image to Cloudinary
    const uploadToCloudinary = async (file: File): Promise<string> => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'your_upload_preset');

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            if (!response.ok) {
                throw new Error('Failed to upload image');
            }

            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            throw new Error('Failed to upload company logo');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('Please login to post a job');
            return;
        }

        try {
            setLoading(true);
            setUploadProgress(10);

            let logoUrl = '';

            // Upload logo if provided
            if (companyLogo) {
                setUploadProgress(30);
                try {
                    logoUrl = await uploadToCloudinary(companyLogo);
                    setUploadProgress(60);
                } catch (uploadError) {
                    console.error('Logo upload failed:', uploadError);
                    // Continue without logo instead of failing completely
                    alert('Warning: Company logo upload failed. Posting job without logo.');
                }
            }

            const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase/config');

            setUploadProgress(70);

            // Transform fields to match Job interface
            const requirementsArray = formData.requirements
                .split('\n')
                .map((r) => r.trim())
                .filter((r) => r.length > 0);

            const skillsArray = formData.skills
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s.length > 0);

            // Extract city from location (simple comma split)
            const locationParts = formData.location.split(',');
            const city = locationParts[0].trim();
            const province = locationParts.length > 1 ? locationParts[1].trim() : '';

            // Map experience string to ExperienceLevel
            const mapExperienceToLevel = (exp: string): any => {
                const years = parseInt(exp) || 0;
                if (years === 0) return 'entry';
                if (years <= 2) return 'mid';
                if (years <= 5) return 'senior';
                return 'executive';
            };

            const jobData = {
                title: formData.title,
                companyName: formData.company,
                location: formData.location,
                city: city,
                isRemote: formData.locationType === 'remote',
                employmentType: formData.type as any,
                experienceLevel: mapExperienceToLevel(formData.experience),
                minExperience: parseInt(formData.experience) || 0,
                category: formData.category.toLowerCase(),
                salaryMin: parseInt(formData.salaryMin) || 0,
                salaryMax: parseInt(formData.salaryMax) || 0,
                currency: 'PKR',
                salaryCurrency: 'PKR',
                salaryPeriod: 'monthly',
                showSalary: true,
                description: formData.description,
                requiredQualifications: requirementsArray,
                requiredSkills: skillsArray,
                responsibilities: [], // Could be expanded if needed
                employerId: user.uid,
                status,
                isFeatured: isAdmin,
                isPremium: false,
                acceptingApplications: true,
                applicantCount: 0,
                viewCount: 0,
                postedAt: serverTimestamp(),
                isActive: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                ...(logoUrl && { companyLogo: logoUrl }),
            };

            console.log('Attempting to save job:', jobData);

            await addDoc(collection(db, 'jobs'), jobData);

            setUploadProgress(100);

            alert(
                isAdmin
                    ? 'Job posted successfully!'
                    : 'Job submitted for approval! You will be notified once approved.'
            );

            if (onSuccess) {
                onSuccess();
            } else {
                router.push('/employer/jobs');
            }
        } catch (error: any) {
            console.error('Post job error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);

            // Provide more specific error messages
            let errorMessage = 'Failed to post job. ';

            if (error.code === 'permission-denied') {
                errorMessage += 'You do not have permission to post jobs. Please check your account status.';
            } else if (error.code === 'unauthenticated') {
                errorMessage += 'Please login again.';
            } else if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Please try again.';
            }

            alert(errorMessage);
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Logo Upload (Optional) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Logo (Optional)
                </label>
                <div className="flex items-center gap-4">
                    {logoPreview && (
                        <div className="relative w-20 h-20 border-2 border-gray-300 rounded-lg overflow-hidden">
                            <Image
                                src={logoPreview}
                                alt="Logo preview"
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div className="flex-1">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG, or WEBP. Max size 5MB.
                        </p>
                    </div>
                </div>
            </div>

            {/* Job Title */}
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title *
                </label>
                <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g., Senior React Developer"
                />
            </div>

            {/* Company Name */}
            <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                </label>
                <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Your company name"
                />
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                        City/Location *
                    </label>
                    <input
                        type="text"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="e.g., Karachi, Sindh"
                    />
                </div>
                <div>
                    <label htmlFor="locationType" className="block text-sm font-medium text-gray-700 mb-2">
                        Location Type *
                    </label>
                    <select
                        id="locationType"
                        name="locationType"
                        value={formData.locationType}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                        <option value="on-site">On-site</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                    </select>
                </div>
            </div>

            {/* Job Type & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                        Job Type *
                    </label>
                    <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                        <option value="full-time">Full-time</option>
                        <option value="part-time">Part-time</option>
                        <option value="contract">Contract</option>
                        <option value="freelance">Freelance</option>
                        <option value="internship">Internship</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                    </label>
                    <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                        <option value="">Select category</option>
                        <option value="Technology">Technology</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Sales">Sales</option>
                        <option value="Design">Design</option>
                        <option value="Finance">Finance</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Education">Education</option>
                        <option value="Customer Service">Customer Service</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            {/* Experience Required */}
            <div>
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience Required *
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

            {/* Salary Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="salaryMin" className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Salary (PKR) *
                    </label>
                    <input
                        type="number"
                        id="salaryMin"
                        name="salaryMin"
                        value={formData.salaryMin}
                        onChange={handleChange}
                        required
                        min="0"
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="50000"
                    />
                </div>

                <div>
                    <label htmlFor="salaryMax" className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Salary (PKR) *
                    </label>
                    <input
                        type="number"
                        id="salaryMax"
                        name="salaryMax"
                        value={formData.salaryMax}
                        onChange={handleChange}
                        required
                        min="0"
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="100000"
                    />
                </div>
            </div>

            {/* Description */}
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Job Description *
                </label>
                <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Describe the role, responsibilities, and what makes this opportunity great..."
                />
            </div>

            {/* Requirements */}
            <div>
                <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-2">
                    Requirements (one per line) *
                </label>
                <textarea
                    id="requirements"
                    name="requirements"
                    value={formData.requirements}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Bachelor's degree in Computer Science&#10;3+ years of React experience&#10;Strong communication skills"
                />
                <p className="text-sm text-gray-500 mt-1">Enter each requirement on a new line</p>
            </div>

            {/* Skills */}
            <div>
                <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-2">
                    Required Skills (comma-separated) *
                </label>
                <input
                    type="text"
                    id="skills"
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="React, TypeScript, Node.js, PostgreSQL"
                />
                <p className="text-sm text-gray-500 mt-1">Separate skills with commas</p>
            </div>

            {/* Progress Bar */}
            {loading && uploadProgress > 0 && (
                <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Info Box */}
            {!isAdmin && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-blue-700">
                                Your job posting will be reviewed by our admin team before going live. You'll be notified once approved.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    disabled={loading}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                    {loading ? 'Posting...' : isAdmin ? 'Post Job' : 'Submit for Approval'}
                </button>
            </div>
        </form>
    );
}