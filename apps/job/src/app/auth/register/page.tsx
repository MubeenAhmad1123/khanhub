'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    User,
    Building,
    ArrowRight,
    Mail,
    Lock,
    Phone,
    Briefcase,
    MapPin,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import CitySearch from '@/components/forms/CitySearch';
import TagInput from '@/components/ui/TagInput';
import { cn } from '@/lib/utils';

const EXPERIENCE_LEVELS = ['Fresher', '1-2 years', '3-5 years', '5-10 years', '10+ years'];

export default function RegisterPage() {
    const router = useRouter();
    const { register, isAuthenticated } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [role, setRole] = useState<'job_seeker' | 'company'>('job_seeker');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        city: '',
        jobTitle: '',
        experienceLevel: '',
        skills: [] as string[],
        industry: '',
        hiringRole: '',
    });

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/feed');
        }
    }, [isAuthenticated, router]);

    // Load draft from local storage
    useEffect(() => {
        const savedDraft = localStorage.getItem('jr_register_draft');
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                setFormData(prev => ({ ...prev, ...parsed }));
                // If role was saved, restore it too
                const savedRole = localStorage.getItem('jr_register_role');
                if (savedRole) setRole(savedRole as any);
            } catch (e) {
                console.error('Failed to load draft');
            }
        }
    }, []);

    // Save draft as user types
    useEffect(() => {
        localStorage.setItem('jr_register_draft', JSON.stringify(formData));
        localStorage.setItem('jr_register_role', role);
    }, [formData, role]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.city) {
                throw new Error('Please fill in all basic information');
            }

            const registrationData = {
                ...formData,
                role,
                onboardingCompleted: true,
                paymentStatus: 'approved', // Registration fee removed
            };

            await register(formData.email, formData.password, registrationData, role as any);

            // Clear draft after success
            localStorage.removeItem('jr_register_draft');
            localStorage.removeItem('jr_register_role');

            router.push('/auth/verify-payment');
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-[#FF0069] selection:text-white">
            <div className="max-w-2xl mx-auto px-6 py-12">
                {/* Logo Section */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-black font-syne tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-[#FF0069] to-[#7638FA]">
                        JOBREEL
                    </h1>
                    <p className="text-[#888888] font-dm-sans uppercase tracking-[0.3em] text-xs mt-2">
                        Scroll. Connect. Get Hired.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-12">
                    {/* SECTION 1: ROLE SELECTION */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-black font-syne uppercase italic tracking-tight">
                            I am a...
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setRole('job_seeker')}
                                className={cn(
                                    "relative p-8 rounded-[24px] border-2 transition-all duration-300 text-left group overflow-hidden",
                                    role === 'job_seeker'
                                        ? "border-[#FF0069] bg-[#111111] shadow-[0_0_30px_rgba(255,0,105,0.2)]"
                                        : "border-[#1F1F1F] bg-[#0D0D0D] hover:border-[#888888]"
                                )}
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-all",
                                    role === 'job_seeker' ? "bg-[#FF0069] text-white" : "bg-[#1F1F1F] text-[#888888]"
                                )}>
                                    <User className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black font-syne uppercase">Job Seeker</h3>
                                <p className="text-[#888888] text-sm mt-1">I'm looking for a job</p>
                                {role === 'job_seeker' && (
                                    <div className="absolute top-4 right-4 w-3 h-3 bg-[#FF0069] rounded-full animate-pulse" />
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setRole('company')}
                                className={cn(
                                    "relative p-8 rounded-[24px] border-2 transition-all duration-300 text-left group overflow-hidden",
                                    role === 'company'
                                        ? "border-[#7638FA] bg-[#111111] shadow-[0_0_30px_rgba(118,56,250,0.2)]"
                                        : "border-[#1F1F1F] bg-[#0D0D0D] hover:border-[#888888]"
                                )}
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-all",
                                    role === 'company' ? "bg-[#7638FA] text-white" : "bg-[#1F1F1F] text-[#888888]"
                                )}>
                                    <Building className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black font-syne uppercase">Employer</h3>
                                <p className="text-[#888888] text-sm mt-1">I'm hiring talent</p>
                                {role === 'company' && (
                                    <div className="absolute top-4 right-4 w-3 h-3 bg-[#7638FA] rounded-full animate-pulse" />
                                )}
                            </button>
                        </div>
                    </section>

                    {/* SECTION 2: BASIC INFO */}
                    <section className="space-y-6 bg-[#0D0D0D] p-8 rounded-[32px] border border-[#1F1F1F]">
                        <h2 className="text-xl font-black font-syne uppercase tracking-tight flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-[#FFD600] text-black flex items-center justify-center text-sm">01</span>
                            Basic Info
                        </h2>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-[#888888] ml-1">
                                    {role === 'company' ? 'Company Name' : 'Full Name'}
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888888]" />
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder={role === 'company' ? "e.g. Khan Solutions" : "e.g. Ali Ahmed"}
                                        className="w-full bg-black border border-[#1F1F1F] rounded-xl pl-12 pr-4 py-4 focus:border-[#FF0069] outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-[#888888] ml-1">Phone Number</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888888]" />
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="03XX-XXXXXXX"
                                            className="w-full bg-black border border-[#1F1F1F] rounded-xl pl-12 pr-4 py-4 focus:border-[#FF0069] outline-none transition-all font-medium"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-[#888888] ml-1">City</label>
                                    <CitySearch
                                        value={formData.city}
                                        onChange={(val) => setFormData(prev => ({ ...prev, city: val }))}
                                        className="!bg-black !border-[#1F1F1F]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-[#888888] ml-1">Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888888]" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="ali@example.com"
                                        className="w-full bg-black border border-[#1F1F1F] rounded-xl pl-12 pr-4 py-4 focus:border-[#FF0069] outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-[#888888] ml-1">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888888]" />
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        placeholder="Min 8 characters"
                                        className="w-full bg-black border border-[#1F1F1F] rounded-xl pl-12 pr-4 py-4 focus:border-[#FF0069] outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 3: JOB INFO (CONDITIONAL) */}
                    <section className="space-y-6 bg-[#0D0D0D] p-8 rounded-[32px] border border-[#1F1F1F]">
                        <h2 className="text-xl font-black font-syne uppercase tracking-tight flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-[#FFD600] text-black flex items-center justify-center text-sm">02</span>
                            {role === 'job_seeker' ? 'Professional Details' : 'Hiring Details'}
                        </h2>

                        {role === 'job_seeker' ? (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-[#888888] ml-1">Job Title / Role</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888888]" />
                                        <input
                                            type="text"
                                            name="jobTitle"
                                            value={formData.jobTitle}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Graphic Designer"
                                            className="w-full bg-black border border-[#1F1F1F] rounded-xl pl-12 pr-4 py-4 focus:border-[#FF0069] outline-none transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-[#888888] ml-1">Experience Level</label>
                                    <div className="flex flex-wrap gap-2">
                                        {EXPERIENCE_LEVELS.map(level => (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, experienceLevel: level }))}
                                                className={cn(
                                                    "px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all",
                                                    formData.experienceLevel === level
                                                        ? "bg-[#FF0069] border-[#FF0069] text-white"
                                                        : "bg-black border-[#1F1F1F] text-[#888888] hover:border-[#888888]"
                                                )}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <TagInput
                                    label="Top 3 Skills"
                                    tags={formData.skills}
                                    onChange={(tags) => setFormData(prev => ({ ...prev, skills: tags.slice(0, 3) }))}
                                    placeholder="Type and press enter..."
                                />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-[#888888] ml-1">Industry / Sector</label>
                                    <input
                                        type="text"
                                        name="industry"
                                        value={formData.industry}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Technology, Healthcare"
                                        className="w-full bg-black border border-[#1F1F1F] rounded-xl px-5 py-4 focus:border-[#7638FA] outline-none transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-[#888888] ml-1">What role are you hiring for?</label>
                                    <input
                                        type="text"
                                        name="hiringRole"
                                        value={formData.hiringRole}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Senior UI Designer"
                                        className="w-full bg-black border border-[#1F1F1F] rounded-xl px-5 py-4 focus:border-[#7638FA] outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold text-center">
                            {error}
                        </div>
                    )}

                    {/* SUBMIT BUTTON */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-6 rounded-[24px] font-black font-syne uppercase italic tracking-[0.2em] text-lg bg-gradient-to-r from-[#FF0069] to-[#7638FA] hover:shadow-[0_0_40px_rgba(255,0,105,0.4)] transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                            <>
                                Create My Account
                                <ArrowRight className="w-6 h-6" />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer Link */}
                <p className="mt-12 text-center text-[#888888] font-dm-sans">
                    Don't have an account? <Link href="/auth/login" className="text-[#FF0069] font-bold hover:underline">Login</Link>
                </p>
            </div>
        </div>
    );
}

