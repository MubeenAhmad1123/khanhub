'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle, Building2, Users, Phone, Video, MapPin, Briefcase, Upload, ArrowRight, Target, Globe } from 'lucide-react';
import Image from 'next/image';
import { calculateProfileStrength } from '@/lib/services/pointsSystem';

export default function OnboardingPage() {
    const router = useRouter();
    const { user, updateProfile, loading, isEmployer: authIsEmployer, isJobSeeker: authIsJobSeeker } = useAuth();

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [localRole, setLocalRole] = useState<string | null>(null);

    // Form states
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
        address: '',
        tagline: '',
        description: '',
        foundedYear: '',
        contactPerson: '',
        phone: '',
    });

    const [logo, setLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [logoLoading, setLogoLoading] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
        }
        // Only auto-set localRole if it hasn't been manually picked yet
        if (user?.role && !localRole) {
            console.log('Onboarding: Setting detected role from profile:', user.role);
            setLocalRole(user.role);
        }
    }, [user, loading, router, localRole]);

    const currentRole = localRole || user?.role;
    const isEmployer = currentRole === 'employer';
    const isJobSeeker = currentRole === 'job_seeker';

    // totalSteps:
    // - Employer: 3 steps
    // - Job Seeker: 4 steps
    const totalSteps = isEmployer ? 3 : (isJobSeeker ? 4 : 1);

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
                role: 'job_seeker',
                onboardingCompleted: true,
                profile: {
                    ...(user?.profile as any),
                    skills: jobSeekerData.skills.split(',').map(s => s.trim()).filter(s => s),
                    yearsOfExperience: parseInt(jobSeekerData.experience) || 0,
                    location: jobSeekerData.location,
                    preferredJobTitle: jobSeekerData.primarySkill,
                    profileStrength: calculateProfileStrength({
                        skills: jobSeekerData.skills.split(',').map(s => s.trim()).filter(s => s),
                        yearsOfExperience: parseInt(jobSeekerData.experience) || 0,
                        experience: [{ id: 'temp', title: jobSeekerData.primarySkill, company: 'Previous', startDate: '2020', isCurrent: true }], // Dummy to count as 1
                    }),
                    completedSections: {
                        basicInfo: true,
                        skills: true,
                        cv: false,
                        video: false,
                        experience: false,
                        education: false,
                        certifications: false,
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
            let logoUrl = '';
            if (logo) {
                setLogoLoading(true);
                const { uploadCompanyLogo } = await import('@/lib/services/cloudinaryUpload');
                const result = await uploadCompanyLogo(logo, user!.uid);
                logoUrl = result.secureUrl;
            }

            await updateProfile({
                role: 'employer',
                onboardingCompleted: true,
                company: {
                    name: employerData.companyName,
                    website: employerData.companyWebsite,
                    size: employerData.companySize as any,
                    industry: employerData.industry as any,
                    location: employerData.location,
                    address: employerData.address,
                    tagline: employerData.tagline,
                    description: employerData.description,
                    foundedYear: employerData.foundedYear ? parseInt(employerData.foundedYear) : undefined,
                    logo: logoUrl || undefined,
                },
                displayName: employerData.contactPerson,
            } as any);

            router.push('/employer/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to save company details');
        } finally {
            setIsSubmitting(false);
            setLogoLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-teal-600">
                <Loader2 className="h-12 w-12 animate-spin text-white" />
            </div>
        );
    }

    // Role selection fallback if role is missing
    if (!currentRole && !loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 text-center">
                    <h1 className="text-3xl font-black text-gray-900 mb-4">Complete your account setup</h1>
                    <p className="text-gray-600 mb-8 text-lg">We couldn't detect your account type. Please select one to continue.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <button
                            onClick={() => setLocalRole('job_seeker')}
                            className="p-8 border-4 border-gray-100 rounded-3xl hover:border-teal-500 hover:bg-teal-50 transition-all group text-left"
                        >
                            <span className="text-4xl mb-4 block">🎯</span>
                            <h3 className="text-xl font-bold text-gray-800 group-hover:text-teal-700">I am a Job Seeker</h3>
                            <p className="text-gray-500 text-sm mt-2">I want to find and apply for jobs</p>
                        </button>

                        <button
                            onClick={() => setLocalRole('employer')}
                            className="p-8 border-4 border-gray-100 rounded-3xl hover:border-teal-500 hover:bg-teal-50 transition-all group text-left"
                        >
                            <span className="text-4xl mb-4 block">🏢</span>
                            <h3 className="text-xl font-bold text-gray-800 group-hover:text-teal-700">I am an Employer</h3>
                            <p className="text-gray-500 text-sm mt-2">I want to post jobs and hire people</p>
                        </button>
                    </div>
                </div>
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
                    <div className="w-full bg-gray-100 rounded-full h-2 shadow-inner">
                        <div
                            className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-gray-900 leading-tight">
                        {isEmployer ? (
                            step === 1 ? "Start your Company Profile" :
                                step === 2 ? "Company Details" :
                                    "Final Setup"
                        ) : "Let's build your profile"}
                    </h1>
                    <p className="text-gray-600 mt-2 font-medium">
                        {isEmployer ?
                            "Tell us about your business to attract the best talent" :
                            "Just 4 quick questions to help us find you the best jobs"}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border-2 border-red-100 text-red-700 px-6 py-4 rounded-2xl mb-6 font-medium animate-in fade-in zoom-in-95">
                        {error}
                    </div>
                )}

                {isEmployer ? (
                    <EmployerOnboardingForm
                        step={step}
                        setStep={setStep}
                        formData={employerData}
                        setFormData={setEmployerData}
                        onSubmit={handleEmployerSubmit}
                        onBack={() => setStep(step - 1)}
                        isSubmitting={isSubmitting || logoLoading}
                        totalSteps={totalSteps}
                        logoPreview={logoPreview}
                        setLogoPreview={setLogoPreview}
                        setLogo={setLogo}
                        setLocalRole={setLocalRole}
                    />
                ) : (
                    <JobSeekerOnboardingForm
                        step={step}
                        setStep={setStep}
                        formData={jobSeekerData}
                        setFormData={setJobSeekerData}
                        onSubmit={handleJobSeekerSubmit}
                        onBack={() => setStep(step - 1)}
                        isSubmitting={isSubmitting}
                        totalSteps={totalSteps}
                        setLocalRole={setLocalRole}
                    />
                )}
            </div>
        </div>
    );
}

