'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCategory } from '@/context/CategoryContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { uploadProfilePhoto } from '@/lib/services/cloudinaryUpload';
import CitySearch from '@/components/forms/CitySearch';
import { Check } from 'lucide-react';
import { CategoryKey } from '@/lib/categories';

const ONBOARDING_CATEGORIES = [
    { key: 'jobs', label: 'Jobs', emoji: '💼', accent: '#FF0069' },
    { key: 'healthcare', label: 'Healthcare', emoji: '🏥', accent: '#FF0069' },
    { key: 'education', label: 'Education', emoji: '📚', accent: '#FF0069' },
    { key: 'marriage', label: 'Marriage', emoji: '💍', accent: '#FF0069' },
    { key: 'domestic', label: 'Domestic Help', emoji: '🏠', accent: '#FF0069' },
    { key: 'legal', label: 'Legal', emoji: '⚖️', accent: '#FF0069' },
    { key: 'realestate', label: 'Real Estate', emoji: '🏢', accent: '#FF0069' },
    { key: 'it', label: 'IT & Tech', emoji: '💻', accent: '#FF0069' },
];

const CATEGORY_ROLES: Record<string, {
    providerLabel: string; seekerLabel: string;
    providerKey: string; seekerKey: string;
}> = {
    jobs: {
        providerKey: 'worker', providerLabel: "I'm looking for work",
        seekerKey: 'hiring', seekerLabel: "I'm hiring"
    },
    healthcare: {
        providerKey: 'doctor', providerLabel: "I provide healthcare",
        seekerKey: 'patient', seekerLabel: "I need healthcare"
    },
    education: {
        providerKey: 'teacher', providerLabel: "I'm a teacher / tutor",
        seekerKey: 'student', seekerLabel: "I'm a student / learner"
    },
    marriage: {
        providerKey: 'groom', providerLabel: "I'm presenting a proposal",
        seekerKey: 'bride', seekerLabel: "I'm looking for a match"
    },
    domestic: {
        providerKey: 'provider', providerLabel: "I provide domestic services",
        seekerKey: 'seeker', seekerLabel: "I need domestic help"
    },
    legal: {
        providerKey: 'lawyer', providerLabel: "I'm a lawyer / legal advisor",
        seekerKey: 'client', seekerLabel: "I need legal help"
    },
    realestate: {
        providerKey: 'agent', providerLabel: "I'm an agent / seller",
        seekerKey: 'buyer', seekerLabel: "I'm looking to buy/rent"
    },
    it: {
        providerKey: 'provider', providerLabel: "I'm a developer / IT provider",
        seekerKey: 'seeker', seekerLabel: "I need IT services"
    },
};

