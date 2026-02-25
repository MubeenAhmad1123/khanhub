'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
    Loader2,
    CheckCircle,
    Building2,
    Users,
    User,
    Phone,
    Video,
    MapPin,
    Briefcase,
    Upload,
    ArrowRight,
    Target,
    Globe,
    Info,
    ShieldCheck,
    Calendar,
    BriefcaseIcon,
    ArrowLeft,
    X,
    Sparkles
} from 'lucide-react';
import { INDUSTRIES, getSubcategories, getRoles } from '@/lib/constants/categories';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { cn } from '@/lib/utils';

const CAREER_LEVELS = ['Student', 'Entry Level', 'Mid Level', 'Senior Level', 'Manager', 'Executive'];

const SALARY_RANGES = [
    'PKR 20,000 – 30,000',
    'PKR 30,000 – 50,000',
    'PKR 50,000 – 80,000',
    'PKR 80,000 – 120,000',
    'PKR 120,000 – 200,000',
    'PKR 200,000+',
];

const COMPANY_SIZES = [
    '1–10 employees',
    '11–50 employees',
    '51–200 employees',
    '201–500 employees',
    '500+ employees',
];

const COMPANY_TYPES = ['Private', 'Government', 'NGO', 'Startup', 'Semi-Government', 'Multinational'];

