'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle, ArrowRight, Building2, MapPin, Users, Calendar } from 'lucide-react';

export default function OnboardingPage() {
    const router = useRouter();
    const { user, updateProfile, loading } = useAuth();
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            console.log('=== ONBOARDING DEBUG ===');
            console.log('User UID:', user.uid);
            console.log('User Role:', user.role);
            console.log('User Email:', user.email);
            console.log('Onboarding Completed:', user.onboardingCompleted);
            console.log('=========================');
        }
    }, [user]);

    // Separate form data for job seekers and employers
    const [jobSeekerData, setJobSeekerData] = useState({
        skills: '',
        experience: '',
        location: '',
        primarySkill: '',
    });

    const [employerData, setEmployerData] = useState({
        companyName: '',
        companyWebsite: '',
        companySize: '',
        industry: '',
        location: '',
        description: '',
        foundedYear: '',
        contactPerson: '',
        phone: '',
    });

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
        }
    }, [user, loading, router]);

    const isEmployer = user?.role === 'employer';
    const totalSteps = isEmployer ? 3 : 4;

    // IMPORTANT: Wait for role to be available before deciding flow
    if (!loading && user && !user.role) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-teal-600">
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-bold">Setting up your experience...</p>
                </div>
            </div>
        );
    }

    const handleJobSeekerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (step < totalSteps) {
            setStep(step + 1);
            return;
        }

        setIsSubmitting(true);
        try {
            await updateProfile({
                onboardingCompleted: true,
                profile: {
                    ...(user?.profile as any),
                    skills: jobSeekerData.skills.split(',').map(s => s.trim()).filter(s => s),
                    yearsOfExperience: parseInt(jobSeekerData.experience) || 0,
                    location: jobSeekerData.location,
                    preferredJobTitle: jobSeekerData.primarySkill,
                    profileStrength: 40,
                    onboardingCompleted: true,
                    completedSections: {
                        basicInfo: true,
                        skills: true,
                    }
                }
            } as any);
            router.push('/auth/verify-payment');
        } catch (err: any) {
            setError(err.message || 'Failed to save onboarding details');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEmployerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (step < totalSteps) {
            setStep(step + 1);
            return;
        }

        setIsSubmitting(true);
        try {
            await updateProfile({
                onboardingCompleted: true,
                company: {
                    name: employerData.companyName,
                    website: employerData.companyWebsite,
                    size: employerData.companySize as any,
                    industry: employerData.industry as any,
                    location: employerData.location,
                    description: employerData.description,
                    foundedYear: employerData.foundedYear ? parseInt(employerData.foundedYear) : undefined,
                },
                displayName: employerData.contactPerson,
                profile: {
                    phone: employerData.phone,
                    location: employerData.location,
                    onboardingCompleted: true,
                } as any
            } as any);

            router.push('/employer/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to save company details');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm font-bold text-teal-600">Step {step} of {totalSteps}</span>
                        <span className="text-sm font-bold text-gray-400">
                            {Math.round((step / totalSteps) * 100)}% Complete
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                            className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-gray-900">
                        {isEmployer ? "Let's set up your company" : "Let's build your profile"}
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {isEmployer ? "Tell us about your company" : "Just 3 quick questions to help us find you the best jobs"}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                        {error}
                    </div>
                )}

                {isEmployer ? (
                    <EmployerOnboardingForm
                        step={step}
                        formData={employerData}
                        setFormData={setEmployerData}
                        onSubmit={handleEmployerSubmit}
                        onBack={() => setStep(step - 1)}
                        isSubmitting={isSubmitting}
                        totalSteps={totalSteps}
                    />
                ) : (
                    <JobSeekerOnboardingForm
                        step={step}
                        formData={jobSeekerData}
                        setFormData={setJobSeekerData}
                        onSubmit={handleJobSeekerSubmit}
                        onBack={() => setStep(step - 1)}
                        isSubmitting={isSubmitting}
                        totalSteps={totalSteps}
                    />
                )}
            </div>
        </div>
    );
}

