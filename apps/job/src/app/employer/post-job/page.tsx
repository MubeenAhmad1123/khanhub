'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Briefcase, MapPin, DollarSign, Calendar, FileText, Loader2 } from 'lucide-react';
import { createJob } from '@/lib/firebase/firestore';
import { PAKISTANI_CITIES, PAKISTANI_PROVINCES } from '@/types/job';

export default function PostJobPage() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        shortDescription: '',
        description: '',
        category: 'healthcare' as any,
        type: 'full-time' as any,
        locationType: 'on-site' as any,
        experienceLevel: 'mid' as any,
        city: '',
        province: '',
        salaryMin: '',
        salaryMax: '',
        requiredSkills: '',
        requiredEducation: '',
        requiredExperience: '0',
        requirements: '',
        responsibilities: '',
        benefits: '',
        vacancies: '1',
        deadline: '',
        companyEmail: profile?.companyName ? profile.email : '',
        companyPhone: '',
        companyAddress: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !profile) {
            setError('You must be logged in to post a job');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const deadlineDate = new Date(formData.deadline);
            const expiresAt = new Date(deadlineDate);
            expiresAt.setDate(expiresAt.getDate() + 7); // Expires 7 days after deadline

            await createJob({
                title: formData.title,
                company: {
                    id: user.uid,
                    name: profile.companyName || 'Company',
                    logo: profile.companyLogo || null,
                    industry: profile.industry || null,
                },
                shortDescription: formData.shortDescription,
                description: formData.description,
                category: formData.category,
                type: formData.type,
                locationType: formData.locationType,
                experienceLevel: formData.experienceLevel,
                location: `${formData.city}, ${formData.province}`,
                city: formData.city,
                province: formData.province,
                isRemote: formData.locationType === 'remote',
                salary: formData.salaryMin && formData.salaryMax ? {
                    min: parseInt(formData.salaryMin),
                    max: parseInt(formData.salaryMax),
                    currency: 'PKR',
                    period: 'month',
                } : undefined,
                requirements: formData.requirements.split('\n').filter(r => r.trim()),
                responsibilities: formData.responsibilities.split('\n').filter(r => r.trim()),
                qualifications: [],
                benefits: formData.benefits ? formData.benefits.split('\n').filter(b => b.trim()) : [],
                skills: formData.requiredSkills.split(',').map(s => s.trim()).filter(s => s),
                requiredSkills: formData.requiredSkills.split(',').map(s => s.trim()).filter(s => s),
                requiredEducation: formData.requiredEducation,
                requiredExperience: parseInt(formData.requiredExperience),
                employerId: user.uid,
                companyEmail: formData.companyEmail,
                companyPhone: formData.companyPhone,
                companyAddress: formData.companyAddress,
                status: 'pending',
                featured: false,
                vacancies: parseInt(formData.vacancies),
                deadline: deadlineDate,
                expiresAt,
                postedAt: new Date(),
                isActive: true,
                applicationCount: 0,
                viewsCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            setSubmitting(false);
            router.push('/employer/dashboard');
        } catch (err) {
            console.error('Error posting job:', err);
            setError('Failed to post job. Please try again.');
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-jobs-neutral py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-jobs-dark mb-2">Post a New Job</h1>
                    <p className="text-jobs-dark/60">Fill in the details to create a job posting</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 space-y-8">
                    {/* Basic Information */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-black text-jobs-dark flex items-center gap-2">
                            <Briefcase className="h-6 w-6 text-jobs-primary" />
                            Basic Information
                        </h2>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Job Title *</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                placeholder="e.g. Senior Staff Nurse"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Short Description *</label>
                            <input
                                type="text"
                                required
                                value={formData.shortDescription}
                                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                placeholder="Brief one-line description"
                                maxLength={150}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Full Description *</label>
                            <textarea
                                required
                                rows={6}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary resize-none"
                                placeholder="Detailed job description..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Category *</label>
                                <select
                                    required
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                >
                                    <option value="healthcare">Healthcare</option>
                                    <option value="technology">Technology</option>
                                    <option value="education">Education</option>
                                    <option value="finance">Finance</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="sales">Sales</option>
                                    <option value="customer-service">Customer Service</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Job Type *</label>
                                <select
                                    required
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                >
                                    <option value="full-time">Full-time</option>
                                    <option value="part-time">Part-time</option>
                                    <option value="contract">Contract</option>
                                    <option value="internship">Internship</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-black text-jobs-dark flex items-center gap-2">
                            <MapPin className="h-6 w-6 text-jobs-primary" />
                            Location
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Location Type *</label>
                                <select
                                    required
                                    value={formData.locationType}
                                    onChange={(e) => setFormData({ ...formData, locationType: e.target.value as any })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                >
                                    <option value="on-site">On-site</option>
                                    <option value="remote">Remote</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">City *</label>
                                <select
                                    required
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                >
                                    <option value="">Select City</option>
                                    {PAKISTANI_CITIES.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Province *</label>
                                <select
                                    required
                                    value={formData.province}
                                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                >
                                    <option value="">Select Province</option>
                                    {PAKISTANI_PROVINCES.map(province => (
                                        <option key={province} value={province}>{province}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Salary & Requirements */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-black text-jobs-dark flex items-center gap-2">
                            <DollarSign className="h-6 w-6 text-jobs-primary" />
                            Compensation & Requirements
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Minimum Salary (PKR)</label>
                                <input
                                    type="number"
                                    value={formData.salaryMin}
                                    onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                    placeholder="50000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Maximum Salary (PKR)</label>
                                <input
                                    type="number"
                                    value={formData.salaryMax}
                                    onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                    placeholder="80000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Experience Level *</label>
                                <select
                                    required
                                    value={formData.experienceLevel}
                                    onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value as any })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                >
                                    <option value="entry">Entry Level</option>
                                    <option value="mid">Mid Level</option>
                                    <option value="senior">Senior Level</option>
                                    <option value="executive">Executive</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Required Years of Experience *</label>
                                <input
                                    type="number"
                                    required
                                    value={formData.requiredExperience}
                                    onChange={(e) => setFormData({ ...formData, requiredExperience: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                    placeholder="2"
                                    min="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Required Skills (comma-separated) *</label>
                            <input
                                type="text"
                                required
                                value={formData.requiredSkills}
                                onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                placeholder="e.g. Patient Care, ICU Management, Medical Equipment"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Required Education *</label>
                            <input
                                type="text"
                                required
                                value={formData.requiredEducation}
                                onChange={(e) => setFormData({ ...formData, requiredEducation: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                placeholder="e.g. Bachelor's in Nursing (BSN)"
                            />
                        </div>
                    </div>

                    {/* Additional Details */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-black text-jobs-dark flex items-center gap-2">
                            <FileText className="h-6 w-6 text-jobs-primary" />
                            Additional Details
                        </h2>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Requirements (one per line) *</label>
                            <textarea
                                required
                                rows={4}
                                value={formData.requirements}
                                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary resize-none"
                                placeholder="Valid nursing license&#10;2+ years ICU experience&#10;Strong communication skills"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Responsibilities (one per line) *</label>
                            <textarea
                                required
                                rows={4}
                                value={formData.responsibilities}
                                onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary resize-none"
                                placeholder="Monitor patient vital signs&#10;Administer medications&#10;Maintain patient records"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Benefits (one per line)</label>
                            <textarea
                                rows={3}
                                value={formData.benefits}
                                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary resize-none"
                                placeholder="Health insurance&#10;Paid time off&#10;Professional development"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Number of Vacancies *</label>
                                <input
                                    type="number"
                                    required
                                    value={formData.vacancies}
                                    onChange={(e) => setFormData({ ...formData, vacancies: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                    placeholder="1"
                                    min="1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Application Deadline *</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.deadline}
                                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-black text-jobs-dark">Contact Information</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Company Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.companyEmail}
                                    onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                    placeholder="hr@company.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Company Phone *</label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.companyPhone}
                                    onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                    placeholder="+92 300 1234567"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Company Address *</label>
                            <input
                                type="text"
                                required
                                value={formData.companyAddress}
                                onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-jobs-primary/10 focus:border-jobs-primary"
                                placeholder="123 Main Street, Karachi"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 bg-gray-200 text-jobs-dark py-4 rounded-xl font-bold hover:bg-gray-300 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 bg-jobs-accent text-white py-4 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Posting Job...
                                </>
                            ) : (
                                'Post Job'
                            )}
                        </button>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-sm text-blue-800">
                            <strong>Note:</strong> Your job posting will be reviewed by our admin team before going live. You'll receive an email once it's approved.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
