'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCategory } from '@/context/CategoryContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { ArrowLeft, ArrowRight, Check, MapPin, Phone, Building2, User } from 'lucide-react';
import { CATEGORY_CONFIG, CategoryKey } from '@/lib/categories';

const CATEGORIES = [
    { key: 'jobs', label: 'Jobs', image: '/jobs.webp', accent: '#FF0069' },
    { key: 'healthcare', label: 'Healthcare', image: '/healthcare.webp', accent: '#00C896' },
    { key: 'education', label: 'Education', image: '/education (2).webp', accent: '#FFD600' },
    { key: 'marriage', label: 'Marriage', image: '/marraige.webp', accent: '#FF6B9D' },
    { key: 'domestic', label: 'Domestic Help', image: '/domestic help.webp', accent: '#FF8C42' },
    { key: 'legal', label: 'Legal', image: '/lawyer.webp', accent: '#4A90D9' },
    { key: 'realestate', label: 'Real Estate', image: '/real-estate.webp', accent: '#7638FA' },
    { key: 'it', label: 'IT & Tech', image: '/tech.webp', accent: '#00E5FF' },
];

const CATEGORY_ROLES: Record<string, { providerLabel: string; seekerLabel: string; providerKey: string; seekerKey: string; providerDesc: string; seekerDesc: string }> = {
    jobs: { providerKey: 'employer', providerLabel: 'Employer / HR', seekerKey: 'jobseeker', seekerLabel: 'Job Seeker', providerDesc: 'I am looking to hire talent', seekerDesc: 'I am looking for a job' },
    healthcare: { providerKey: 'doctor', providerLabel: 'Doctor / Specialist', seekerKey: 'patient', seekerLabel: 'Patient', providerDesc: 'I provide medical services', seekerDesc: 'I am looking for medical help' },
    education: { providerKey: 'teacher', providerLabel: 'Teacher / Tutor', seekerKey: 'student', seekerLabel: 'Student / Parent', providerDesc: 'I want to teach students', seekerDesc: 'I am looking for a tutor' },
    marriage: { providerKey: 'presenting', providerLabel: 'Presenting Profile', seekerKey: 'looking', seekerLabel: 'Looking to Marry', providerDesc: 'I am introducing someone', seekerDesc: 'I am looking for a partner' },
    domestic: { providerKey: 'helper', providerLabel: 'Domestic Helper', seekerKey: 'household', seekerLabel: 'Household / Family', providerDesc: 'I provide domestic services', seekerDesc: 'I need help at home' },
    legal: { providerKey: 'lawyer', providerLabel: 'Lawyer / Advocate', seekerKey: 'client', seekerLabel: 'Looking for Legal Help', providerDesc: 'I provide legal counsel', seekerDesc: 'I need legal advice' },
    realestate: { providerKey: 'agent', providerLabel: 'Real Estate Agent', seekerKey: 'buyer', seekerLabel: 'Buyer / Renter', providerDesc: 'I help people find property', seekerDesc: 'I am looking to buy or rent' },
    it: { providerKey: 'freelancer', providerLabel: 'IT Freelancer', seekerKey: 'client', seekerLabel: 'Looking to Hire', providerDesc: 'I provide tech services', seekerDesc: 'I need a tech expert' },
};