// Job Seeker Onboarding Form Component
function JobSeekerOnboardingForm({ step, setStep, formData, setFormData, onSubmit, onBack, isSubmitting, totalSteps, setLocalRole }: any) {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 text-center">
                    <div className="flex justify-center mb-2">
                        <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center border-2 border-teal-100">
                            <Target className="h-10 w-10 text-teal-600" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="text-xl font-bold text-gray-800 block">What is your primary profession?</label>
                        <input
                            type="text"
                            required
                            value={formData.primarySkill}
                            onChange={(e) => setFormData({ ...formData, primarySkill: e.target.value })}
                            className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-xl font-medium shadow-sm hover:border-gray-200"
                            placeholder="e.g. Frontend Developer"
                            autoFocus
                        />
                        <p className="text-gray-400 text-sm">We'll use this to match you with relevant jobs</p>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 text-center">
                    <div className="flex justify-center mb-2">
                        <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center border-2 border-teal-100">
                            <Briefcase className="h-10 w-10 text-teal-600" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="text-xl font-bold text-gray-800 block">How many years of experience do you have?</label>
                        <select
                            required
                            value={formData.experience}
                            onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                            className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-xl font-medium appearance-none bg-white shadow-sm hover:border-gray-200"
                        >
                            <option value="">Select Experience</option>
                            <option value="0">Student / Fresher</option>
                            <option value="1">1 Year</option>
                            <option value="2">2 Years</option>
                            <option value="3">3 Years</option>
                            <option value="5">5+ Years</option>
                            <option value="10">10+ Years</option>
                        </select>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-center mb-2">
                        <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center border-2 border-teal-100">
                            <MapPin className="h-10 w-10 text-teal-600" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-gray-700 mb-2 block ml-1">List your top 3 skills (comma separated)</label>
                            <input
                                type="text"
                                required
                                value={formData.skills}
                                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium shadow-sm hover:border-gray-200"
                                placeholder="React, UI Design, Marketing"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-700 mb-2 block ml-1">Where are you located?</label>
                            <input
                                type="text"
                                required
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium shadow-sm hover:border-gray-200"
                                placeholder="e.g. Karachi, Pakistan"
                            />
                        </div>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 text-center">
                    <div className="flex justify-center mb-2">
                        <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center border-2 border-teal-100">
                            <CheckCircle className="h-10 w-10 text-teal-600" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-2xl font-black text-gray-900">All set!</h3>
                        <p className="text-gray-600 text-lg">One last step to unlock all premium job search features.</p>
                        <div className="bg-teal-50 p-6 rounded-3xl border-2 border-teal-100">
                            <p className="text-teal-800 font-bold mb-2">Registration Benefits:</p>
                            <ul className="text-left text-sm text-teal-700 space-y-2">
                                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Direct access to employers</li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> AI Resume Matching</li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Featured Candidate status</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex gap-4 pt-4">
                {step > 1 && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-400 rounded-2xl font-bold hover:bg-gray-50 transition-all font-bold"
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
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                    ) : (
                        <>
                            {step === totalSteps ? 'Complete Setup' : 'Continue'}
                            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>

            {/* Role Correction Tool */}
            <div className="pt-8 border-t border-gray-100 mt-8 text-center">
                <p className="text-sm text-gray-400 mb-2">Seeing the wrong questions?</p>
                <button
                    type="button"
                    onClick={() => {
                        if (confirm("Are you sure you want to change your account type to Employer?")) {
                            setLocalRole('employer');
                            setStep(1);
                        }
                    }}
                    className="text-teal-600 text-sm font-bold hover:underline"
                >
                    I am an Employer, not a Job Seeker
                </button>
            </div>
        </form>
    );
}

