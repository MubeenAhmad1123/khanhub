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
    Flag
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
        location: '',
        industry: '',
        subcategory: '',
        role_in_category: '',
        isPremium: false,
        profile_status: '',
    });

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
                        location: data.location || data.profile?.location || '',
                        industry: data.industry || data.profile?.industry || '',
                        subcategory: data.subcategory || data.profile?.preferredSubcategory || '',
                        role_in_category: data.role_in_category || data.profile?.preferredJobTitle || '',
                        isPremium: !!data.isPremium,
                        profile_status: data.profile_status || 'incomplete',
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

            const updates: any = {
                name: formData.name,
                displayName: formData.name,
                email: formData.email.toLowerCase(),
                phone: formData.phone,
                location: formData.location,
                industry: formData.industry,
                subcategory: formData.subcategory,
                role_in_category: formData.role_in_category,
                isPremium: formData.isPremium,
                profile_status: formData.profile_status,
                updatedAt: serverTimestamp(),
            };

            // Also update the role-specific profile fields for consistency
            if (userData.role === 'job_seeker') {
                updates.profile = {
                    ...(userData.profile || {}),
                    fullName: formData.name,
                    phone: formData.phone,
                    location: formData.location,
                    industry: formData.industry,
                    preferredSubcategory: formData.subcategory,
                    preferredJobTitle: formData.role_in_category,
                };
            } else if (userData.role === 'employer') {
                updates.company = {
                    ...(userData.company || {}),
                    name: formData.name,
                    industry: formData.industry,
                    subcategory: formData.subcategory,
                    location: formData.location,
                };
            }

            await updateDoc(userRef, updates);

            await writeActivityLog({
                admin_id: adminUser.uid,
                action_type: 'user_updated',
                target_id: id as string,
                target_type: 'user',
                note: `Admin updated user details for: ${formData.email}`
            });

            toast('User details updated successfully', 'success');
            router.push('/admin/users');
        } catch (err: any) {
            console.error(err);
            toast(err.message || 'Failed to update user', 'error');
        } finally {
            setSaving(false);
        }
    };

    const flagField = async (fieldName: string, fieldLabel: string) => {
        const reason = window.prompt(`Reason for flagging ${fieldLabel}:`);
        if (!reason || !id) return;

        try {
            const userRef = doc(db, 'users', id as string);
            const newFlag = {
                field: fieldName,
                label: fieldLabel,
                reason,
                resolved: false,
                flaggedAt: new Date().toISOString(),
            };

            const updatedFlags = [...(userData.flags || []), newFlag];
            await updateDoc(userRef, { flags: updatedFlags });

            // Update local state
            setUserData(prev => ({ ...prev, flags: updatedFlags }));

            // Send notification to user
            await addDoc(collection(db, 'notifications'), {
                user_id: id as string,
                type: 'flag',
                message: `Admin has flagged your '${fieldLabel}': ${reason}. Please update it to resolve the flag.`,
                is_read: false,
                created_at: serverTimestamp(),
                reference_id: fieldName,
                action_url: '/dashboard/profile'
            });

            toast(`Flagged ${fieldLabel}`, 'success');
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
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</label>
                                    <button
                                        type="button"
                                        onClick={() => flagField('location', 'Location')}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 uppercase tracking-tighter"
                                    >
                                        <Flag className="w-3 h-3" /> Flag
                                    </button>
                                </div>
                                <input
                                    required
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
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
                                            value={formData.role_in_category}
                                            onChange={(val) => setFormData(prev => ({ ...prev, role_in_category: val }))}
                                            placeholder="Select Role"
                                        />
                                    ) : (
                                        <input
                                            name="role_in_category"
                                            value={formData.role_in_category}
                                            onChange={(e) => setFormData(prev => ({ ...prev, role_in_category: e.target.value }))}
                                            className="w-full px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                            placeholder="e.g. Senior Doctor"
                                        />
                                    )}
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
        </div>
    );
}
