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
    EyeOff
} from 'lucide-react';
import { INDUSTRY_CATEGORIES } from '@/lib/data/categories';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { register, user, loading: authLoading } = useAuth();

    const [step, setStep] = useState(1);
    const [role, setRole] = useState<'jobseeker' | 'employer'>(
        (searchParams.get('role') as any) || 'jobseeker'
    );

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        city: '',
        industry: '',
        subcategory: ''
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            router.push(user.role === 'employer' ? '/employer/dashboard' : '/dashboard');
        }
    }, [user, router]);

    const industries = INDUSTRY_CATEGORIES;
    const subcategories = industries.find(i => i.id === formData.industry)?.subcategories || [];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'industry') {
            setFormData(prev => ({ ...prev, subcategory: '' }));
        }
    };

    const nextStep = () => {
        if (step === 2) {
            if (!formData.fullName || !formData.email || !formData.password || !formData.phone) {
                setError('Please fill in all basic details.');
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

        if (!formData.industry || !formData.subcategory) {
            setError('Please select your industry and subcategory.');
            return;
        }

        setLoading(true);
        try {
            await register(formData.email, formData.password, {
                displayName: formData.fullName,
                industry: formData.industry,
                subcategory: formData.subcategory,
                onboardingCompleted: true,
                profile: {
                    fullName: formData.fullName,
                    phone: formData.phone,
                    location: formData.city,
                    experience: [],
                    education: [],
                    certifications: [],
                    skills: [],
                    profileStrength: 25
                }
            }, ((role as any) === 'jobseeker' ? 'job_seeker' : role) as any);

            // Redirect will happen via useEffect, or manually
            router.push('/auth/verify-payment');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create account.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center p-4 py-12">
            <div className="max-w-md w-full">
                {/* Logo Link */}
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
                        <span className={cn(step >= 1 ? "text-[#1B4FD8]" : "")}>Role Selection</span>
                        <span className={cn(step >= 2 ? "text-[#1B4FD8]" : "")}>Basic Details</span>
                        <span className={cn(step >= 3 ? "text-[#1B4FD8]" : "")}>Industry</span>
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

                    {/* STEP 1: ROLE SELECTION */}
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
                                        "relative p-6 rounded-2xl border-2 flex flex-col items-center text-center transition-all group",
                                        role === 'jobseeker'
                                            ? "border-[#1B4FD8] bg-blue-50/50"
                                            : "border-slate-100 bg-white hover:border-blue-200"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors",
                                        role === 'jobseeker' ? "bg-[#1B4FD8] text-white" : "bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                                    )}>
                                        <User className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-[#0F172A]">I'm a Job Seeker</span>
                                    <span className="text-xs text-[#64748B] mt-1">Found employment through video intros</span>
                                    {role === 'jobseeker' && (
                                        <div className="absolute top-4 right-4 text-[#1B4FD8]">
                                            <ShieldCheck className="w-6 h-6" />
                                        </div>
                                    )}
                                </button>

                                <button
                                    onClick={() => setRole('employer')}
                                    className={cn(
                                        "relative p-6 rounded-2xl border-2 flex flex-col items-center text-center transition-all group",
                                        role === 'employer'
                                            ? "border-[#1B4FD8] bg-blue-50/50"
                                            : "border-slate-100 bg-white hover:border-blue-200"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors",
                                        role === 'employer' ? "bg-[#1B4FD8] text-white" : "bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                                    )}>
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-[#0F172A]">I'm an Employer</span>
                                    <span className="text-xs text-[#64748B] mt-1">Find top talent through video pitches</span>
                                    {role === 'employer' && (
                                        <div className="absolute top-4 right-4 text-[#1B4FD8]">
                                            <ShieldCheck className="w-6 h-6" />
                                        </div>
                                    )}
                                </button>
                            </div>

                            <button
                                onClick={nextStep}
                                className="w-full py-4 bg-[#1B4FD8] text-white rounded-full font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                            >
                                Continue <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* STEP 2: BASIC DETAILS */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-xl font-bold text-[#0F172A] mb-6">Create your account</h2>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#64748B] uppercase px-1">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                name="fullName"
                                                placeholder="John Doe"
                                                value={formData.fullName}
                                                onChange={handleInputChange}
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] focus:ring-1 focus:ring-blue-100 outline-none transition-all text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#64748B] uppercase px-1">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="email"
                                                name="email"
                                                placeholder="john@example.com"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] focus:ring-1 focus:ring-blue-100 outline-none transition-all text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-[#64748B] uppercase px-1">Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    name="password"
                                                    placeholder="••••••••"
                                                    value={formData.password}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-12 pr-12 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] focus:ring-1 focus:ring-blue-100 outline-none transition-all text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1B4FD8] transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-[#64748B] uppercase px-1">Confirm</label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    placeholder="••••••••"
                                                    value={formData.confirmPassword}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 pr-12 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] focus:ring-1 focus:ring-blue-100 outline-none transition-all text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1B4FD8] transition-colors"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-[#64748B] uppercase px-1">Phone Number</label>
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
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={prevStep}
                                    className="px-6 py-4 bg-slate-50 text-slate-600 rounded-full font-bold hover:bg-slate-100 transition-all flex items-center justify-center"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={nextStep}
                                    className="flex-1 py-4 bg-[#1B4FD8] text-white rounded-full font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                >
                                    Continue <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: INDUSTRY & SUB-CATEGORY */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-xl font-bold text-[#0F172A] mb-6">Where do you work?</h2>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#64748B] uppercase px-1">Industry Category</label>
                                    <select
                                        name="industry"
                                        value={formData.industry}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] focus:ring-1 focus:ring-blue-100 outline-none transition-all text-sm bg-white"
                                    >
                                        <option value="">Select Industry</option>
                                        {industries.map(ind => (
                                            <option key={ind.id} value={ind.id}>{ind.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#64748B] uppercase px-1">Sub-Category</label>
                                    <select
                                        name="subcategory"
                                        value={formData.subcategory}
                                        onChange={handleInputChange}
                                        disabled={!formData.industry}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1B4FD8] focus:ring-1 focus:ring-blue-100 outline-none transition-all text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                    >
                                        <option value="">Select Sub-Category</option>
                                        {subcategories.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-6 mt-8">
                                    <div className="flex gap-3 text-blue-800">
                                        <Info className="w-6 h-6 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-bold mb-1">One-time Activation Fee</p>
                                            <p className="opacity-90 leading-relaxed">
                                                To activate your profile and start posting video intros, a small fee of **PKR 1,000** is required.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={prevStep}
                                    className="px-6 py-4 bg-slate-50 text-slate-600 rounded-full font-bold hover:bg-slate-100 transition-all flex items-center justify-center"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-1 py-4 bg-[#F97316] text-white rounded-full font-bold shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                                >
                                    {loading ? (
                                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>Create Account & Proceed <ArrowRight className="w-5 h-5" /></>
                                    )}
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