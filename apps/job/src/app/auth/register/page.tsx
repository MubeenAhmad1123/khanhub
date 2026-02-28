'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    User,
    Building2,
    ArrowRight,
    ArrowLeft,
    ShieldCheck,
    Info,
    Mail,
    Lock,
    Phone,
    MapPin,
    Briefcase,
    Eye,
    EyeOff,
    Globe,
    Calendar,
    BriefcaseIcon,
    Loader2,
    Sparkles,
} from 'lucide-react';
import { INDUSTRIES, getSubcategories, getRoles } from '@/lib/constants/categories';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { checkFieldUniqueness } from '@/lib/firebase/firestore';

const STORAGE_KEY = 'khanhub_registration_form';

const COMPANY_SIZES = [
    '1–10 employees',
    '11–50 employees',
    '51–200 employees',
    '201–500 employees',
    '500+ employees',
];

const COMPANY_TYPES = ['Private', 'Government', 'NGO', 'Startup', 'Semi-Government', 'Multinational'];

const CAREER_LEVELS = ['Student', 'Entry Level', 'Mid Level', 'Senior Level', 'Manager', 'Executive'];

const SALARY_RANGES = [
    'PKR 20,000 – 30,000',
    'PKR 30,000 – 50,000',
    'PKR 50,000 – 80,000',
    'PKR 80,000 – 120,000',
    'PKR 120,000 – 200,000',
    'PKR 200,000+',
];

