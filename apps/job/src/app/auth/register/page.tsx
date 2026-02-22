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
    DollarSign,
    MessageCircle,
} from 'lucide-react';
import { INDUSTRIES, getSubcategories, getRoles } from '@/lib/constants/categories';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const COMPANY_SIZES = [
    '1–10 employees',
    '11–50 employees',
    '51–200 employees',
    '201–500 employees',
    '500+ employees',
];

const COMPANY_TYPES = ['Private', 'Government', 'NGO', 'Startup', 'Semi-Government', 'Multinational'];

const SALARY_RANGES = [
    'PKR 20,000 – 30,000',
    'PKR 30,000 – 50,000',
    'PKR 50,000 – 80,000',
    'PKR 80,000 – 120,000',
    'PKR 120,000 – 200,000',
    'PKR 200,000+',
];

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { register, loginWithGoogle, user } = useAuth();

    const [step, setStep] = useState(1);
    const [role, setRole] = useState<'jobseeker' | 'employer'>(
        (searchParams.get('role') as any) || 'jobseeker'
    );

    // Shared form state
    const [formData, setFormData] = useState({
        // Account
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        city: '',
        // Job seeker specific
        industry: '',
        subcategory: '',
        primarySkill: '',
        // Employer specific
        companySize: '',
        companyType: '',
        yearEstablished: '',
        companyWebsite: '',
        companyLogoUrl: '',
        fullAddress: '',
        whatsapp: '',
        salaryRange: '',
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            // If onboarding not done → go to onboarding first, then it'll redirect to verify-payment
            if (!user.onboardingCompleted) {
                router.push('/auth/onboarding');
            } else {
                router.push('/auth/verify-payment');
            }
        }
    }, [user, router]);

    // Derived options for job seekers
    const industryOptions = INDUSTRIES.map(i => ({ id: i.id, label: i.label }));
    const subcategoryOptions = getSubcategories(formData.industry).map(s => ({ id: s.id, label: s.label }));
    const roleOptions = getRoles(formData.industry, formData.subcategory).map(r => ({ id: r, label: r }));

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            if (name === 'industry') { updated.subcategory = ''; updated.primarySkill = ''; }
            if (name === 'subcategory') { updated.primarySkill = ''; }
            return updated;
        });
    };

    const nextStep = () => {
        if (step === 2) {
            if (!formData.fullName || !formData.email || !formData.password || !formData.phone) {
                setError('Please fill in all required details.');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match.');
                return;
            }
        }
        setError('');
        setStep(prev => prev + 1);
    };

    const prevStep = () => {
        setError('');
        setStep(prev => prev - 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (role === 'jobseeker') {
            if (!formData.industry || !formData.subcategory || !formData.primarySkill) {
                setError('Please select your industry, sub-sector, and role.');
                return;
            }
        } else {
            if (!formData.companySize || !formData.companyType) {
                setError('Please fill in company size and type.');
                return;
            }
        }

        setLoading(true);
        try {
            if (role === 'jobseeker') {
                await register(formData.email, formData.password, {
                    displayName: formData.fullName,
                    industry: formData.industry,
                    subcategory: formData.subcategory,
                    role_in_category: formData.primarySkill,
                    onboardingCompleted: true,
                    profile: {
                        fullName: formData.fullName,
                        phone: formData.phone,
                        location: formData.city,
                        preferredJobTitle: formData.primarySkill,
                        industry: formData.industry,
                        preferredSubcategory: formData.subcategory,
                        experience: [],
                        education: [],
                        certifications: [],
                        skills: [],
                        profileStrength: 35,
                    },
                }, 'job_seeker' as any);
            } else {
                await register(formData.email, formData.password, {
                    displayName: formData.fullName,
                    onboardingCompleted: true,
                    companyProfile: {
                        companyName: formData.fullName,
                        contactPhone: formData.phone,
                        whatsapp: formData.whatsapp,
                        companySize: formData.companySize,
                        companyType: formData.companyType,
                        yearEstablished: formData.yearEstablished,
                        website: formData.companyWebsite,
                        logoUrl: formData.companyLogoUrl,
                        address: formData.fullAddress,
                        city: formData.city,
                        salaryRange: formData.salaryRange,
                    },
                }, 'employer' as any);
            }

            // Both roles must pay the registration fee
            router.push('/auth/verify-payment');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const stepLabel = role === 'employer'
        ? ['Role', 'Account', 'Company Info']
        : ['Role', 'Account', 'Your Profession'];

    const handleGoogleRegister = async (googleRole: 'job_seeker' | 'employer') => {
        setError('');
        setGoogleLoading(true);
        try {
            await loginWithGoogle(googleRole);
            // useEffect will redirect based on onboardingCompleted flag
        } catch (err: any) {
            setError(err.message || 'Google sign-up failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const GoogleIcon = () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center p-4 py-12">
            <div className="max-w-lg w-full">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-2 mb-8 group">
                    <div className="w-10 h-10 bg-[#1B4FD8] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-black text-[#0F172A] tracking-tight italic">
                        KhanHub<span className="text-[#1B4FD8]">Jobs</span>
                    </span>
                </Link>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-xs font-bold text-[#64748B] mb-2 px-1">
                        {stepLabel.map((label, i) => (
                            <span key={label} className={cn(step >= i + 1 ? 'text-[#1B4FD8]' : '')}>{label}</span>
                        ))}
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#1B4FD8] transition-all duration-500 ease-out"
                            style={{ width: `${(step / 3) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Form Container */}
                <div className="bg-white rounded-2xl shadow-xl shadow-blue-500/5 border border-slate-100 p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex gap-3">
                            <Info className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* ---------- STEP 1: ROLE SELECTION ---------- */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-black text-[#0F172A] mb-2">How will you use KhanHub?</h1>
                                <p className="text-[#64748B] text-sm">Choose the role that fits you best</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    onClick={() => setRole('jobseeker')}
                                    className={cn(
                                        'relative p-6 rounded-2xl border-2 flex flex-col items-center text-center transition-all group',
                                        role === 'jobseeker'
                                            ? 'border-[#1B4FD8] bg-blue-50/50'
                                            : 'border-slate-100 bg-white hover:border-blue-200'
                                    )}
                                >
                                    <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors', role === 'jobseeker' ? 'bg-[#1B4FD8] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600')}>
                                        <User className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-[#0F172A]">I'm a Job Seeker</span>
                                    <span className="text-xs text-[#64748B] mt-1">Get hired through video intros</span>
                                    {role === 'jobseeker' && <div className="absolute top-4 right-4 text-[#1B4FD8]"><ShieldCheck className="w-6 h-6" /></div>}
                                </button>

                                <button
                                    onClick={() => setRole('employer')}
                                    className={cn(
                                        'relative p-6 rounded-2xl border-2 flex flex-col items-center text-center transition-all group',
                                        role === 'employer'
                                            ? 'border-[#1B4FD8] bg-blue-50/50'
                                            : 'border-slate-100 bg-white hover:border-blue-200'
                                    )}
                                >
                                    <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors', role === 'employer' ? 'bg-[#1B4FD8] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600')}>
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-[#0F172A]">I'm an Employer / Company</span>
                                    <span className="text-xs text-[#64748B] mt-1">Find top talent through video pitches</span>
                                    {role === 'employer' && <div className="absolute top-4 right-4 text-[#1B4FD8]"><ShieldCheck className="w-6 h-6" /></div>}
                                </button>
                            </div>

                            <button
                                onClick={nextStep}
                                className="w-full py-4 bg-[#1B4FD8] text-white rounded-full font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                            >
                                Continue with Email <ArrowRight className="w-5 h-5" />
                            </button>

                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                                <div className="relative flex justify-center text-xs"><span className="px-4 bg-white text-slate-400 font-bold uppercase tracking-widest">Or sign up instantly with</span></div>
                            </div>

                            {/* Google Sign-Up */}
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleGoogleRegister('job_seeker')}
                                    disabled={googleLoading}
                                    className="w-full border border-slate-200 text-slate-700 py-3 rounded-full font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-3 disabled:opacity-50 text-sm"
                                >
                                    <GoogleIcon />
                                    Google — I&apos;m a Job Seeker
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleGoogleRegister('employer')}
                                    disabled={googleLoading}
                                    className="w-full border border-slate-200 text-slate-700 py-3 rounded-full font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-3 disabled:opacity-50 text-sm"
                                >
                                    <GoogleIcon />
                                    Google — I&apos;m an Employer
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ---------- STEP 2: ACCOUNT DETAILS ---------- */}
                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-xl font-bold text-[#0F172A] mb-2">
                                {role === 'employer' ? 'Company Account Details' : 'Create Your Account'}
                            </h2>

                            {/* Full Name / Company Name */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-[#64748B] uppercase px-1">
                                    {role === 'employer' ? 'Company / Organisation Name' : 'Full Name'}
                                </label>
                                <div className="relative">
                                    {role === 'employer' ? <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> : <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
                                    <input
                                        type="text"
                                        name="fullName"
                                        placeholder={role === 'employer' ? 'e.g. Khan & Sons Pvt Ltd' : 'John Doe'}
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] focus:ring-1 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-[#64748B] uppercase px-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="info@company.com"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] focus:ring-1 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            {/* Password row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#64748B] uppercase px-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-12 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] focus:ring-1 focus:ring-blue-100 outline-none transition-all text-sm"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1B4FD8] transition-colors">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#64748B] uppercase px-1">Confirm</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="confirmPassword"
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className="w-full px-4 pr-12 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] focus:ring-1 focus:ring-blue-100 outline-none transition-all text-sm"
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1B4FD8] transition-colors">
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Phone + City */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#64748B] uppercase px-1">Phone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            name="phone"
                                            placeholder="0300-1234567"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] focus:ring-1 focus:ring-blue-100 outline-none transition-all text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#64748B] uppercase px-1">City</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            name="city"
                                            placeholder="e.g. Lahore"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] focus:ring-1 focus:ring-blue-100 outline-none transition-all text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button onClick={prevStep} className="px-6 py-4 bg-slate-50 text-slate-600 rounded-full font-bold hover:bg-slate-100 transition-all flex items-center justify-center">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <button onClick={nextStep} className="flex-1 py-4 bg-[#1B4FD8] text-white rounded-full font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                                    Continue <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ---------- STEP 3a: JOB SEEKER - INDUSTRY & ROLE ---------- */}
                    {step === 3 && role === 'jobseeker' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-xl font-bold text-[#0F172A] mb-2">Your Profession</h2>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-[#64748B] uppercase px-1">Industry</label>
                                <SearchableSelect
                                    options={industryOptions}
                                    value={formData.industry}
                                    onChange={(val) => handleSelectChange('industry', val)}
                                    placeholder="Search Industry..."
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-[#64748B] uppercase px-1">Sub-sector</label>
                                <SearchableSelect
                                    options={subcategoryOptions}
                                    value={formData.subcategory}
                                    onChange={(val) => handleSelectChange('subcategory', val)}
                                    placeholder="Search Sub-sector..."
                                    disabled={!formData.industry}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-[#64748B] uppercase px-1">Your Exact Role / Job Title</label>
                                {roleOptions.length > 0 ? (
                                    <SearchableSelect
                                        options={roleOptions}
                                        value={formData.primarySkill}
                                        onChange={(val) => handleSelectChange('primarySkill', val)}
                                        placeholder="Select your role..."
                                        disabled={!formData.subcategory}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={formData.primarySkill}
                                        onChange={(e) => setFormData({ ...formData, primarySkill: e.target.value })}
                                        disabled={!formData.subcategory}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] focus:ring-1 focus:ring-blue-100 outline-none transition-all text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                        placeholder="Type your job title..."
                                    />
                                )}
                            </div>

                            {/* Fee notice */}
                            <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-4 flex gap-3 text-blue-800">
                                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p className="text-sm leading-relaxed">
                                    <span className="font-bold">One-time Registration Fee: </span>
                                    PKR 1,000 to activate your profile and start connecting with employers.
                                </p>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button onClick={prevStep} className="px-6 py-4 bg-slate-50 text-slate-600 rounded-full font-bold hover:bg-slate-100 transition-all flex items-center justify-center">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-1 py-4 bg-[#F97316] text-white rounded-full font-bold shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                                >
                                    {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Create Account &amp; Proceed <ArrowRight className="w-5 h-5" /></>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ---------- STEP 3b: EMPLOYER - COMPANY INFO ---------- */}
                    {step === 3 && role === 'employer' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-xl font-bold text-[#0F172A] mb-2">Company Information</h2>

                            {/* Company Size + Type */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#64748B] uppercase px-1">Company Size</label>
                                    <select
                                        name="companySize"
                                        value={formData.companySize}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] outline-none transition-all text-sm bg-white"
                                    >
                                        <option value="">Select size</option>
                                        {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#64748B] uppercase px-1">Company Type</label>
                                    <select
                                        name="companyType"
                                        value={formData.companyType}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] outline-none transition-all text-sm bg-white"
                                    >
                                        <option value="">Select type</option>
                                        {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Year + Website */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#64748B] uppercase px-1">Year Established</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            name="yearEstablished"
                                            placeholder="e.g. 2010"
                                            min="1900"
                                            max={new Date().getFullYear()}
                                            value={formData.yearEstablished}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] outline-none transition-all text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#64748B] uppercase px-1">Website</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="url"
                                            name="companyWebsite"
                                            placeholder="https://company.com"
                                            value={formData.companyWebsite}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] outline-none transition-all text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Company Logo URL */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-[#64748B] uppercase px-1">Company Logo URL <span className="text-slate-400 normal-case font-medium">(optional)</span></label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="url"
                                        name="companyLogoUrl"
                                        placeholder="https://link-to-logo.png"
                                        value={formData.companyLogoUrl}
                                        onChange={handleInputChange}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            {/* Full Address */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-[#64748B] uppercase px-1">Full Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                    <textarea
                                        name="fullAddress"
                                        placeholder="Street, Area, City, Province"
                                        value={formData.fullAddress}
                                        onChange={handleInputChange}
                                        rows={2}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] outline-none transition-all text-sm resize-none"
                                    />
                                </div>
                            </div>

                            {/* WhatsApp + Salary Range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#64748B] uppercase px-1">WhatsApp</label>
                                    <div className="relative">
                                        <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            name="whatsapp"
                                            placeholder="0300-1234567"
                                            value={formData.whatsapp}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] outline-none transition-all text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#64748B] uppercase px-1">Salary Range</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        <select
                                            name="salaryRange"
                                            value={formData.salaryRange}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] outline-none transition-all text-sm bg-white"
                                        >
                                            <option value="">Select range</option>
                                            {SALARY_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Fee notice */}
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800">
                                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p className="text-sm leading-relaxed">
                                    <span className="font-bold">One-time Registration Fee: </span>
                                    PKR 1,000 to activate your company profile and start receiving talent applications.
                                </p>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button onClick={prevStep} className="px-6 py-4 bg-slate-50 text-slate-600 rounded-full font-bold hover:bg-slate-100 transition-all flex items-center justify-center">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-1 py-4 bg-[#F97316] text-white rounded-full font-bold shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                                >
                                    {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Register &amp; Pay Fee <ArrowRight className="w-5 h-5" /></>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <p className="mt-8 text-center text-sm text-[#64748B]">
                    Already have an account? <Link href="/auth/login" className="font-bold text-[#1B4FD8]">Login here</Link>
                </p>
            </div>
        </div>
    );
}