// Job Seeker Onboarding Form Component
function JobSeekerOnboardingForm({ step, formData, setFormData, onSubmit, onBack, isSubmitting, totalSteps }: any) {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center text-4xl">
                            👨‍💻
                        </div>
                    </div>
                    <label className="block text-lg font-bold text-gray-800 text-center">
                        What is your primary profession or role?
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.primarySkill}
                        onChange={(e) => setFormData({ ...formData, primarySkill: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-center text-xl font-medium"
                        placeholder="e.g. Graphic Designer"
                        autoFocus
                    />
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center text-4xl">
                            💼
                        </div>
                    </div>
                    <label className="block text-lg font-bold text-gray-800 text-center">
                        How many years of experience do you have?
                    </label>
                    <select
                        required
                        value={formData.experience}
                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-center text-xl font-medium appearance-none"
                    >
                        <option value="">Select Experience</option>
                        <option value="0">Fresher / No Experience</option>
                        <option value="1">1 Year</option>
                        <option value="2">2 Years</option>
                        <option value="3">3 Years</option>
                        <option value="4">4 Years</option>
                        <option value="5">5+ Years</option>
                        <option value="10">10+ Years</option>
                    </select>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center text-4xl">
                            🛠️
                        </div>
                    </div>
                    <label className="block text-lg font-bold text-gray-800 text-center">
                        List your top skills (comma separated)
                    </label>
                    <textarea
                        required
                        value={formData.skills}
                        onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium h-32 resize-none"
                        placeholder="e.g. HTML, CSS, React, Figma"
                        autoFocus
                    />

                    <div className="mt-6">
                        <label className="block text-lg font-bold text-gray-800 text-center mb-2">
                            Current Location
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-center text-xl font-medium"
                            placeholder="e.g. Lahore, Punjab"
                        />
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center text-4xl">
                            💰
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">One Last Thing!</h3>
                        <p className="text-gray-600">
                            To maintain quality and provide verified jobs, we require a one-time registration fee.
                        </p>
                    </div>

                    <div className="bg-teal-50 border-2 border-teal-100 rounded-2xl p-6 text-center">
                        <p className="text-xs text-teal-600 font-black uppercase mb-1">Registration Fee</p>
                        <p className="text-4xl font-black text-teal-700">Rs. 1,000</p>
                        <p className="text-sm text-teal-600/70 mt-2 font-medium">Valid for lifetime access</p>
                    </div>

                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-sm text-gray-600">
                            <CheckCircle className="h-5 w-5 text-teal-500" />
                            Access to 100+ daily jobs
                        </li>
                        <li className="flex items-center gap-3 text-sm text-gray-600">
                            <CheckCircle className="h-5 w-5 text-teal-500" />
                            Verified Employer contacts
                        </li>
                        <li className="flex items-center gap-3 text-sm text-gray-600">
                            <CheckCircle className="h-5 w-5 text-teal-500" />
                            Instant Job Alerts
                        </li>
                    </ul>
                </div>
            )}

            <div className="flex gap-4 pt-4">
                {step > 1 && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-400 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                    >
                        Back
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-2 bg-teal-600 text-white px-8 py-4 rounded-2xl font-black text-xl hover:bg-teal-700 transition-all shadow-lg flex items-center justify-center gap-2 group"
                    style={{ flex: 2 }}
                >
                    {isSubmitting ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        <>
                            {step === totalSteps ? 'Complete Setup & Pay' : 'Continue'}
                            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}

// Employer Onboarding Form Component
function EmployerOnboardingForm({ step, formData, setFormData, onSubmit, onBack, isSubmitting, totalSteps }: any) {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center">
                            <Building2 className="h-10 w-10 text-teal-600" />
                        </div>
                    </div>
                    <label className="block text-lg font-bold text-gray-800 text-center">
                        Company Information
                    </label>

                    <div className="space-y-4">
                        <input
                            type="text"
                            required
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium"
                            placeholder="Company Name"
                            autoFocus
                        />
                        <input
                            type="url"
                            value={formData.companyWebsite}
                            onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                            className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium"
                            placeholder="Company Website (optional)"
                        />
                        <input
                            type="text"
                            value={formData.foundedYear}
                            onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
                            className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium"
                            placeholder="Founded Year (optional)"
                        />
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center">
                            <Users className="h-10 w-10 text-teal-600" />
                        </div>
                    </div>
                    <label className="block text-lg font-bold text-gray-800 text-center">
                        Company Details
                    </label>

                    <select
                        required
                        value={formData.companySize}
                        onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium"
                    >
                        <option value="">Company Size</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-500">201-500 employees</option>
                        <option value="501-1000">501-1000 employees</option>
                        <option value="1000+">1000+ employees</option>
                    </select>

                    <select
                        required
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium"
                    >
                        <option value="">Select Industry</option>
                        <option value="technology">Technology</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="finance">Finance</option>
                        <option value="education">Education</option>
                        <option value="retail">Retail</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="construction">Construction</option>
                        <option value="hospitality">Hospitality</option>
                        <option value="other">Other</option>
                    </select>

                    <input
                        type="text"
                        required
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium"
                        placeholder="Company Location (City)"
                    />
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center text-4xl">
                            📝
                        </div>
                    </div>
                    <label className="block text-lg font-bold text-gray-800 text-center">
                        Contact Information & Description
                    </label>

                    <input
                        type="text"
                        required
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium"
                        placeholder="Contact Person Name"
                        autoFocus
                    />

                    <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium"
                        placeholder="Contact Phone Number"
                    />

                    <textarea
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium h-32 resize-none"
                        placeholder="Brief description of your company..."
                    />
                </div>
            )}

            <div className="flex gap-4 pt-4">
                {step > 1 && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-400 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                    >
                        Back
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-2 bg-teal-600 text-white px-8 py-4 rounded-2xl font-black text-xl hover:bg-teal-700 transition-all shadow-lg flex items-center justify-center gap-2 group"
                    style={{ flex: 2 }}
                >
                    {isSubmitting ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        <>
                            {step === totalSteps ? 'Complete Setup' : 'Continue'}
                            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}