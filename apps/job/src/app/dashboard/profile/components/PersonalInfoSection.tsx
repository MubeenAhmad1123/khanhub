'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Camera, Mail, Phone, MapPin, Briefcase, Check, Loader2, Save, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { JobSeekerProfile } from '@/types/user';

interface PersonalInfoSectionProps {
    profile: JobSeekerProfile;
    onSave: (data: Partial<JobSeekerProfile>) => Promise<void>;
}

export default function PersonalInfoSection({ profile, onSave }: PersonalInfoSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: (profile as any).name || (profile as any).profile?.name || (profile as any).fullName || '',
        desiredJobTitle: (profile as any).desiredJobTitle || (profile as any).profile?.desiredJobTitle || (profile as any).preferredJobTitle || '',
        city: (profile as any).city || (profile as any).profile?.city || (profile as any).location || '',
        phone: (profile as any).phone || (profile as any).profile?.phone || '',
    });
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [photoLoading, setPhotoLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB.');
            return;
        }

        setPhotoLoading(true);
        try {
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
            const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

            if (!cloudName || !uploadPreset) {
                throw new Error('Cloudinary not configured');
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', `khanhub/profiles/${(profile as any).uid || (profile as any).id || (profile as any).userId}`);

            const res = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                { method: 'POST', body: formData }
            );

            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();

            // Save to Firestore - ONLY photoURL and updatedAt, use merge: true
            await onSave({
                photoURL: data.secure_url,
                updatedAt: new Date()
            } as any);

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Photo upload error:', error);
            alert('Failed to upload photo. Please try again.');
        } finally {
            setPhotoLoading(false);
        }
    };

    useEffect(() => {
        setFormData({
            name: (profile as any).name || (profile as any).profile?.name || (profile as any).fullName || '',
            desiredJobTitle: (profile as any).desiredJobTitle || (profile as any).profile?.desiredJobTitle || (profile as any).preferredJobTitle || '',
            city: (profile as any).city || (profile as any).profile?.city || (profile as any).location || '',
            phone: (profile as any).phone || (profile as any).profile?.phone || '',
        });
    }, [profile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveStatus('saving');
        try {
            await onSave(formData);
            setSaveStatus('saved');
            setIsEditing(false);
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (err) {
            setSaveStatus('error');
        }
    };

    return (
        <section className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-blue-500/5 transition-all hover:shadow-blue-500/10 overflow-hidden">
            <div className="p-8 md:p-10">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Profile Picture */}
                    <div className="relative group shrink-0">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoUpload}
                            className="hidden"
                            accept="image/*"
                        />
                        <div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center relative">
                            {(profile as any).photoURL || (profile as any).profile?.photoURL ? (
                                <Image
                                    src={(profile as any).photoURL || (profile as any).profile?.photoURL}
                                    alt="Profile"
                                    fill
                                    className="object-cover"
                                />
                            ) : ((profile as any).name || (profile as any).displayName || profile.fullName) ? (
                                <div className="text-4xl font-black text-blue-600 italic uppercase">
                                    {((profile as any).name || (profile as any).displayName || profile.fullName || '').charAt(0)}
                                </div>
                            ) : (
                                <User className="w-12 h-12 text-slate-300" />
                            )}

                            {photoLoading && (
                                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={photoLoading}
                            className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-3 rounded-2xl shadow-lg border-4 border-white hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            <Camera className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">
                                    {(profile as any).name || (profile as any).displayName || (profile as any).fullName || 'Complete Your Name'}
                                </h2>
                                <p className="text-lg font-bold text-blue-600 italic uppercase tracking-tight">
                                    {(profile as any).desiredJobTitle || (profile as any).profile?.desiredJobTitle || (profile as any).preferredJobTitle || 'Specify Your Target Role'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="px-6 py-2 bg-slate-50 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                            >
                                {isEditing ? 'Cancel' : 'Edit Section'}
                            </button>
                        </div>

                        {!isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="flex items-center gap-3 text-slate-500 font-bold text-sm bg-slate-50/50 p-3 rounded-2xl border border-slate-50">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    {profile.city || (profile as any).location || 'Location Not Set'}
                                </div>
                                <div className="flex items-center gap-3 text-slate-500 font-bold text-sm bg-slate-50/50 p-3 rounded-2xl border border-slate-50">
                                    <Phone className="w-4 h-4 text-blue-500" />
                                    {profile.phone || 'Phone Not Set'}
                                </div>
                                <div className="flex items-center gap-3 text-slate-500 font-bold text-sm bg-slate-50/50 p-3 rounded-2xl border border-slate-50">
                                    <Mail className="w-4 h-4 text-blue-500" />
                                    {/* Email often comes from user object, but we'll placeholder it */}
                                    Email Protected
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        name="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className={cn("w-full px-5 py-3 bg-slate-50 border-2 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-bold", (profile as any).flags?.some((f: any) => f.field === 'name' && !f.resolved) ? "border-red-400" : "border-slate-100")}
                                        placeholder="e.g. John Doe"
                                    />
                                    {(profile as any).flags?.find((f: any) => f.field === 'name' && !f.resolved) && (
                                        <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> {(profile as any).flags.find((f: any) => f.field === 'name' && !f.resolved).reason}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Professional Title</label>
                                    <input
                                        type="text"
                                        required
                                        name="desiredJobTitle"
                                        value={formData.desiredJobTitle}
                                        onChange={(e) => setFormData({ ...formData, desiredJobTitle: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-bold"
                                        placeholder="e.g. Senior Frontend Developer"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City / Location</label>
                                    <input
                                        type="text"
                                        required
                                        name="city"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className={cn("w-full px-5 py-3 bg-slate-50 border-2 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-bold", (profile as any).flags?.some((f: any) => f.field === 'location' && !f.resolved) ? "border-red-400" : "border-slate-100")}
                                        placeholder="e.g. Lahore, Pakistan"
                                    />
                                    {(profile as any).flags?.find((f: any) => f.field === 'location' && !f.resolved) && (
                                        <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> {(profile as any).flags.find((f: any) => f.field === 'location' && !f.resolved).reason}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        required
                                        name="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className={cn("w-full px-5 py-3 bg-slate-50 border-2 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-bold", (profile as any).flags?.some((f: any) => f.field === 'phone' && !f.resolved) ? "border-red-400" : "border-slate-100")}
                                        placeholder="03XXXXXXXXX"
                                    />
                                    {(profile as any).flags?.find((f: any) => f.field === 'phone' && !f.resolved) && (
                                        <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> {(profile as any).flags.find((f: any) => f.field === 'phone' && !f.resolved).reason}
                                        </p>
                                    )}
                                </div>
                                <div className="md:col-span-2 pt-2">
                                    <button
                                        type="submit"
                                        disabled={saveStatus === 'saving'}
                                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                    >
                                        {saveStatus === 'saving' ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5" />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* Save Status Overlay */}
            {saveStatus === 'saved' && (
                <div className="absolute top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 animate-in slide-in-from-right-4">
                    <Check className="w-4 h-4" />
                    Updated!
                </div>
            )}
        </section>
    );
}