// Employer Onboarding Form Component
function EmployerOnboardingForm({
    step, setStep, formData, setFormData, onSubmit, onBack, isSubmitting, totalSteps,
    logoPreview, setLogoPreview, setLogo, setLocalRole
}: any) {
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                alert('Logo must be less than 2MB');
                return;
            }
            setLogo(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="text-center">
                        <div className="relative inline-block group">
                            <div className="w-28 h-28 bg-gray-50 border-4 border-dashed border-gray-200 rounded-3xl flex items-center justify-center overflow-hidden transition-all group-hover:border-teal-400">
                                {logoPreview ? (
                                    <Image
                                        src={logoPreview}
                                        alt="Logo Preview"
                                        width={112}
                                        height={112}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Building2 className="h-10 w-10 text-gray-300 group-hover:text-teal-400" />
                                )}
                            </div>
                            <label className="absolute -bottom-2 -right-2 bg-teal-600 text-white p-2 rounded-xl cursor-pointer shadow-lg hover:bg-teal-700 transition-all border-4 border-white">
                                <Upload className="h-4 w-4" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                            </label>
                        </div>
                        <p className="text-xs text-gray-400 mt-3 font-medium">Company Logo (Recommended)</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Company Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.companyName}
                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium shadow-sm hover:border-gray-200"
                                placeholder="e.g. Acme Corp"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Company Tagline / Slogan</label>
                            <input
                                type="text"
                                value={formData.tagline}
                                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium shadow-sm hover:border-gray-200"
                                placeholder="e.g. Hiring the best for the best"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Official Website</label>
                            <input
                                type="url"
                                value={formData.companyWebsite}
                                onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                                className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium shadow-sm hover:border-gray-200"
                                placeholder="https://www.acme.com"
                            />
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-center mb-2">
                        <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center border-2 border-teal-100">
                            <Users className="h-10 w-10 text-teal-600" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Company Size</label>
                            <select
                                required
                                value={formData.companySize}
                                onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                                className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium appearance-none bg-white shadow-sm hover:border-gray-200"
                            >
                                <option value="">Select Size</option>
                                <option value="1-10">1-10 emp</option>
                                <option value="11-50">11-50 emp</option>
                                <option value="51-200">51-200 emp</option>
                                <option value="201-500">201-500 emp</option>
                                <option value="501+">501+ emp</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Industry</label>
                            <select
                                required
                                value={formData.industry}
                                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium appearance-none bg-white shadow-sm hover:border-gray-200"
                            >
                                <option value="">Industry</option>
                                <option value="technology">Tech</option>
                                <option value="healthcare">Health</option>
                                <option value="finance">Finance</option>
                                <option value="education">Education</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">City *</label>
                            <input
                                type="text"
                                required
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium shadow-sm hover:border-gray-200"
                                placeholder="e.g. Lahore"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Complete Address</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium shadow-sm hover:border-gray-200"
                                placeholder="Building, Street, Area"
                            />
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-center mb-2">
                        <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center border-2 border-teal-100">
                            <Phone className="h-10 w-10 text-teal-600" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Hiring Manager Name</label>
                            <input
                                type="text"
                                required
                                value={formData.contactPerson}
                                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium shadow-sm hover:border-gray-200"
                                placeholder="Full Name"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Contact Phone</label>
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium shadow-sm hover:border-gray-200"
                                placeholder="03XXXXXXXXX"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">About the Company</label>
                            <textarea
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-teal-500 focus:outline-none transition-all text-lg font-medium h-32 resize-none shadow-sm hover:border-gray-200"
                                placeholder="What makes your company special?"
                            />
                        </div>
                    </div>
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

            {/* Role Correction Tool */}
            <div className="pt-8 border-t border-gray-100 mt-8 text-center">
                <p className="text-sm text-gray-400 mb-2">Seeing the wrong questions?</p>
                <button
                    type="button"
                    onClick={() => {
                        if (confirm("Are you sure you want to change your account type to Job Seeker?")) {
                            setLocalRole('job_seeker');
                            setStep(1);
                        }
                    }}
                    className="text-teal-600 text-sm font-bold hover:underline"
                >
                    I am a Job Seeker, not an Employer
                </button>
            </div>
        </form>
    );
}