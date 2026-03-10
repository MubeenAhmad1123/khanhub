'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCategory } from '@/context/CategoryContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { ArrowLeft, ArrowRight, Check, MapPin, Phone, Building2, User } from 'lucide-react';
import { CATEGORY_CONFIG, CategoryKey } from '@/lib/categories';

const CATEGORIES = [
    { key: 'dailywages', label: 'Daily Wages', image: '/jobs.webp', accent: '#FF0069' },
    { key: 'marriage', label: 'Marriage Bureau', image: '/marraige.webp', accent: '#FF6B9D' },
    { key: 'property', label: 'Property', image: '/real-estate.webp', accent: '#7638FA' },
    { key: 'automobiles', label: 'Automobiles', image: '/tech.webp', accent: '#00C896' },
    { key: 'buysell', label: 'Buy/Sell', image: '/healthcare.webp', accent: '#00E5FF' },
    { key: 'education', label: 'Education', image: '/education (2).webp', accent: '#FFD600' },
];

const CATEGORY_ROLES: Record<string, {
    providerLabel: string; seekerLabel: string;
    providerKey: string; seekerKey: string;
    providerDesc: string; seekerDesc: string;
    providerIcon: string; seekerIcon: string;
}> = {
    dailywages: {
        providerKey: 'worker', providerLabel: 'Daily Worker', providerDesc: 'I am looking for daily work', providerIcon: '👷',
        seekerKey: 'hiring', seekerLabel: 'Hiring', seekerDesc: 'I want to hire workers', seekerIcon: '🏢'
    },
    marriage: {
        providerKey: 'groom', providerLabel: 'Groom/Male Side', providerDesc: 'I am looking for a partner', providerIcon: '🤵',
        seekerKey: 'bride', seekerLabel: 'Bride/Female Side', seekerDesc: 'I am looking for a proposal', seekerIcon: '👰'
    },
    property: {
        providerKey: 'agent', providerLabel: 'Agent / Seller', providerDesc: 'I am selling or renting property', providerIcon: '🏠',
        seekerKey: 'buyer', seekerLabel: 'Buyer / Renter', seekerDesc: 'I am looking to buy or rent', seekerIcon: '🔑'
    },
    automobiles: {
        providerKey: 'seller', providerLabel: 'Seller', providerDesc: 'I am selling a vehicle', providerIcon: '🚗',
        seekerKey: 'buyer', seekerLabel: 'Buyer', seekerDesc: 'I am looking for a vehicle', seekerIcon: '💰'
    },
    buysell: {
        providerKey: 'seller', providerLabel: 'Seller', providerDesc: 'I am selling an item', providerIcon: '🛍️',
        seekerKey: 'buyer', seekerLabel: 'Buyer', seekerDesc: 'I am looking for an item', seekerIcon: '💵'
    },
    education: {
        providerKey: 'teacher', providerLabel: 'Teacher / Tutor', providerDesc: 'I want to teach students', providerIcon: '👨‍🏫',
        seekerKey: 'student', seekerLabel: 'Student / Parent', seekerDesc: 'I am looking for a tutor', seekerIcon: '📚'
    },
};