const ROLE_FIELDS: Record<string, Record<string, { label: string; placeholder: string; key: string; type?: string; icon: any }[]>> = {
    jobs: {
        employer: [
            { key: 'companyName', label: 'Company Name', placeholder: 'e.g. Khan Medical Center', icon: Building2 },
            { key: 'companyLocation', label: 'City / Location', placeholder: 'e.g. Lahore', icon: MapPin },
            { key: 'hrPhone', label: 'HR Phone Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
        jobseeker: [
            { key: 'desiredJobTitle', label: 'Desired Job Title', placeholder: 'e.g. Software Engineer', icon: User },
            { key: 'city', label: 'Your City', placeholder: 'e.g. Karachi', icon: MapPin },
            { key: 'totalExperience', label: 'Years of Experience', placeholder: 'e.g. 3', type: 'number', icon: Building2 },
        ],
    },
    healthcare: {
        doctor: [
            { key: 'specialization', label: 'Specialization', placeholder: 'e.g. Cardiologist', icon: User },
            { key: 'city', label: 'Clinic City', placeholder: 'e.g. Islamabad', icon: MapPin },
            { key: 'phone', label: 'Contact Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
        patient: [
            { key: 'city', label: 'Your City', placeholder: 'e.g. Rawalpindi', icon: MapPin },
        ],
    },
    education: {
        teacher: [
            { key: 'specialization', label: 'Subject / Expertise', placeholder: 'e.g. Mathematics', icon: User },
            { key: 'city', label: 'Teaching City', placeholder: 'e.g. Faisalabad', icon: MapPin },
            { key: 'phone', label: 'Contact Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
        student: [
            { key: 'desiredJobTitle', label: 'Subject Needed', placeholder: 'e.g. Physics', icon: User },
            { key: 'city', label: 'Your City', placeholder: 'e.g. Multan', icon: MapPin },
        ],
    },
    marriage: {
        presenting: [
            { key: 'city', label: 'City', placeholder: 'e.g. Lahore', icon: MapPin },
            { key: 'phone', label: 'Contact Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
        looking: [
            { key: 'city', label: 'Your City', placeholder: 'e.g. Karachi', icon: MapPin },
        ],
    },
    domestic: {
        helper: [
            { key: 'specialization', label: 'Type of Work', placeholder: 'e.g. Cook, Driver, Cleaner', icon: User },
            { key: 'city', label: 'Available In', placeholder: 'e.g. Lahore', icon: MapPin },
            { key: 'phone', label: 'Contact Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
        household: [
            { key: 'city', label: 'Your City', placeholder: 'e.g. Islamabad', icon: MapPin },
        ],
    },
    legal: {
        lawyer: [
            { key: 'specialization', label: 'Area of Law', placeholder: 'e.g. Civil, Criminal, Family', icon: User },
            { key: 'city', label: 'Practice City', placeholder: 'e.g. Lahore', icon: MapPin },
            { key: 'phone', label: 'Contact Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
        client: [
            { key: 'city', label: 'Your City', placeholder: 'e.g. Karachi', icon: MapPin },
        ],
    },
    realestate: {
        agent: [
            { key: 'companyName', label: 'Agency Name', placeholder: 'e.g. Zameen Realty', icon: Building2 },
            { key: 'city', label: 'Operating City', placeholder: 'e.g. Islamabad', icon: MapPin },
            { key: 'phone', label: 'Contact Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
        buyer: [
            { key: 'city', label: 'Looking in City', placeholder: 'e.g. Lahore', icon: MapPin },
        ],
    },
    it: {
        freelancer: [
            { key: 'specialization', label: 'Main Skill', placeholder: 'e.g. React, Flutter, SEO', icon: User },
            { key: 'city', label: 'Your City', placeholder: 'e.g. Karachi', icon: MapPin },
            { key: 'phone', label: 'Contact Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
        client: [
            { key: 'city', label: 'Your City', placeholder: 'e.g. Lahore', icon: MapPin },
        ],
    },
};

export default function CategoryRoleFlow() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { setCategory, setRole: setContextRole } = useCategory();

    const mode = searchParams.get('mode');
    const initialCat = searchParams.get('cat') as CategoryKey | null;

    const [step, setStep] = useState(initialCat ? 2 : 1);
    const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(initialCat);
    const [selectedRole, setSelectedRole] = useState<'provider' | 'seeker' | null>(null);
    const [formFields, setFormFields] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const accent = selectedCategory ? CATEGORY_CONFIG[selectedCategory].accent : '#FF0069';

    const handleCategorySelect = (cat: CategoryKey) => {
        setSelectedCategory(cat);
        setStep(2);
    };

    const handleRoleSelect = (role: 'provider' | 'seeker') => {
        setSelectedRole(role);
        // Initialize form fields for the role
        const fields = ROLE_FIELDS[selectedCategory!][CATEGORY_ROLES[selectedCategory!][role === 'provider' ? 'providerKey' : 'seekerKey']];
        const initialFields: Record<string, string> = {};
        fields.forEach(f => initialFields[f.key] = '');
        setFormFields(initialFields);
    };

    const handleFieldChange = (key: string, value: string) => {
        setFormFields(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        // Save to LocalStorage first (works for both guest and logged-in)
        if (selectedCategory) {
            localStorage.setItem('jobreel_active_category', selectedCategory);
            setCategory(selectedCategory);
        }
        if (selectedRole) {
            localStorage.setItem('jobreel_active_role', selectedRole);
            setContextRole(selectedRole);
        }

        if (user) {
            setLoading(true);
            try {
                const roles = CATEGORY_ROLES[selectedCategory!];
                const roleKey = selectedRole === 'provider' ? roles.providerKey : roles.seekerKey;

                const updates = {
                    category: selectedCategory,
                    role: selectedRole, // context-friendly role
                    roleKey: roleKey,   // industry-specific role key
                    ...formFields,
                    updatedAt: new Date(),
                    onboardingCompleted: true,
                };

                await updateDoc(doc(db, 'users', user.uid), updates);
            } catch (err) {
                console.error('Error updating profile:', err);
                setLoading(false);
                return; // Don't redirect on error
            } finally {
                setLoading(false); // Ensure loading state is reset after Firestore operation
            }
        }

        router.push('/feed');
    };

    const renderStep1 = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-900 text-center mb-8 uppercase italic">Choose Your Industry</h2>
            <div className="grid grid-cols-2 gap-4">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.key}
                        onClick={() => handleCategorySelect(cat.key as CategoryKey)}
                        className="flex flex-col items-center gap-3 p-4 bg-white border border-slate-100 rounded-3xl hover:border-slate-300 transition-all shadow-sm"
                    >
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md">
                            <img src={cat.image} alt={cat.label} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-slate-800 text-sm uppercase tracking-tight">{cat.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderStep2 = () => {
        const roles = CATEGORY_ROLES[selectedCategory!];
        return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <button onClick={() => setStep(1)} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <ArrowLeft size={18} /> Back to Industries
                </button>
                <h2 className="text-2xl font-black text-slate-900 text-center mb-8 uppercase italic">Who are you?</h2>
                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => handleRoleSelect('provider')}
                        className={`p-6 rounded-3xl text-left border-2 transition-all ${selectedRole === 'provider' ? 'bg-white shadow-xl' : 'bg-slate-50 border-transparent'}`}
                        style={{ borderColor: selectedRole === 'provider' ? accent : 'transparent' }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-black text-lg uppercase italic text-slate-900">{roles.providerLabel}</span>
                            {selectedRole === 'provider' && <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: accent }}><Check size={14} /></div>}
                        </div>
                        <p className="text-slate-500 text-sm font-medium">{roles.providerDesc}</p>
                    </button>

                    <button
                        onClick={() => handleRoleSelect('seeker')}
                        className={`p-6 rounded-3xl text-left border-2 transition-all ${selectedRole === 'seeker' ? 'bg-white shadow-xl' : 'bg-slate-50 border-transparent'}`}
                        style={{ borderColor: selectedRole === 'seeker' ? accent : 'transparent' }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-black text-lg uppercase italic text-slate-900">{roles.seekerLabel}</span>
                            {selectedRole === 'seeker' && <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: accent }}><Check size={14} /></div>}
                        </div>
                        <p className="text-slate-500 text-sm font-medium">{roles.seekerDesc}</p>
                    </button>
                </div>

                <button
                    onClick={() => setStep(3)}
                    disabled={!selectedRole}
                    className="w-full mt-8 py-5 rounded-[2rem] font-black uppercase italic tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    style={{ background: accent, boxShadow: `0 8px 24px ${accent}44` }}
                >
                    <span>Continue</span>
                    <ArrowRight size={20} />
                </button>
            </div>
        );
    };

    const renderStep3 = () => {
        const roles = CATEGORY_ROLES[selectedCategory!];
        const roleKey = selectedRole === 'provider' ? roles.providerKey : roles.seekerKey;
        const fields = ROLE_FIELDS[selectedCategory!][roleKey];

        return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <button onClick={() => setStep(2)} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <ArrowLeft size={18} /> Back to Roles
                </button>
                <h2 className="text-2xl font-black text-slate-900 text-center mb-2 uppercase italic">A bit about you</h2>
                <p className="text-slate-500 text-center mb-8 font-medium">This helps people connect with you</p>

                <div className="space-y-4">
                    {fields.map((f) => {
                        const Icon = f.icon;
                        return (
                            <div key={f.key} className="space-y-1.5">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-4">{f.label}</label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors">
                                        <Icon size={18} />
                                    </div>
                                    <input
                                        type={f.type || 'text'}
                                        placeholder={f.placeholder}
                                        value={formFields[f.key] || ''}
                                        onChange={(e) => handleFieldChange(f.key, e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-6 font-bold text-slate-900 focus:bg-white focus:outline-none transition-all placeholder:text-slate-300"
                                        style={{ borderColor: 'transparent' }}
                                        onFocus={(e) => e.target.style.borderColor = accent}
                                        onBlur={(e) => e.target.style.borderColor = 'transparent'}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading || Object.values(formFields).some(v => !v)}
                    className="w-full mt-10 py-5 rounded-[2rem] font-black uppercase italic tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    style={{ background: accent, boxShadow: `0 8px 24px ${accent}44` }}
                >
                    <span>{loading ? 'Saving...' : 'Save & Continue'}</span>
                    {!loading && <Check size={20} />}
                </button>
            </div>
        );
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Progress Bar */}
            <div className="flex gap-2 justify-center mb-10">
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        style={{
                            width: step === s ? 32 : 10,
                            height: 10,
                            borderRadius: 99,
                            background: step >= s ? accent : '#F1F5F9',
                            transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        }}
                    />
                ))}
            </div>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
        </div>
    );
}