export default function CategoryRoleFlow() {
    const router = useRouter();
    const { user, refreshProfile } = useAuth();
    const { setCategory, setRole: setContextRole } = useCategory();

    const [step, setStep] = useState(1);
    
    // Step 1 states
    const [fullName, setFullName] = useState('');
    const [profilePic, setProfilePic] = useState('');
    const [city, setCity] = useState('');
    const [phone, setPhone] = useState('');
    const [sameWhatsApp, setSameWhatsApp] = useState(true);
    const [whatsapp, setWhatsapp] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Step 2 states
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [customIndustry, setCustomIndustry] = useState('');
    const [customChecked, setCustomChecked] = useState(false);
    const [selectedRole, setSelectedRole] = useState<'provider' | 'seeker' | null>(null);

    const [saving, setSaving] = useState(false);

    // Pre-fill display name from authenticated user details
    useEffect(() => {
        if (user) {
            setFullName(user.displayName || '');
            setProfilePic(user.photoURL || '');
        }
    }, [user]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'image/webp') {
            setErrorMessage('Only .webp format is supported for profile pictures.');
            return;
        }

        setErrorMessage(null);
        setUploading(true);
        setUploadProgress(0);

        try {
            const result = await uploadProfilePhoto(file, user?.uid || 'temp', (progress) => {
                setUploadProgress(progress.percentage);
            });
            setProfilePic(result.secureUrl);
            setErrorMessage(null);
        } catch (err: any) {
            console.error('Upload error:', err);
            setErrorMessage(err.message || 'Failed to upload profile photo.');
        } finally {
            setUploading(false);
        }
    };

    const handleStep1Submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim()) {
            setErrorMessage('Full name is required.');
            return;
        }
        if (!city.trim()) {
            setErrorMessage('City is required.');
            return;
        }
        if (!phone.trim()) {
            setErrorMessage('Phone number is required.');
            return;
        }
        if (!sameWhatsApp && !whatsapp.trim()) {
            setErrorMessage('WhatsApp number is required.');
            return;
        }
        setErrorMessage(null);
        setStep(2);
    };

    const handleStep2Submit = () => {
        if (!selectedCategory && !customChecked) {
            setErrorMessage('Please select a category or enter custom industry.');
            return;
        }
        if (customChecked && !customIndustry.trim()) {
            setErrorMessage('Custom industry name is required.');
            return;
        }
        if (!selectedRole) {
            setErrorMessage('Please select a sub-role.');
            return;
        }
        setErrorMessage(null);
        setStep(3);
    };

    const handleFinalSave = async (targetRoute: '/feed' | '/dashboard/upload-video') => {
        if (!user) return;
        setSaving(true);

        try {
            const finalCategoryKey = (customChecked ? 'jobs' : selectedCategory!) as CategoryKey;
            const roles = CATEGORY_ROLES[selectedCategory || 'jobs'];
            const roleKey = selectedRole === 'provider' ? roles.providerKey : roles.seekerKey;
            const finalRoleLabel = selectedRole === 'provider' ? roles.providerLabel : roles.seekerLabel;

            const updates: any = {
                name: fullName.trim(),
                displayName: fullName.trim(),
                photoURL: profilePic || user.photoURL || '',
                city: city.trim(),
                phone: phone.trim(),
                whatsapp: sameWhatsApp ? phone.trim() : whatsapp.trim(),
                category: finalCategoryKey,
                customIndustry: customChecked ? customIndustry.trim() : null,
                uiRole: selectedRole,
                roleLabel: finalRoleLabel,
                role: roleKey, // compat
                onboardingCompleted: true,
                updatedAt: serverTimestamp(),
                profile: {
                    ...((user as any).profile || {}),
                    fullName: fullName.trim(),
                    phone: phone.trim(),
                    whatsapp: sameWhatsApp ? phone.trim() : whatsapp.trim(),
                    location: city.trim(),
                }
            };

            await updateDoc(doc(db, 'users', user.uid), updates);

            // Sync Context
            setCategory(finalCategoryKey);
            setContextRole(selectedRole);

            // guest preferences local storage
            localStorage.setItem('jobreel_active_category', finalCategoryKey);
            localStorage.setItem('jobreel_active_role', selectedRole || '');
            localStorage.setItem('jobreel_guest_prefs', JSON.stringify({
                category: finalCategoryKey,
                role: roleKey,
                uiRole: selectedRole,
                selectedAt: Date.now(),
            }));

            sessionStorage.removeItem('feed_last_index');
            sessionStorage.setItem('authRedirect', 'true');

            await refreshProfile();
            router.push(targetRoute);
        } catch (err: any) {
            console.error('Final onboarding save failed:', err);
            setErrorMessage(err.message || 'Failed to complete profile onboarding.');
            setSaving(false);
        }
    };

    // ── STEP 1: Basic Info Form ─────────────────────────────────────────
    const renderStep1 = () => (
        <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 800,
                fontSize: '22px',
                color: '#0A0A0A',
                textAlign: 'center',
                margin: '0 0 4px 0'
            }}>
                Basic Information
            </h2>
            <p style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: '#666666',
                textAlign: 'center',
                margin: '0 0 8px 0'
            }}>
                Complete your details to personalize your profile
            </p>

            {/* Profile Pic Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#F8F8F8',
                    border: '2px solid #E5E5E5',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {profilePic ? (
                        <img
                            src={profilePic}
                            alt="Profile Preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <span style={{ fontSize: '28px', color: '#888888' }}>👤</span>
                    )}
                    {uploading && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 'bold'
                        }}>
                            {uploadProgress}%
                        </div>
                    )}
                </div>

                <label style={{
                    cursor: 'pointer',
                    background: '#F8F8F8',
                    border: '1px solid #E5E5E5',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0A0A0A',
                    transition: 'all 0.15s'
                }}>
                    Change photo
                    <input
                        type="file"
                        accept="image/webp"
                        onChange={handleFileChange}
                        disabled={uploading}
                        style={{ display: 'none' }}
                    />
                </label>
                <div style={{ fontSize: '11px', color: '#666666', fontWeight: 500, textAlign: 'center' }}>
                    Only <span style={{ color: '#FF0069', fontWeight: 700 }}>.webp</span> format supported
                </div>
            </div>

            {/* Full Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A' }}>Full Name</label>
                <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    style={{
                        padding: '12px 16px',
                        border: '2px solid #E5E5E5',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontFamily: 'DM Sans, sans-serif',
                        outline: 'none'
                    }}
                />
            </div>

            {/* City Lookup via CitySearch */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A' }}>City</label>
                <CitySearch
                    value={city}
                    onChange={(value) => setCity(value)}
                    placeholder="Search or select your city"
                />
            </div>

            {/* Phone Number */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A' }}>Phone Number</label>
                <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03XX-XXXXXXX"
                    style={{
                        padding: '12px 16px',
                        border: '2px solid #E5E5E5',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontFamily: 'DM Sans, sans-serif',
                        outline: 'none'
                    }}
                />
            </div>

            {/* WhatsApp Sync Toggle */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#F8F8F8',
                borderRadius: '12px',
                border: '1px solid #E5E5E5'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A' }}>WhatsApp Sync</span>
                    <span style={{ fontSize: '11px', color: '#666666' }}>This is also my WhatsApp number</span>
                </div>
                <input
                    type="checkbox"
                    checked={sameWhatsApp}
                    onChange={(e) => setSameWhatsApp(e.target.checked)}
                    style={{
                        width: '20px',
                        height: '20px',
                        accentColor: '#FF0069',
                        cursor: 'pointer'
                    }}
                />
            </div>

            {/* Separate WhatsApp Input */}
            {!sameWhatsApp && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A' }}>WhatsApp Number</label>
                    <input
                        type="tel"
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="03XX-XXXXXXX"
                        style={{
                            padding: '12px 16px',
                            border: '2px solid #E5E5E5',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontFamily: 'DM Sans, sans-serif',
                            outline: 'none'
                        }}
                    />
                </div>
            )}

            {errorMessage && (
                <div style={{ color: '#FF0069', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                    ⚠️ {errorMessage}
                </div>
            )}

            <button
                type="submit"
                disabled={uploading}
                style={{
                    width: '100%',
                    padding: '16px',
                    background: '#FF0069',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(255, 0, 105, 0.3)',
                    marginTop: '8px'
                }}
            >
                Next Step
            </button>
        </form>
    );

    // ── STEP 2: Category & Role Selection ───────────────────────────────
    const renderStep2 = () => {
        const roles = CATEGORY_ROLES[selectedCategory || 'jobs'];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h2 style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 800,
                    fontSize: '22px',
                    color: '#0A0A0A',
                    textAlign: 'center',
                    margin: '0 0 4px 0'
                }}>
                    Category & Role
                </h2>
                <p style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    color: '#666666',
                    textAlign: 'center',
                    margin: '0 0 8px 0'
                }}>
                    Select your main industry and matching profile role
                </p>

                {/* 8 Categories Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {ONBOARDING_CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.key && !customChecked;
                        return (
                            <button
                                key={cat.key}
                                onClick={() => {
                                    setSelectedCategory(cat.key);
                                    setCustomChecked(false);
                                    setSelectedRole(null);
                                    setErrorMessage(null);
                                }}
                                type="button"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '14px 12px',
                                    background: '#FFFFFF',
                                    border: isSelected ? '2px solid #FF0069' : '2px solid #E5E5E5',
                                    borderRadius: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    textAlign: 'left'
                                }}
                            >
                                <span style={{ fontSize: '20px', lineHeight: 1 }}>{cat.emoji}</span>
                                <span style={{
                                    fontFamily: 'DM Sans, sans-serif',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    color: '#0A0A0A',
                                    flex: 1
                                }}>
                                    {cat.label}
                                </span>
                                {isSelected && (
                                    <div style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: '#FF0069',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Check size={10} color="#fff" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Custom Industry Section */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '14px 16px',
                    background: '#F8F8F8',
                    borderRadius: '14px',
                    border: '1px solid #E5E5E5',
                    marginTop: '4px'
                }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={customChecked}
                            onChange={(e) => {
                                setCustomChecked(e.target.checked);
                                if (e.target.checked) {
                                    setSelectedCategory(null);
                                    setSelectedRole(null);
                                }
                            }}
                            style={{
                                width: '18px',
                                height: '18px',
                                accentColor: '#FF0069',
                                cursor: 'pointer'
                            }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A' }}>
                            My industry is not listed above
                        </span>
                    </label>

                    {customChecked && (
                        <input
                            type="text"
                            required
                            value={customIndustry}
                            onChange={(e) => {
                                setCustomIndustry(e.target.value);
                                // For sub-role logic, use 'jobs' as dynamic fallback config
                                setSelectedCategory('jobs');
                            }}
                            placeholder="Enter industry name"
                            style={{
                                padding: '10px 14px',
                                border: '2px solid #E5E5E5',
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontFamily: 'DM Sans, sans-serif',
                                outline: 'none',
                                background: '#FFFFFF'
                            }}
                        />
                    )}
                </div>

                {/* Role Picker (Shown after category selection is complete) */}
                {selectedCategory && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A' }}>
                            Select your profile role
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Provider Role */}
                            <button
                                onClick={() => setSelectedRole('provider')}
                                type="button"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    border: selectedRole === 'provider' ? '2px solid #FF0069' : '2px solid #E5E5E5',
                                    background: selectedRole === 'provider' ? 'rgba(255, 0, 105, 0.04)' : '#FFFFFF',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                }}
                            >
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A' }}>
                                    {roles.providerLabel}
                                </span>
                                {selectedRole === 'provider' && (
                                    <div style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: '#FF0069',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Check size={10} color="#fff" />
                                    </div>
                                )}
                            </button>

                            {/* Seeker Role */}
                            <button
                                onClick={() => setSelectedRole('seeker')}
                                type="button"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    border: selectedRole === 'seeker' ? '2px solid #FF0069' : '2px solid #E5E5E5',
                                    background: selectedRole === 'seeker' ? 'rgba(255, 0, 105, 0.04)' : '#FFFFFF',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                }}
                            >
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A' }}>
                                    {roles.seekerLabel}
                                </span>
                                {selectedRole === 'seeker' && (
                                    <div style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: '#FF0069',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Check size={10} color="#fff" />
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {errorMessage && (
                    <div style={{ color: '#FF0069', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                        ⚠️ {errorMessage}
                    </div>
                )}

                {/* Back / Next buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button
                        onClick={() => {
                            setStep(1);
                            setErrorMessage(null);
                        }}
                        type="button"
                        style={{
                            flex: 1,
                            padding: '16px',
                            border: '1px solid #E5E5E5',
                            color: '#888888',
                            background: 'transparent',
                            borderRadius: '12px',
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 700,
                            fontSize: '15px',
                            cursor: 'pointer'
                        }}
                    >
                        Back
                    </button>
                    <button
                        onClick={handleStep2Submit}
                        type="button"
                        style={{
                            flex: 2,
                            padding: '16px',
                            background: '#FF0069',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '12px',
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 700,
                            fontSize: '15px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(255, 0, 105, 0.3)'
                        }}
                    >
                        Continue
                    </button>
                </div>
            </div>
        );
    };

    // ── STEP 3: Done Screen ──────────────────────────────────────────────
    const renderStep3 = () => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            textAlign: 'center',
            padding: '20px 0'
        }}>
            <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(0, 200, 150, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px'
            }}>
                ✅
            </div>
            <div>
                <h2 style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 800,
                    fontSize: '22px',
                    color: '#0A0A0A',
                    margin: '0 0 6px 0'
                }}>
                    You&apos;re all set!
                </h2>
                <p style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    color: '#666666',
                    margin: 0,
                    lineHeight: '1.5'
                }}>
                    Your profile details have been saved successfully. Start exploring matching jobs or upload an introduction video to stand out.
                </p>
            </div>

            {errorMessage && (
                <div style={{ color: '#FF0069', fontSize: '13px', fontWeight: 600 }}>
                    ⚠️ {errorMessage}
                </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '8px' }}>
                <button
                    onClick={() => handleFinalSave('/feed')}
                    disabled={saving}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: '#FF0069',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '12px',
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 700,
                        fontSize: '15px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 14px rgba(255, 0, 105, 0.3)'
                    }}
                >
                    {saving ? 'Completing setup...' : 'Explore Feed'}
                </button>
                <button
                    onClick={() => handleFinalSave('/dashboard/upload-video')}
                    disabled={saving}
                    style={{
                        width: '100%',
                        padding: '15px',
                        background: 'transparent',
                        color: '#FF0069',
                        border: '2px solid #FF0069',
                        borderRadius: '12px',
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 700,
                        fontSize: '15px',
                        cursor: saving ? 'not-allowed' : 'pointer'
                    }}
                >
                    Upload Video
                </button>
            </div>
        </div>
    );

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            {/* Step Indicators */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '28px'
            }}>
                {[1, 2, 3].map((s) => {
                    const isActive = step === s;
                    const isDone = step > s;
                    return (
                        <div
                            key={s}
                            style={{
                                width: isActive ? '24px' : '8px',
                                height: '8px',
                                borderRadius: '4px',
                                background: isActive || isDone ? '#FF0069' : '#E5E5E5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.25s ease'
                            }}
                        >
                            {isDone && <Check size={5} color="#fff" style={{ fontWeight: 'bold' }} />}
                        </div>
                    );
                })}
            </div>

            {/* Step Content */}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
        </div>
    );
}