export default function OnboardingPage() {
    const router = useRouter();
    const { user, updateProfile, loading } = useAuth();

    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [role, setRole] = useState<'job_seeker' | 'employer' | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Form state matching flat schema
    const [formData, setFormData] = useState({
        // Job Seeker
        gender: '',
        dateOfBirth: '',
        city: '',
        careerLevel: '',
        totalExperience: '',
        desiredSalary: '',
        desiredJobTitle: '',
        desiredIndustry: '',
        desiredSubcategory: '',
        professionalSummary: '',
        phone: '',

        // Employer
        companyName: '',
        companyLocation: '',
        companySize: '',
        companyType: '',
        yearEstablished: '',
        website: '',

        // Employer Job Post Details (New)
        firstJobTitle: '',
        firstJobSkills: [] as string[],
        firstJobExperience: '',
        firstJobRequirements: '',
        firstJobCity: '',
        firstJobWorkType: 'On-Site',
        firstJobBudget: '',
        firstJobHideSalary: false,

        // Employer Contact (New)
        hrFullName: '',
        hrPhone: '',
    });

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
            return;
        }

        if (user?.onboardingCompleted || user?.onboardingComplete) {
            router.push('/auth/verify-payment');
            return;
        }

        if (user?.role && !role) {
            setRole(user.role as any);
            // Pre-fill from existing data if any
            setFormData(prev => ({
                ...prev,
                companyName: user.companyName || user.displayName || '',
                phone: user.phone || '',
                city: user.city || '',
                desiredIndustry: user.desiredIndustry || '',
                desiredJobTitle: user.desiredJobTitle || '',
            }));
        }
    }, [user, loading, router, role]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const nextStep = () => {
        setError('');
        setStep(prev => prev + 1);
        window.scrollTo(0, 0);
    };

    const prevStep = () => {
        setError('');
        setStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const finalData = { ...formData };

            // For employers, structure the first job post
            if (role === 'employer') {
                (finalData as any).firstJobPost = {
                    jobTitle: formData.firstJobTitle,
                    skills: formData.firstJobSkills,
                    experienceRequired: formData.firstJobExperience,
                    city: formData.firstJobCity,
                    workType: formData.firstJobWorkType,
                    maxBudget: Number(formData.firstJobBudget) || 0,
                    hideSalary: formData.firstJobHideSalary,
                    otherRequirements: formData.firstJobRequirements,
                };
                (finalData as any).hrName = formData.hrFullName;
                (finalData as any).phone = formData.hrPhone; // Use HR phone as main account phone if employer
            }

            await updateProfile({
                ...finalData,
                onboardingCompleted: true,
                onboardingComplete: true,
                updatedAt: new Date(),
            } as any);

            router.push('/auth/verify-payment');
        } catch (err: any) {
            console.error('Onboarding update error:', err);
            setError(err.message || 'Failed to complete profile.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!mounted || loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F0F4F8]">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
        );
    }

    const totalSteps = 1;

    return (
        <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-4 py-12 font-sans">
            <div className="max-w-xl w-full">

                {/* Logo Section */}
                <div className="text-center mb-8 text-blue-600">
                    <div className="inline-flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <ShieldCheck className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                            KhanHub<span className="text-blue-600">Setup</span>
                        </h1>
                    </div>
                    <p className="mt-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Completing your profile...</p>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-500/5 border border-slate-100 overflow-hidden">
                    {error && (
                        <div className="m-8 mb-0 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex gap-3">
                            <Info className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-8 md:p-12">

                        {/* ROLE FALLBACK */}
                        {!role && (
                            <div className="space-y-8 text-center animate-in fade-in zoom-in-95">
                                <h2 className="text-2xl font-black text-slate-900 uppercase italic">Choose Account Type</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <button type="button" onClick={() => setRole('job_seeker')} className="p-6 border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
                                        <User className="w-10 h-10 mx-auto mb-3 text-slate-300 group-hover:text-blue-600" />
                                        <span className="block font-black text-slate-900 uppercase text-xs">Candidate</span>
                                    </button>
                                    <button type="button" onClick={() => setRole('employer')} className="p-6 border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
                                        <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-300 group-hover:text-blue-600" />
                                        <span className="block font-black text-slate-900 uppercase text-xs">Employer</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* JOB SEEKER SINGLE STEP */}
                        {role === 'job_seeker' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-black text-slate-900 uppercase italic">Personal Info</h2>
                                    <p className="text-slate-500 text-sm font-medium">Basic details for your profile</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                                        <select name="gender" value={formData.gender} onChange={handleInputChange} required className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900">
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                                        <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} required className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900" />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current City</label>
                                        <input type="text" name="city" value={formData.city} onChange={handleInputChange} required placeholder="e.g. Lahore" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900" />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="03XXXXXXXXX"
                                                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Career Level</label>
                                        <select name="careerLevel" value={formData.careerLevel} onChange={handleInputChange} required className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900">
                                            <option value="">Select Level</option>
                                            {CAREER_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
                                    <Info className="w-6 h-6 text-amber-600 flex-shrink-0" />
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest italic">Activation Notice</h4>
                                        <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
                                            A one-time PKR 1,000 fee is required to activate your profile after this step.
                                        </p>
                                    </div>
                                </div>

                                <button type="submit" disabled={submitting} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 disabled:opacity-70 mt-4">
                                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Complete & Pay <ArrowRight className="w-6 h-6" /></>}
                                </button>
                            </div>
                        )}

                        {/* EMPLOYER SINGLE STEP */}
                        {role === 'employer' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-black text-slate-900 uppercase italic">Company Info</h2>
                                    <p className="text-slate-500 text-sm font-medium">Details for your company profile</p>
                                </div>
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                                        <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} required className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Size</label>
                                            <select name="companySize" value={formData.companySize} onChange={handleInputChange} required className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900 text-xs">
                                                <option value="">Select Size</option>
                                                {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Industry</label>
                                            <SearchableSelect
                                                options={INDUSTRIES.map(i => ({ id: i.id, label: i.label }))}
                                                value={formData.desiredIndustry}
                                                onChange={(val) => handleSelectChange('desiredIndustry', val)}
                                                placeholder="Select Industry..."
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                                        <input type="text" name="companyLocation" value={formData.companyLocation} onChange={handleInputChange} required placeholder="e.g. Karachi" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900" />
                                    </div>

                                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
                                        <Info className="w-6 h-6 text-amber-600 flex-shrink-0" />
                                        <div className="space-y-1">
                                            <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest italic">Activation Notice</h4>
                                            <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
                                                A one-time PKR 1,000 fee is required to activate your company profile after this step.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" disabled={submitting} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 disabled:opacity-70 mt-4">
                                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Complete & Pay <ArrowRight className="w-6 h-6" /></>}
                                </button>
                            </div>
                        )}

                    </form>
                </div>
            </div>
        </div>
    );
}
