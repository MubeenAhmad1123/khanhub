'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    User,
    ArrowRight,
    Mail,
    Lock,
    Phone,
    MapPin,
    Loader2,
    ShieldCheck,
    Briefcase,
    Zap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import CitySearch from '@/components/forms/CitySearch';
import TagInput from '@/components/ui/TagInput';
import { cn } from '@/lib/utils';
import { CategoryKey, CATEGORY_CONFIG } from '@/lib/categories';

const EXPERIENCE_LEVELS = ['Fresher', '1-2 years', '3-5 years', '5-10 years', '10+ years'];

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { register, isAuthenticated } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Category & Role (Pre-filled from guest prefs or query params)
    const [category, setCategory] = useState<CategoryKey>('jobs');
    const [role, setRole] = useState<'provider' | 'seeker'>('provider');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        city: '',
        // Dynamic Fields
        jobTitle: '',
        experienceLevel: '',
        skills: [] as string[],
        specialization: '',
        subject: '',
        gradeLevel: '',
        companyName: '',
        hiringRole: '',
    });

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/feed');
        }
    }, [isAuthenticated, router]);

    // Handle initial pre-fill
    useEffect(() => {
        const guestPrefs = localStorage.getItem('jobreel_guest_prefs');
        const qCategory = searchParams.get('category') as CategoryKey;
        const qRole = searchParams.get('role') as 'provider' | 'seeker';

        if (qCategory && CATEGORY_CONFIG[qCategory]) setCategory(qCategory);
        if (qRole) setRole(qRole);

        if (guestPrefs && !qCategory) {
            try {
                const parsed = JSON.parse(guestPrefs);
                if (parsed.category) setCategory(parsed.category);
                if (parsed.role) setRole(parsed.role);
            } catch (e) { }
        }
    }, [searchParams]);

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
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                city: formData.city,
                category,
                role,
                profileFields: {
                    jobTitle: formData.jobTitle,
                    skills: formData.skills,
                    experienceLevel: formData.experienceLevel,
                    specialization: formData.specialization,
                    subject: formData.subject,
                    gradeLevel: formData.gradeLevel,
                    companyName: formData.companyName,
                    hiringRole: formData.hiringRole,
                },
                onboardingCompleted: true,
                paymentStatus: 'approved',
            };

            await register(formData.email, formData.password, registrationData, role === 'provider' ? 'job_seeker' : 'employer');

            localStorage.removeItem('jobreel_guest_prefs');
            router.push('/feed');
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[--accent]">
            <div className="max-w-xl mx-auto px-6 py-12">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black font-syne italic text-transparent bg-clip-text bg-gradient-to-r from-[--accent] to-white/40">
                        JOBREEL
                    </h1>
                    <p className="text-[--text-muted] text-[10px] uppercase tracking-[0.4em] font-bold mt-2">
                        Create Your Account
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* SECTION 1: CATEGORY & ROLE */}
                    <section className="space-y-4">
                        <label className="text-[10px] uppercase font-black tracking-widest text-[--text-muted]">Industry & Role</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-[--bg-card] border border-[--accent]/30 flex items-center justify-between shadow-[0_0_20px_var(--accent-glow)]">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{CATEGORY_CONFIG[category].emoji}</span>
                                    <span className="text-xs font-bold uppercase font-syne tracking-widest">{CATEGORY_CONFIG[category].label}</span>
                                </div>
                                <Zap className="w-4 h-4 text-[--accent] fill-current" />
                            </div>
                            <div className="p-4 rounded-2xl bg-[--bg-card] border border-[--accent]/30 flex items-center justify-center">
                                <span className="text-xs font-black uppercase font-syne tracking-widest text-[--accent]">
                                    {role === 'provider' ? CATEGORY_CONFIG[category].providerLabel : CATEGORY_CONFIG[category].seekerLabel}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: BASIC INFO */}
                    <section className="space-y-4">
                        <label className="text-[10px] uppercase font-black tracking-widest text-[--text-muted]">Basic Information</label>
                        <div className="space-y-4 bg-[--bg-secondary] p-6 rounded-[24px] border border-[--border]">
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] group-focus-within:text-[--accent]" />
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Full Name / Brand Name"
                                    className="w-full bg-black border border-[--border] rounded-xl pl-12 pr-4 py-4 text-sm focus:border-[--accent] outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] group-focus-within:text-[--accent]" />
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="03XX-XXXXXXX"
                                        className="w-full bg-black border border-[--border] rounded-xl pl-12 pr-4 py-4 text-sm focus:border-[--accent] outline-none transition-all"
                                    />
                                </div>
                                <CitySearch
                                    value={formData.city}
                                    onChange={(val) => setFormData(prev => ({ ...prev, city: val }))}
                                    className="!bg-black !border-[--border]"
                                />
                            </div>

                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] group-focus-within:text-[--accent]" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="Email Address"
                                    className="w-full bg-black border border-[--border] rounded-xl pl-12 pr-4 py-4 text-sm focus:border-[--accent] outline-none transition-all"
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] group-focus-within:text-[--accent]" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Password"
                                    className="w-full bg-black border border-[--border] rounded-xl pl-12 pr-4 py-4 text-sm focus:border-[--accent] outline-none transition-all"
                                />
                            </div>
                        </div>
                    </section>

                    {/* SECTION 3: CONDITIONAL PROFILE INFO */}
                    <section className="space-y-4">
                        <label className="text-[10px] uppercase font-black tracking-widest text-[--text-muted]">Profile Details</label>
                        <div className="space-y-6 bg-[--bg-secondary] p-6 rounded-[24px] border border-[--border]">
                            {category === 'jobs' && role === 'provider' && (
                                <>
                                    <div className="relative group">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
                                        <input
                                            type="text"
                                            name="jobTitle"
                                            value={formData.jobTitle}
                                            onChange={handleInputChange}
                                            placeholder="Desired Job Title"
                                            className="w-full bg-black border border-[--border] rounded-xl pl-12 pr-4 py-4 text-sm focus:border-[--accent] outline-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-muted]">Experience</p>
                                        <div className="flex flex-wrap gap-2">
                                            {EXPERIENCE_LEVELS.map(level => (
                                                <button
                                                    key={level}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, experienceLevel: level }))}
                                                    className={cn(
                                                        "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                                                        formData.experienceLevel === level ? "bg-[--accent] border-[--accent] text-black" : "bg-black border-[--border] text-[--text-muted]"
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
                                    />
                                </>
                            )}

                            {category === 'healthcare' && role === 'provider' && (
                                <input
                                    type="text"
                                    name="specialization"
                                    value={formData.specialization}
                                    onChange={handleInputChange}
                                    placeholder="Medical Specialization (e.g. Cardiology)"
                                    className="w-full bg-black border border-[--border] rounded-xl px-4 py-4 text-sm focus:border-[--accent] outline-none"
                                />
                            )}

                            {category === 'education' && role === 'provider' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        placeholder="Major Subject"
                                        className="w-full bg-black border border-[--border] rounded-xl px-4 py-4 text-sm focus:border-[--accent] outline-none"
                                    />
                                    <input
                                        type="text"
                                        name="gradeLevel"
                                        value={formData.gradeLevel}
                                        onChange={handleInputChange}
                                        placeholder="Grade Level"
                                        className="w-full bg-black border border-[--border] rounded-xl px-4 py-4 text-sm focus:border-[--accent] outline-none"
                                    />
                                </div>
                            )}

                            {role === 'seeker' && (
                                <input
                                    type="text"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleInputChange}
                                    placeholder="Business / Company Name"
                                    className="w-full bg-black border border-[--border] rounded-xl px-4 py-4 text-sm focus:border-[--accent] outline-none"
                                />
                            )}
                        </div>
                    </section>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-[--accent] text-black font-black font-syne uppercase tracking-[0.2em] text-sm rounded-[24px] shadow-[0_0_40px_var(--accent-glow)] transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                                Create My Account
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-10 text-center text-[--text-muted] text-sm">
                    Already have an account? <Link href="/auth/login" className="text-[--accent] font-bold hover:underline">Login</Link>
                </p>

                <div className="mt-12 flex items-center justify-center gap-2 grayscale opacity-50">
                    <ShieldCheck size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Secure & Verified Connection</span>
                </div>
            </div>
        </div>
    );
}