const ROLE_FIELDS: Record<string, Record<string, { label: string; placeholder: string; key: string; type?: string; icon: any }[]>> = {
    dailywages: {
        hiring: [
            { key: 'companyName', label: 'Company / Name', placeholder: 'e.g. Khan Construction', icon: Building2 },
            { key: 'city', label: 'Work Location', placeholder: 'e.g. Lahore', icon: MapPin },
            { key: 'phone', label: 'Contact Phone', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
        worker: [
            { key: 'specialization', label: 'Your Work / Skill', placeholder: 'e.g. Electrician, Plumber', icon: User },
            { key: 'city', label: 'Your City', placeholder: 'e.g. Karachi', icon: MapPin },
            { key: 'phone', label: 'Contact Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
    },
    marriage: {
        groom: [
            { key: 'age', label: 'Age', placeholder: 'e.g. 28', type: 'number', icon: User },
            { key: 'city', label: 'City', placeholder: 'e.g. Lahore', icon: MapPin },
            { key: 'phone', label: 'Contact Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
        bride: [
            { key: 'age', label: 'Age', placeholder: 'e.g. 24', type: 'number', icon: User },
            { key: 'city', label: 'City', placeholder: 'e.g. Karachi', icon: MapPin },
            { key: 'phone', label: 'Contact Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
    },
    property: {
        agent: [
            { key: 'companyName', label: 'Agency Name', placeholder: 'e.g. Zameen Experts', icon: Building2 },
            { key: 'city', label: 'Operating City', placeholder: 'e.g. Islamabad', icon: MapPin },
            { key: 'phone', label: 'Contact Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
        buyer: [
            { key: 'city', label: 'Looking in City', placeholder: 'e.g. Lahore', icon: MapPin },
        ],
    },
    automobiles: {
        seller: [
            { key: 'city', label: 'City', placeholder: 'e.g. Karachi', icon: MapPin },
            { key: 'phone', label: 'Contact Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
        buyer: [
            { key: 'city', label: 'Your City', placeholder: 'e.g. Lahore', icon: MapPin },
        ],
    },
    buysell: {
        seller: [
            { key: 'city', label: 'City', placeholder: 'e.g. Karachi', icon: MapPin },
            { key: 'phone', label: 'Contact Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
        buyer: [
            { key: 'city', label: 'Your City', placeholder: 'e.g. Lahore', icon: MapPin },
        ],
    },
    education: {
        teacher: [
            { key: 'specialization', label: 'Subject / Expertise', placeholder: 'e.g. Mathematics', icon: User },
            { key: 'city', label: 'Teaching City', placeholder: 'e.g. Faisalabad', icon: MapPin },
            { key: 'phone', label: 'Contact Number', placeholder: '03xxxxxxxxx', type: 'tel', icon: Phone },
        ],
        student: [
            { key: 'city', label: 'Your City', placeholder: 'e.g. Multan', icon: MapPin },
        ],
    },
};

export default function CategoryRoleFlow() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { setCategory, setRole: setContextRole } = useCategory();

    const initialCat = searchParams.get('cat') as CategoryKey | null;

    const [step, setStep] = useState(initialCat ? 2 : 1);
    const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(initialCat);
    const [selectedRole, setSelectedRole] = useState<'provider' | 'seeker' | null>(null);
    const [formFields, setFormFields] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const accent = selectedCategory ? (CATEGORY_CONFIG[selectedCategory]?.accent || '#FF0069') : '#FF0069';

    const handleCategorySelect = (cat: CategoryKey) => {
        setSelectedCategory(cat);
        setSelectedRole(null); // ← reset role when category changes
        setFormFields({});
        setStep(2);
    };

    // ── FIXED: No role locking. User can always freely select any role. ──
    const handleRoleSelect = (role: 'provider' | 'seeker') => {
        setSelectedRole(role);
        const roles = CATEGORY_ROLES[selectedCategory!];
        const roleKey = role === 'provider' ? roles.providerKey : roles.seekerKey;
        const fields = ROLE_FIELDS[selectedCategory!]?.[roleKey] || [];
        const initialFields: Record<string, string> = {};
        fields.forEach(f => { initialFields[f.key] = ''; });
        setFormFields(initialFields);
    };

    const handleFieldChange = (key: string, value: string) => {
        setFormFields(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (selectedCategory) {
            localStorage.setItem('jobreel_active_category', selectedCategory);
            setCategory(selectedCategory);
        }
        if (selectedRole) {
            localStorage.setItem('jobreel_active_role', selectedRole);
            setContextRole(selectedRole);
        }

        if (user) {
            setSaving(true);
            try {
                const roles = CATEGORY_ROLES[selectedCategory!];
                const roleKey = selectedRole === 'provider' ? roles.providerKey : roles.seekerKey;

                const updates: any = {
                    category: selectedCategory,
                    role: roleKey,
                    uiRole: selectedRole,
                    roleKey: roleKey,
                    onboardingCompleted: true,
                    updatedAt: new Date(),
                };

                Object.entries(formFields).forEach(([key, value]) => {
                    if (value) updates[key] = value;
                });

                await updateDoc(doc(db, 'users', user.uid), updates);

                // Update localStorage for feed filtering
                localStorage.setItem('jobreel_guest_prefs', JSON.stringify({
                    category: selectedCategory,
                    role: roleKey,
                    uiRole: selectedRole,
                    selectedAt: Date.now(),
                }));

                sessionStorage.removeItem('feed_last_index');
            } catch (err) {
                console.error('Error updating profile:', err);
                setSaving(false);
                return;
            } finally {
                setSaving(false);
            }
        }

        router.push('/feed');
    };

    // ── STEP 1: Category Grid ──────────────────────────────────────────
    const renderStep1 = () => (
        <div>
            <h2 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 22, color: '#0A0A0A', textAlign: 'center', marginBottom: 24 }}>
                Choose Your Category
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.key}
                        onClick={() => handleCategorySelect(cat.key as CategoryKey)}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            gap: 10, padding: 16,
                            background: '#fff',
                            border: `1.5px solid #E5E5E5`,
                            borderRadius: 20, cursor: 'pointer',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = cat.accent)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = '#E5E5E5')}
                    >
                        <div style={{
                            width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                            border: `2.5px solid ${cat.accent}`,
                            boxShadow: `0 0 0 3px ${cat.accent}22`,
                            flexShrink: 0,
                        }}>
                            <img src={cat.image} alt={cat.label}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{
                            fontFamily: 'DM Sans', fontWeight: 700,
                            fontSize: 13, color: '#0A0A0A', textAlign: 'center',
                        }}>
                            {cat.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );

    // ── STEP 2: Role Selection ─────────────────────────────────────────
    const renderStep2 = () => {
        const roles = CATEGORY_ROLES[selectedCategory!];
        if (!roles) return null;

        return (
            <div>
                <button
                    onClick={() => { setStep(1); setSelectedRole(null); }}
                    style={{ background: 'none', border: 'none', color: '#888', fontFamily: 'DM Sans', fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    <ArrowLeft size={16} /> Back
                </button>
                <h2 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 22, color: '#0A0A0A', textAlign: 'center', marginBottom: 6 }}>
                    Who are you?
                </h2>
                <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 24 }}>
                    Select your role in {CATEGORIES.find(c => c.key === selectedCategory)?.label}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Provider role */}
                    <button
                        onClick={() => handleRoleSelect('provider')}
                        style={{
                            padding: '20px 20px',
                            borderRadius: 16,
                            textAlign: 'left',
                            border: selectedRole === 'provider'
                                ? `2px solid ${accent}`
                                : '2px solid #E5E5E5',
                            background: selectedRole === 'provider' ? `${accent}08` : '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', gap: 14,
                        }}
                    >
                        <span style={{ fontSize: 32, lineHeight: 1 }}>{roles.providerIcon}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 16, color: '#0A0A0A', marginBottom: 3 }}>
                                {roles.providerLabel}
                            </div>
                            <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#666' }}>
                                {roles.providerDesc}
                            </div>
                        </div>
                        {selectedRole === 'provider' && (
                            <div style={{
                                width: 24, height: 24, borderRadius: '50%',
                                background: accent, display: 'flex',
                                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <Check size={14} color="#fff" />
                            </div>
                        )}
                    </button>

                    {/* Seeker role */}
                    <button
                        onClick={() => handleRoleSelect('seeker')}
                        style={{
                            padding: '20px 20px',
                            borderRadius: 16,
                            textAlign: 'left',
                            border: selectedRole === 'seeker'
                                ? `2px solid ${accent}`
                                : '2px solid #E5E5E5',
                            background: selectedRole === 'seeker' ? `${accent}08` : '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', gap: 14,
                        }}
                    >
                        <span style={{ fontSize: 32, lineHeight: 1 }}>{roles.seekerIcon}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 16, color: '#0A0A0A', marginBottom: 3 }}>
                                {roles.seekerLabel}
                            </div>
                            <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#666' }}>
                                {roles.seekerDesc}
                            </div>
                        </div>
                        {selectedRole === 'seeker' && (
                            <div style={{
                                width: 24, height: 24, borderRadius: '50%',
                                background: accent, display: 'flex',
                                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <Check size={14} color="#fff" />
                            </div>
                        )}
                    </button>
                </div>

                <button
                    onClick={() => selectedRole && setStep(3)}
                    disabled={!selectedRole}
                    style={{
                        width: '100%', marginTop: 24, padding: '15px',
                        background: selectedRole ? accent : '#E5E5E5',
                        color: selectedRole ? '#fff' : '#aaa',
                        border: 'none', borderRadius: 14,
                        fontFamily: 'Poppins', fontWeight: 800,
                        fontSize: 15, cursor: selectedRole ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'all 0.2s',
                        boxShadow: selectedRole ? `0 6px 20px ${accent}44` : 'none',
                    }}
                >
                    Continue <ArrowRight size={18} />
                </button>
            </div>
        );
    };

    // ── STEP 3: Quick Info Fields ──────────────────────────────────────
    const renderStep3 = () => {
        const roles = CATEGORY_ROLES[selectedCategory!];
        if (!roles) return null;
        const roleKey = selectedRole === 'provider' ? roles.providerKey : roles.seekerKey;
        const fields = ROLE_FIELDS[selectedCategory!]?.[roleKey] || [];

        return (
            <div>
                <button
                    onClick={() => setStep(2)}
                    style={{ background: 'none', border: 'none', color: '#888', fontFamily: 'DM Sans', fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    <ArrowLeft size={16} /> Back
                </button>
                <h2 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 22, color: '#0A0A0A', marginBottom: 4 }}>
                    A bit about you
                </h2>
                <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#888', marginBottom: 24 }}>
                    This helps people connect with you
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {fields.map((f) => {
                        const Icon = f.icon;
                        return (
                            <div key={f.key}>
                                {/* Bold visible label */}
                                <label style={{
                                    display: 'block',
                                    fontFamily: 'DM Sans',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    color: '#0A0A0A',
                                    marginBottom: 8,
                                }}>
                                    {f.label}
                                </label>
                                {/* Input with black border, white bg, black text */}
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        position: 'absolute', left: 14, top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#999', pointerEvents: 'none',
                                    }}>
                                        <Icon size={16} />
                                    </div>
                                    <input
                                        type={f.type || 'text'}
                                        placeholder={f.placeholder}
                                        value={formFields[f.key] || ''}
                                        onChange={(e) => handleFieldChange(f.key, e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '13px 14px 13px 40px',
                                            background: '#fff',
                                            border: '2px solid #0A0A0A',
                                            borderRadius: 12,
                                            fontFamily: 'DM Sans',
                                            fontWeight: 500,
                                            fontSize: 15,
                                            color: '#0A0A0A',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.15s',
                                        }}
                                        onFocus={(e) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}22`; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#0A0A0A'; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        width: '100%', marginTop: 28,
                        padding: '15px',
                        background: accent,
                        color: '#fff', border: 'none', borderRadius: 14,
                        fontFamily: 'Poppins', fontWeight: 800,
                        fontSize: 15, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: `0 6px 20px ${accent}44`,
                        opacity: saving ? 0.7 : 1,
                    }}
                >
                    {saving ? (
                        <>
                            <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            Saving...
                        </>
                    ) : (
                        <>Save & Go to Feed <Check size={18} /></>
                    )}
                </button>

                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    };

    return (
        <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
                {[1, 2, 3].map((s) => (
                    <div key={s} style={{
                        width: step === s ? 28 : 8,
                        height: 8, borderRadius: 99,
                        background: step >= s ? accent : '#E5E5E5',
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }} />
                ))}
            </div>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
        </div>
    );
}