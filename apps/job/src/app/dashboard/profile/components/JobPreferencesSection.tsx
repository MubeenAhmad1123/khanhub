'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Check, DollarSign, MapPin, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobSeekerProfile } from '@/types/user';

interface JobPreferencesSectionProps {
    profile: JobSeekerProfile;
    onSave: (data: Partial<JobSeekerProfile>) => Promise<void>;
}

export default function JobPreferencesSection({ profile, onSave }: JobPreferencesSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        preferredJobTitle: (profile as any).preferredJobTitle || (profile as any).profile?.preferredJobTitle || '',
        desiredSalaryMin: (profile as any).desiredSalaryMin || (profile as any).profile?.desiredSalaryMin || 0,
        desiredSalaryMax: (profile as any).desiredSalaryMax || (profile as any).profile?.desiredSalaryMax || 0,
        desiredLocations: (profile as any).desiredLocations || (profile as any).profile?.desiredLocations || [],
        remoteOnly: (profile as any).remoteOnly || (profile as any).profile?.remoteOnly || false,
        willingToRelocate: (profile as any).willingToRelocate || (profile as any).profile?.willingToRelocate || false,
    });
    const [newLocation, setNewLocation] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        setFormData({
            preferredJobTitle: (profile as any).preferredJobTitle || (profile as any).profile?.preferredJobTitle || '',
            desiredSalaryMin: (profile as any).desiredSalaryMin || (profile as any).profile?.desiredSalaryMin || 0,
            desiredSalaryMax: (profile as any).desiredSalaryMax || (profile as any).profile?.desiredSalaryMax || 0,
            desiredLocations: (profile as any).desiredLocations || (profile as any).profile?.desiredLocations || [],
            remoteOnly: (profile as any).remoteOnly || (profile as any).profile?.remoteOnly || false,
            willingToRelocate: (profile as any).willingToRelocate || (profile as any).profile?.willingToRelocate || false,
        });
    }, [profile]);

    const handleAddLocation = (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = newLocation.trim();
        if (trimmed && !formData.desiredLocations.includes(trimmed)) {
            setFormData({
                ...formData,
                desiredLocations: [...formData.desiredLocations, trimmed]
            });
            setNewLocation('');
        }
    };

    const handleRemoveLocation = (loc: string) => {
        setFormData({
            ...formData,
            desiredLocations: formData.desiredLocations.filter(l => l !== loc)
        });
    };

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
        <section className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-blue-500/5 transition-all hover:shadow-blue-500/10 overflow-hidden relative">
            <div className="p-8 md:p-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                            <Settings className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">Job Preferences</h2>
                    </div>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-6 py-2 bg-slate-50 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                        >
                            Edit Preferences
                        </button>
                    )}
                </div>

                {!isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Desired Role</label>
                                <p className="text-slate-900 font-bold text-lg uppercase italic tracking-tighter">{formData.preferredJobTitle || 'Not specified'}</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Desired Salary Range (PKR)</label>
                                <p className="text-blue-600 font-black text-lg italic tracking-tighter">
                                    {formData.desiredSalaryMin && formData.desiredSalaryMax
                                        ? `${formData.desiredSalaryMin.toLocaleString()} - ${formData.desiredSalaryMax.toLocaleString()}`
                                        : 'Negotiable'}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Preferred Locations</label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {formData.desiredLocations.length > 0 ? (
                                        formData.desiredLocations.map((loc, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{loc}</span>
                                        ))
                                    ) : (
                                        <p className="text-slate-400 text-sm italic font-medium">Anywhere</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-4 pt-2">
                                <div className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2", formData.remoteOnly ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-300")}>
                                    <Briefcase className="w-3 h-3" />
                                    Remote Only
                                </div>
                                <div className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2", formData.willingToRelocate ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-300")}>
                                    <MapPin className="w-3 h-3" />
                                    Willing to Relocate
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desired Job Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.preferredJobTitle}
                                    onChange={(e) => setFormData({ ...formData, preferredJobTitle: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-bold"
                                    placeholder="e.g. Graphic Designer"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Salary Range (Monthly)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        value={formData.desiredSalaryMin || ''}
                                        onChange={(e) => setFormData({ ...formData, desiredSalaryMin: parseInt(e.target.value) || 0 })}
                                        className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-bold text-sm"
                                        placeholder="Min"
                                    />
                                    <span className="text-slate-300">—</span>
                                    <input
                                        type="number"
                                        value={formData.desiredSalaryMax || ''}
                                        onChange={(e) => setFormData({ ...formData, desiredSalaryMax: parseInt(e.target.value) || 0 })}
                                        className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-bold text-sm"
                                        placeholder="Max"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preferred Cities</label>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={newLocation}
                                        onChange={(e) => setNewLocation(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLocation())}
                                        className="flex-1 px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-bold text-sm"
                                        placeholder="Add City"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddLocation}
                                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all thin-shadow"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 min-h-[40px] px-4 py-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    {formData.desiredLocations.map((loc, idx) => (
                                        <div key={idx} className="px-3 py-1 bg-white text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 flex items-center gap-2">
                                            {loc}
                                            <button type="button" onClick={() => handleRemoveLocation(loc)} className="text-slate-300 hover:text-red-500">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4 pt-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData.remoteOnly}
                                        onChange={(e) => setFormData({ ...formData, remoteOnly: e.target.checked })}
                                        className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-bold text-slate-600 uppercase tracking-tight group-hover:text-slate-900 transition-colors">Only show remote jobs</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData.willingToRelocate}
                                        onChange={(e) => setFormData({ ...formData, willingToRelocate: e.target.checked })}
                                        className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-bold text-slate-600 uppercase tracking-tight group-hover:text-slate-900 transition-colors">Willing to Relocate</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditing(false); setFormData({
                                        preferredJobTitle: (profile as any).preferredJobTitle || (profile as any).profile?.preferredJobTitle || '',
                                        desiredSalaryMin: (profile as any).desiredSalaryMin || (profile as any).profile?.desiredSalaryMin || 0,
                                        desiredSalaryMax: (profile as any).desiredSalaryMax || (profile as any).profile?.desiredSalaryMax || 0,
                                        desiredLocations: (profile as any).desiredLocations || (profile as any).profile?.desiredLocations || [],
                                        remoteOnly: (profile as any).remoteOnly || (profile as any).profile?.remoteOnly || false,
                                        willingToRelocate: (profile as any).willingToRelocate || (profile as any).profile?.willingToRelocate || false,
                                    });
                                }}
                                className="px-6 py-2 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saveStatus === 'saving'}
                                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                            >
                                {saveStatus === 'saving' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Preferences
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
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

function X(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    )
}
