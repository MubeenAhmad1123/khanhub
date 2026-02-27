'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase/firebase-config';
import { doc, getDoc, updateDoc, serverTimestamp, deleteField, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { writeActivityLog } from '@/hooks/useActivityLog';
import {
    Save,
    ArrowLeft,
    User,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    Loader2,
    Shield,
    Video,
    AlertTriangle,
    Flag,
    Building2
} from 'lucide-react';
import Link from 'next/link';

import { INDUSTRIES, getSubcategories, getRoles } from '@/lib/constants/categories';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export default function AdminEditUserPage() {
    const { id } = useParams();
    const { user: adminUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        city: '',
        industry: '',
        subcategory: '',
        desiredJobTitle: '',
        professionalSummary: '',
        skills: '',           // comma-separated string for editing
        isPremium: false,
        isActive: true,
        isBanned: false,
        isFeatured: false,
        profile_status: '',
        // Employer only:
        companyName: '',
        website: '',
        whatsapp: '',
    });

    const [flagModal, setFlagModal] = useState<{
        field: string;
        label: string;
        reason: string;
    } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, 'users', id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserData(data);
                    setFormData({
                        name: data.name || data.displayName || '',
                        email: data.email || '',
                        phone: data.phone || data.profile?.phone || '',
                        city: data.city || data.location || data.profile?.location || '',
                        industry: data.industry || data.profile?.industry || '',
                        subcategory: data.subcategory
                            || data.desiredSubcategory
                            || data.profile?.preferredSubcategory || '',
                        desiredJobTitle: data.desiredJobTitle
                            || data.role_in_category
                            || data.profile?.preferredJobTitle || '',
                        professionalSummary: data.professionalSummary
                            || data.profile?.bio || '',
                        skills: (data.skills
                            || data.profile?.skills
                            || []).join(', '),
                        isPremium: !!data.isPremium,
                        isActive: data.isActive !== false,
                        isBanned: !!data.isBanned,
                        isFeatured: !!data.isFeatured,
                        profile_status: data.profile_status || 'incomplete',
                        companyName: data.companyName
                            || data.company?.name
                            || data.companyProfile?.companyName || '',
                        website: data.website
                            || data.company?.website
                            || data.companyProfile?.website || '',
                        whatsapp: data.whatsapp
                            || data.company?.phone
                            || data.companyProfile?.whatsapp || '',
                    });
                } else {
                    toast('User not found', 'error');
                    router.push('/admin/users');
                }
            } catch (err) {
                console.error(err);
                toast('Failed to fetch user', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [id, router, toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !adminUser) return;

        try {
            setSaving(true);
            const userRef = doc(db, 'users', id as string);

            // FLAT writes only — no nested profile:{} or company:{}
            // This is safe with setDoc merge:true
            const { setDoc } = await import('firebase/firestore');

            await setDoc(userRef, {
                name: formData.name.trim(),
                displayName: formData.name.trim(),
                phone: formData.phone.trim(),
                city: formData.city.trim(),
                location: formData.city.trim(),  // keep both for compatibility
                industry: formData.industry,
                desiredIndustry: formData.industry,
                subcategory: formData.subcategory,
                desiredSubcategory: formData.subcategory,
                desiredJobTitle: formData.desiredJobTitle.trim(),
                role_in_category: formData.desiredJobTitle.trim(),
                professionalSummary: formData.professionalSummary.trim(),
                skills: formData.skills
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean),
                isPremium: formData.isPremium,
                isActive: formData.isActive,
                isBanned: formData.isBanned,
                isFeatured: formData.isFeatured,
                profile_status: formData.profile_status,
                // Employer-specific flat fields
                ...(userData.role === 'employer' ? {
                    companyName: formData.companyName.trim(),
                    website: formData.website.trim(),
                    whatsapp: formData.whatsapp.trim(),
                } : {}),
                updatedAt: serverTimestamp(),
            }, { merge: true });

            await writeActivityLog({
                admin_id: adminUser.uid,
                action_type: 'user_updated',
                target_id: id as string,
                target_type: 'user',
                note: `Admin updated user: ${formData.name} (${userData?.email})`
            });

            toast('User updated successfully', 'success');
        } catch (err: any) {
            console.error(err);
            toast(err.message || 'Failed to update user', 'error');
        } finally {
            setSaving(false);
        }
    };

    const flagField = (fieldName: string, fieldLabel: string) => {
        setFlagModal({ field: fieldName, label: fieldLabel, reason: '' });
    };

    const submitFlag = async () => {
        if (!flagModal || !flagModal.reason.trim() || !id) return;
        try {
            const userRef = doc(db, 'users', id as string);
            const newFlag = {
                field: flagModal.field,
                label: flagModal.label,
                reason: flagModal.reason.trim(),
                resolved: false,
                flaggedAt: new Date().toISOString(),
            };
            const updatedFlags = [...(userData.flags || []), newFlag];
            await updateDoc(userRef, { flags: updatedFlags });
            setUserData((prev: any) => ({ ...prev, flags: updatedFlags }));

            await addDoc(collection(db, 'notifications'), {
                userId: id as string,
                type: 'profile_flagged',
                title: 'Profile Update Required',
                message: `Admin flagged your ${flagModal.label}: ${flagModal.reason}. Please update it.`,
                read: false,
                createdAt: serverTimestamp(),
                action_url: '/dashboard/profile'
            });

            toast(`Flagged: ${flagModal.label}`, 'success');
            setFlagModal(null);
        } catch (err) {
            console.error(err);
            toast('Failed to flag field', 'error');
        }
    };

    const fixVideoData = async () => {
        if (!id) return;
        const confirmFix = window.confirm("This will remove legacy video fields (videoResume, thumbnailUrl, videoUrl) from the USER document and allow you to verify/correct video documents. Proceed?");
        if (!confirmFix) return;

        try {
            setSaving(true);
            const userRef = doc(db, 'users', id as string);

            // 1. Query videos for this user
            const q = query(collection(db, 'videos'), where('userId', '==', id));
            const snap = await getDocs(q);

            if (snap.empty) {
                toast('No video documents found for this user', 'info');
            } else {
                for (const videoDoc of snap.docs) {
                    const data = videoDoc.data();
                    const newThumb = window.prompt(`Video ID: ${videoDoc.id}\nCurrent Thumbnail: ${data.thumbnailUrl}\nEnter new URL to change, or leave empty to keep current:`, data.thumbnailUrl);
                    if (newThumb !== null && newThumb !== data.thumbnailUrl) {
                        await updateDoc(videoDoc.ref, { thumbnailUrl: newThumb });
                    }
                }
            }

            // 2. Clean up user document
            await updateDoc(userRef, {
                thumbnailUrl: deleteField(),
                videoUrl: deleteField(),
                videoFileName: deleteField(),
                'profile.videoResume': deleteField(),
                'profile.videoUrl': deleteField(),
                updatedAt: serverTimestamp(),
            });

            toast('Video data cleaned up and corrected', 'success');
            // Refresh local data
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) setUserData(docSnap.data());

        } catch (err: any) {
            console.error(err);
            toast(err.message || 'Failed to fix video data', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-20 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/users"
                    className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">
                        Edit Member Details
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">
                        Editing: {userData?.email}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Info */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                        <div className="text-center md:text-left mb-4">
                            <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" />
                                Core Identity
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <div className="flex items-center justify-between mb-1.5 ml-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                                    <button
                                        type="button"
                                        onClick={() => flagField('name', 'Full Name')}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 uppercase tracking-tighter"
                                    >
                                        <Flag className="w-3 h-3" /> Flag
                                    </button>
                                </div>
                                <input
                                    required
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <div className="flex items-center justify-between mb-1.5 ml-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                                    <button
                                        type="button"
                                        onClick={() => flagField('email', 'Email')}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 uppercase tracking-tighter"
                                    >
                                        <Flag className="w-3 h-3" /> Flag
                                    </button>
                                </div>
                                <input
                                    required
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5 ml-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</label>
                                    <button
                                        type="button"
                                        onClick={() => flagField('phone', 'Phone')}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 uppercase tracking-tighter"
                                    >
                                        <Flag className="w-3 h-3" /> Flag
                                    </button>
                                </div>
                                <input
                                    required
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5 ml-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        City / Location
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => flagField('city', 'City')}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 uppercase tracking-tighter"
                                    >
                                        <Flag className="w-3 h-3" /> Flag
                                    </button>
                                </div>
                                <input
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Lahore, Karachi"
                                    className="w-full px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                        <div className="text-center md:text-left mb-4">
                            <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-blue-600" />
                                Professional Context
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Industry</label>
                                    <SearchableSelect
                                        options={INDUSTRIES.map(i => ({ id: i.id, label: i.label }))}
                                        value={formData.industry}
                                        onChange={(val) => setFormData(prev => ({ ...prev, industry: val, subcategory: '', role_in_category: '' }))}
                                        placeholder="Select Industry"
                                    />
                                </div>

                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Sub-sector</label>
                                    <SearchableSelect
                                        options={getSubcategories(formData.industry).map(s => ({ id: s.id, label: s.label }))}
                                        value={formData.subcategory}
                                        onChange={(val) => setFormData(prev => ({ ...prev, subcategory: val, role_in_category: '' }))}
                                        placeholder="Select Subcategory"
                                    />
                                </div>

                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Exact Role / Title</label>
                                    {getRoles(formData.industry, formData.subcategory).length > 0 ? (
                                        <SearchableSelect
                                            options={getRoles(formData.industry, formData.subcategory).map(r => ({ id: r, label: r }))}
                                            value={formData.desiredJobTitle}
                                            onChange={(val) => setFormData(prev => ({ ...prev, desiredJobTitle: val }))}
                                            placeholder="Select Role"
                                        />
                                    ) : (
                                        <input
                                            name="desiredJobTitle"
                                            value={formData.desiredJobTitle}
                                            onChange={(e) => setFormData(prev => ({ ...prev, desiredJobTitle: e.target.value }))}
                                            className="w-full px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                            placeholder="e.g. Senior Doctor"
                                        />
                                    )}
                                </div>

                                {/* Professional Summary */}
                                <div className="md:col-span-2">
                                    <div className="flex items-center justify-between mb-1.5 ml-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Professional Summary
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => flagField('professionalSummary', 'Professional Summary')}
                                            className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 uppercase tracking-tighter"
                                        >
                                            <Flag className="w-3 h-3" /> Flag
                                        </button>
                                    </div>
                                    <textarea
                                        name="professionalSummary"
                                        value={formData.professionalSummary}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev, professionalSummary: e.target.value
                                        }))}
                                        rows={4}
                                        placeholder="Edit user's professional summary..."
                                        className="w-full px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all resize-none"
                                    />
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-2">
                                        {formData.professionalSummary.length} characters
                                    </p>
                                </div>

                                {/* Skills */}
                                <div className="md:col-span-2">
                                    <div className="flex items-center justify-between mb-1.5 ml-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Skills (comma separated)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => flagField('skills', 'Skills')}
                                            className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 uppercase tracking-tighter"
                                        >
                                            <Flag className="w-3 h-3" /> Flag
                                        </button>
                                    </div>
                                    <input
                                        name="skills"
                                        value={formData.skills}
                                        onChange={handleInputChange}
                                        placeholder="React, Leadership, Sales..."
                                        className="w-full px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                    />
                                    {/* Show parsed tags preview */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.skills.split(',').filter(s => s.trim()).map(
                                            (skill, i) => (
                                                <span key={i}
                                                    className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg border border-blue-100 uppercase tracking-tight"
                                                >
                                                    {skill.trim()}
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-8 rounded-[32px] shadow-xl space-y-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-400" />
                                Permission Gear
                            </h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Profile Status</label>
                                <select
                                    name="profile_status"
                                    value={formData.profile_status}
                                    onChange={handleInputChange}
                                    className="w-full px-6 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-400 outline-none font-bold text-white transition-all appearance-none"
                                >
                                    <option value="incomplete" className="bg-slate-900 text-white">Incomplete</option>
                                    <option value="video_pending" className="bg-slate-900 text-white">Video Pending</option>
                                    <option value="active" className="bg-slate-900 text-white">Active (Live)</option>
                                    <option value="banned" className="bg-slate-900 text-white">Banned</option>
                                </select>
                            </div>

                            <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all group">
                                <input
                                    type="checkbox"
                                    name="isPremium"
                                    checked={formData.isPremium}
                                    onChange={handleInputChange}
                                    className="w-5 h-5 rounded-lg border-white/20 bg-transparent text-blue-500 focus:ring-offset-0 focus:ring-0"
                                />
                                <span className="font-bold text-sm group-hover:text-blue-400 transition-colors">Premium Account 💎</span>
                            </label>

                            {/* isActive toggle */}
                            <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all group">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleInputChange}
                                    className="w-5 h-5 rounded-lg border-white/20 bg-transparent text-green-500 focus:ring-offset-0 focus:ring-0"
                                />
                                <span className="font-bold text-sm group-hover:text-green-400 transition-colors">
                                    Active / Visible ✅
                                </span>
                            </label>

                            {/* isBanned toggle */}
                            <label className="flex items-center gap-3 p-4 bg-white/5 border border-red-500/20 rounded-2xl cursor-pointer hover:bg-red-500/10 transition-all group">
                                <input
                                    type="checkbox"
                                    name="isBanned"
                                    checked={formData.isBanned}
                                    onChange={handleInputChange}
                                    className="w-5 h-5 rounded-lg text-red-500 focus:ring-offset-0 focus:ring-0"
                                />
                                <span className="font-bold text-sm group-hover:text-red-400 transition-colors">
                                    Banned Account 🚫
                                </span>
                            </label>

                            {/* isFeatured toggle */}
                            <label className="flex items-center gap-3 p-4 bg-white/5 border border-yellow-500/20 rounded-2xl cursor-pointer hover:bg-yellow-500/10 transition-all group">
                                <input
                                    type="checkbox"
                                    name="isFeatured"
                                    checked={formData.isFeatured}
                                    onChange={handleInputChange}
                                    className="w-5 h-5 rounded-lg text-yellow-500 focus:ring-offset-0 focus:ring-0"
                                />
                                <span className="font-bold text-sm group-hover:text-yellow-400 transition-colors">
                                    Featured Profile ⭐
                                </span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-blue-600 text-white font-black italic rounded-[25px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 uppercase tracking-tighter disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            {saving ? 'Saving...' : 'Commit Changes'}
                        </button>

                        <button
                            type="button"
                            onClick={fixVideoData}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-red-500/10 border-2 border-red-500/20 text-red-600 font-black italic rounded-[25px] hover:bg-red-500 hover:text-white transition-all uppercase tracking-tighter disabled:opacity-50"
                        >
                            <Video className="w-5 h-5" />
                            Fix & Sync Video Data
                        </button>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 flex items-start gap-4 italic font-bold text-blue-900 text-xs leading-relaxed">
                        <Video className="w-5 h-5 shrink-0 text-blue-600" />
                        Changes here are live immediately. If you change the status to "Active", the user's video will appear in search results across the platform.
                    </div>
                </div>
            </form>

            {flagModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl space-y-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
                                Flag: {flagModal.label}
                            </h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                User will be notified to fix this
                            </p>
                        </div>
                        <textarea
                            autoFocus
                            rows={3}
                            placeholder="Describe the issue clearly..."
                            value={flagModal.reason}
                            onChange={e => setFlagModal(prev =>
                                prev ? { ...prev, reason: e.target.value } : null
                            )}
                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-red-400 focus:ring-4 focus:ring-red-500/10 outline-none font-bold text-slate-700 resize-none transition-all"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setFlagModal(null)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitFlag}
                                disabled={!flagModal.reason.trim()}
                                className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-40"
                            >
                                Send Flag
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