const INITIAL_FORM_DATA = {
    // Shared / Account
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',

    // Path A: Job Seeker Details
    gender: '',
    dateOfBirth: '',
    city: '',
    careerLevel: '',
    totalExperience: '',
    desiredSalary: '',
    desiredJobTitle: '',
    desiredIndustry: '',
    desiredSubcategory: '',
    skills: [] as string[],
    professionalSummary: '',

    // Path A: Employer / Company Info
    companyName: '',
    companyLocation: '',
    companySize: '',
    companyType: '',
    yearEstablished: '',
    website: '',

    // Path A: Employer Job Post Details (New)
    firstJobTitle: '',
    firstJobSkills: [] as string[],
    firstJobExperience: '',
    firstJobRequirements: '',
    firstJobCity: '',
    firstJobWorkType: 'On-Site',
    firstJobBudget: '',
    firstJobHideSalary: false,

    // Path A: Employer Contact (New)
    hrFullName: '',
    hrPhone: '',
};

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { register, loginWithGoogle, user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState(1);
    const [role, setRole] = useState<'job_seeker' | 'employer'>('job_seeker');
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [showPassword, setShowPassword] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [phoneError, setPhoneError] = useState('');

    const handleEmailBlur = async () => {
        if (!formData.email) return;
        const isUnique = await checkFieldUniqueness('email', formData.email);
        if (!isUnique) setEmailError('This email is already registered.');
        else setEmailError('');
    };

    const handlePhoneBlur = async () => {
        if (!formData.phone) return;
        const isUnique = await checkFieldUniqueness('phone', formData.phone);
        if (!isUnique) setPhoneError('This phone number is already registered.');
        else setPhoneError('');
    };

    // Initial load and hydration safety
    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFormData(prev => ({ ...prev, ...parsed.data }));
                setStep(parsed.step || 1);
                setRole(parsed.role || 'job_seeker');
            } catch (e) {
                console.error('Failed to load saved form', e);
            }
        }
        setIsInitialized(true);
    }, []);

    // Also update role if searchParams change after mount
    useEffect(() => {
        if (!mounted) return;
        const queryRole = searchParams.get('role') as any;
        if (queryRole && (queryRole === 'job_seeker' || queryRole === 'employer')) {
            setRole(queryRole);
        }
    }, [searchParams, mounted]);

    // Save to localStorage on change
    useEffect(() => {
        if (!isInitialized) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            data: formData,
            step,
            role
        }));
    }, [formData, step, role, isInitialized]);

    // Redirect if already logged in (client-only)
    useEffect(() => {
        if (mounted && user && !loading && !googleLoading) {
            // Priority 1: Onboarding MUST be completed
            if (!user.onboardingCompleted) {
                router.push('/auth/onboarding');
            }
            // Priority 2: Payment must be approved
            else if (user.paymentStatus !== 'approved') {
                router.push('/auth/verify-payment');
            }
            // Priority 3: Dashboard access
            else {
                router.push('/dashboard');
            }
        }
    }, [user, router, loading, googleLoading, mounted]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            if (name === 'desiredIndustry') {
                updated.desiredSubcategory = '';
                updated.desiredJobTitle = '';
            }
            if (name === 'desiredSubcategory') {
                updated.desiredJobTitle = '';
            }
            return updated;
        });
    };

    const validateStep = (currentStep: number) => {
        setError('');
        if (currentStep === 1) return true; // Role selection always valid

        if (currentStep === 2) {
            if (!formData.name || !formData.email || !formData.password || !formData.phone) {
                setError('Please fill in all account details.');
                return false;
            }
            if (formData.password.length < 8) {
                setError('Password must be at least 8 characters.');
                return false;
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match.');
                return false;
            }
            if (emailError || phoneError) {
                setError('Please fix the highlighted errors before continuing.');
                return false;
            }
            return true;
        }

        if (currentStep === 3) {
            if (role === 'job_seeker') {
                if (!formData.city || !formData.desiredIndustry || !formData.desiredJobTitle || !formData.careerLevel) {
                    setError('Please complete all professional details.');
                    return false;
                }
            } else {
                if (!formData.companyName || !formData.companySize || !formData.companyLocation || !formData.hrFullName || !formData.desiredIndustry || !formData.yearEstablished || !formData.website) {
                    setError('Please complete company and industry details.');
                    return false;
                }
            }
            return true;
        }

        if (currentStep === 4) {
            if (!formData.professionalSummary || formData.professionalSummary.length < 50) {
                setError('Professional summary must be at least 50 characters.');
                return false;
            }
            return true;
        }

        return true;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(prev => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const prevStep = () => {
        setError('');
        setStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep(step)) return;

        setLoading(true);
        setError('');

        try {
            const finalData = {
                ...formData,
                onboardingCompleted: true, // Mark completed as we've asked all questions
            };

            await register(formData.email, formData.password, finalData, role);

            // Redirect to verify-payment
            router.push('/auth/verify-payment');

            localStorage.removeItem(STORAGE_KEY);
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleRegister = async (googleRole: 'job_seeker' | 'employer') => {
        setError('');
        setGoogleLoading(true);
        try {
            await loginWithGoogle(googleRole);
            // Redirect will be handled by useEffect.
        } catch (err: any) {
            setError(err.message || 'Google sign-up failed.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const totalSteps = 4;
    const progressPercent = (step / totalSteps) * 100;

    if (!mounted) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-4 py-12 font-sans">
            <div className="max-w-xl w-full">

                {/* Logo Section */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 group">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:rotate-12 transition-all">
                            <BriefcaseIcon className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                            KhanHub<span className="text-blue-600">Jobs</span>
                        </h1>
                    </Link>
                    <p className="mt-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Premium Video Job Portal</p>
                </div>

                {/* Registration Header */}
                <div className="mb-10 text-center relative z-10">
                    <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter italic uppercase mb-3">
                        Join the <span className="text-blue-600 underline decoration-blue-200 underline-offset-8">Future</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-tight text-sm">Create your premium account</p>

                    {/* Draft Notice (New) */}
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 animate-pulse">
                        <Sparkles className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Progress automatically saved as draft</span>
                    </div>
                </div>

                {/* Progress Tracker */}
                <div className="mb-8 px-2">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Step {step} of {totalSteps}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{Math.round(progressPercent)}% Completed</span>
                    </div>
                    <div className="h-3 w-full bg-white rounded-full p-1 shadow-inner overflow-hidden border border-slate-100">
                        <div
                            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-700 ease-out shadow-lg"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-500/5 border border-slate-100 overflow-hidden relative">

                    {/* Error Display */}
                    {error && (
                        <div className="m-8 mb-0 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex gap-3 animate-in fade-in slide-in-from-top-2">
                            <Info className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-8 md:p-12">

                        {/* STEP 1: ROLE SELECTION */}
                        {step === 1 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="text-center">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">Who are you?</h2>
                                    <p className="text-slate-500 font-medium text-sm">Select your journey on KhanHub</p>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <button
                                        type="button"
                                        onClick={() => setRole('job_seeker')}
                                        className={cn(
                                            "relative p-8 rounded-[2rem] border-4 transition-all duration-300 group text-left",
                                            role === 'job_seeker'
                                                ? "border-blue-600 bg-blue-50/50 shadow-xl shadow-blue-500/10"
                                                : "border-slate-50 bg-slate-50/30 hover:border-blue-200"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all",
                                            role === 'job_seeker' ? "bg-blue-600 text-white rotate-6" : "bg-white text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                                        )}>
                                            <User className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase italic">Candidate</h3>
                                        <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-tight">I want to find my dream job.</p>
                                        {role === 'job_seeker' && <ShieldCheck className="absolute top-6 right-6 w-8 h-8 text-blue-600" />}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setRole('employer')}
                                        className={cn(
                                            "relative p-8 rounded-[2rem] border-4 transition-all duration-300 group text-left",
                                            role === 'employer'
                                                ? "border-blue-600 bg-blue-50/50 shadow-xl shadow-blue-500/10"
                                                : "border-slate-50 bg-slate-50/30 hover:border-blue-200"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all",
                                            role === 'employer' ? "bg-blue-600 text-white -rotate-6" : "bg-white text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                                        )}>
                                            <Building2 className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase italic">Employer</h3>
                                        <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-tight">I want to hire top talent.</p>
                                        {role === 'employer' && <ShieldCheck className="absolute top-6 right-6 w-8 h-8 text-blue-600" />}
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 group"
                                >
                                    Continue to Credentials <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>

                                <div className="space-y-4 pt-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                                        <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-slate-400"><span className="px-4 bg-white">Fast-Track with</span></div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleGoogleRegister(role)}
                                        disabled={googleLoading}
                                        className="w-full py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-200/50"
                                    >
                                        {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <>
                                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                </svg>
                                                Sign In with Google
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: CREDENTIALS */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">Create Account</h2>
                                    <p className="text-slate-500 font-medium text-sm">Secure your professional workspace</p>
                                </div>

                                <div className="grid grid-cols-1 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{role === 'employer' ? 'Admin Name' : 'Full Name'} <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">پورا نام</span></label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                placeholder={role === 'employer' ? 'Admin Full Name' : 'e.g. Ali Ahmed'}
                                                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">ای میل پتہ</span></label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                onBlur={handleEmailBlur}
                                                placeholder="ali@example.com"
                                                className={cn("w-full pl-12 pr-6 py-4 bg-slate-50 border-2 rounded-2xl focus:bg-white outline-none transition-all font-bold text-slate-900", emailError ? "border-red-400 focus:border-red-500" : "border-slate-50 focus:border-blue-500")}
                                            />
                                        </div>
                                        {emailError && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{emailError}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">پاس ورڈ</span></label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                placeholder="Minimum 8 characters"
                                                className="w-full pl-12 pr-14 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">پاس ورڈ دوبارہ</span></label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleInputChange}
                                                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{role === 'employer' ? 'HR / Admin Phone Number' : 'Phone Number'} <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">فون نمبر</span></label>
                                        <div className="relative group">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                onBlur={handlePhoneBlur}
                                                placeholder="03XXXXXXXXX"
                                                className={cn("w-full pl-12 pr-6 py-4 bg-slate-50 border-2 rounded-2xl focus:bg-white outline-none transition-all font-bold text-slate-900", phoneError ? "border-red-400 focus:border-red-500" : "border-slate-50 focus:border-blue-500")}
                                            />
                                        </div>
                                        {phoneError && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{phoneError}</p>}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="w-20 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all font-black text-sm"
                                    >
                                        <ArrowLeft className="w-6 h-6" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3"
                                    >
                                        Next Step <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: PROFESSIONAL DETAILS */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">
                                        {role === 'employer' ? 'Company Details' : 'Professional Info'}
                                    </h2>
                                    <p className="text-slate-500 font-medium text-sm">Help us understand your background</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {role === 'job_seeker' ? (
                                        <>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current City <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">شہر</span></label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="e.g. Lahore" className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Industry <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">صنعت</span></label>
                                                <SearchableSelect
                                                    options={INDUSTRIES.map(i => ({ id: i.id, label: i.label }))}
                                                    value={formData.desiredIndustry}
                                                    onChange={(val) => handleSelectChange('desiredIndustry', val)}
                                                    placeholder="Select Industry..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Title / Role <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">مطلوبہ عہدہ</span></label>
                                                <input type="text" name="desiredJobTitle" value={formData.desiredJobTitle} onChange={handleInputChange} placeholder="e.g. Software Engineer" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Career Level <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">کیریئر کی سطح</span></label>
                                                <select name="careerLevel" value={formData.careerLevel} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900">
                                                    <option value="">Select Level</option>
                                                    {CAREER_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desired Salary <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">تنخواہ کی حد</span></label>
                                                <select name="desiredSalary" value={formData.desiredSalary} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900">
                                                    <option value="">Select Salary Range</option>
                                                    {SALARY_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">کمپنی کا نام</span></label>
                                                <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Year Established <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">قیام کا سال</span></label>
                                                <input type="number" name="yearEstablished" value={formData.yearEstablished} onChange={handleInputChange} min="1900" max={new Date().getFullYear()} placeholder="e.g. 2015" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Website <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">ویب سائٹ</span></label>
                                                <input type="url" name="website" value={formData.website} onChange={handleInputChange} placeholder="https://example.com" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Industry <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">صنعت</span></label>
                                                <SearchableSelect
                                                    options={INDUSTRIES.map(i => ({ id: i.id, label: i.label }))}
                                                    value={formData.desiredIndustry}
                                                    onChange={(val) => handleSelectChange('desiredIndustry', val)}
                                                    placeholder="Select Industry..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Size <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">کمپنی کا حجم</span></label>
                                                <select name="companySize" value={formData.companySize} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900">
                                                    <option value="">Select Size</option>
                                                    {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">مقام</span></label>
                                                <input type="text" name="companyLocation" value={formData.companyLocation} onChange={handleInputChange} placeholder="e.g. Karachi" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900" />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">HR / Admin Full Name <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">پورا نام</span></label>
                                                <input type="text" name="hrFullName" value={formData.hrFullName} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900" />
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="w-20 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all font-black text-sm"
                                    >
                                        <ArrowLeft className="w-6 h-6" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3"
                                    >
                                        Next Step <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: SUMMARY & SKILLS */}
                        {step === 4 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">Final Polish</h2>
                                    <p className="text-slate-500 font-medium text-sm">Tell us more about yourself</p>
                                </div>

                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            {role === 'employer' ? 'Company Bio' : 'Professional Summary'} (min 50 chars) <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">پیشہ ورانہ تعارف</span>
                                        </label>
                                        <textarea
                                            name="professionalSummary"
                                            value={formData.professionalSummary}
                                            onChange={handleInputChange}
                                            rows={4}
                                            placeholder={role === 'employer' ? "Describe your company culture and what you're looking for..." : "Briefly describe your experience and career goals..."}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900 resize-none"
                                        />
                                        <div className="flex justify-between px-1">
                                            <span className={cn("text-[10px] font-black uppercase tracking-widest", formData.professionalSummary.length < 50 ? "text-red-400" : "text-emerald-500")}>
                                                {formData.professionalSummary.length} / 50 characters minimum
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Skills / Specializations <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">مہارتیں</span></label>
                                        <input
                                            type="text"
                                            placeholder="e.g. React, Project Management, Sales (Press Enter to add)"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = (e.target as HTMLInputElement).value.trim();
                                                    if (val && !formData.skills.includes(val)) {
                                                        setFormData(prev => ({ ...prev, skills: [...prev.skills, val] }));
                                                        (e.target as HTMLInputElement).value = '';
                                                    }
                                                }
                                            }}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                                        />
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {formData.skills.map(skill => (
                                                <span key={skill} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border border-blue-100">
                                                    {skill}
                                                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))}>
                                                        <Sparkles className="w-3 h-3 hover:text-red-500" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="w-20 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all font-black text-sm"
                                    >
                                        <ArrowLeft className="w-6 h-6" />
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3"
                                    >
                                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                            <>
                                                Complete Registration <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                    </form>
                </div>

                {/* Footer Link */}
                <p className="mt-10 text-center font-bold text-slate-500 uppercase tracking-widest text-[10px]">
                    Already on board? <Link href="/auth/login" className="text-blue-600 hover:underline">Login to Portal</Link>
                </p>
            </div>
        </div>
    );
}
