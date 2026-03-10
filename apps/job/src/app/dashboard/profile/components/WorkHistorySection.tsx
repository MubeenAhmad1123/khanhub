'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase, Plus, Edit2, Trash2, Save, Loader2, Check, Calendar, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobSeekerProfile, WorkExperience } from '@/types/user';

interface WorkHistorySectionProps {
    profile: JobSeekerProfile;
    onSave: (data: Partial<JobSeekerProfile>) => Promise<void>;
}

export default function WorkHistorySection({ profile, onSave }: WorkHistorySectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editingEntry, setEditingEntry] = useState<Partial<WorkExperience> | null>(null);
    const getNormalizedExperiences = useCallback(() => {
        const rawExp = (profile as any).experience || (profile as any).profile?.experience;
        const expArray = Array.isArray(rawExp) ? rawExp : (typeof rawExp === 'object' && rawExp !== null ? Object.values(rawExp) : []);
        return expArray.map((e: any) => ({
            id: e.id || Math.random().toString(36).substr(2, 9),
            title: e.title || e.jobTitle || '',
            company: e.company || '',
            location: e.location || e.city || '',
            startDate: e.startDate || (e.startYear ? `${e.startYear}-${e.startMonth || '01'}` : ''),
            endDate: e.endDate || (e.endYear ? `${e.endYear}-${e.endMonth || '01'}` : ''),
            current: e.current ?? e.currentlyWorking ?? false,
            description: e.description || '',
            skills: e.skills || [],
        }));
    }, [profile]);

    const [experiences, setExperiences] = useState<WorkExperience[]>(getNormalizedExperiences());
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        setExperiences(getNormalizedExperiences());
    }, [getNormalizedExperiences]);

    const handleAdd = () => {
        setEditingEntry({
            id: Math.random().toString(36).substr(2, 9),
            title: '',
            company: '',
            location: '',
            startDate: '',
            endDate: '',
            current: false,
            description: '',
        });
        setIsEditing(true);
    };

    const handleEdit = (entry: WorkExperience) => {
        setEditingEntry(entry);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this experience?')) return;
        const updated = experiences.filter(e => e.id !== id);
        setSaveStatus('saving');
        try {
            await onSave({ experience: updated });
            setExperiences(updated);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (err) {
            setSaveStatus('error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEntry) return;

        setSaveStatus('saving');
        let updated: WorkExperience[];
        const existingIndex = experiences.findIndex(exp => exp.id === editingEntry.id);

        if (existingIndex > -1) {
            updated = [...experiences];
            updated[existingIndex] = editingEntry as WorkExperience;
        } else {
            updated = [...experiences, editingEntry as WorkExperience];
        }

        try {
            await onSave({ experience: updated });
            setExperiences(updated);
            setSaveStatus('saved');
            setIsEditing(false);
            setEditingEntry(null);
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
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">Work History</h2>
                    </div>
                    {!isEditing && (
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            Add Experience
                        </button>
                    )}
                </div>

                {isEditing && editingEntry ? (
                    <form onSubmit={handleSubmit} className="space-y-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 animate-in fade-in slide-in-from-top-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                                    Job Title
                                    <span className="text-blue-600 font-medium normal-case tracking-normal" dir="rtl">عہدے کا نام</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingEntry.title}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, title: e.target.value })}
                                    style={{
                                        background: '#FFFFFF',
                                        color: '#0A0A0A',
                                        border: '1.5px solid #E5E5E5',
                                        borderRadius: '8px',
                                        padding: '10px 14px',
                                        fontSize: '14px',
                                        width: '100%',
                                        outline: 'none',
                                    }}
                                    placeholder="e.g. Senior Product Designer"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                                    Company Name
                                    <span className="text-blue-600 font-medium normal-case tracking-normal" dir="rtl">کمپنی کا نام</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingEntry.company}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, company: e.target.value })}
                                    style={{
                                        background: '#FFFFFF',
                                        color: '#0A0A0A',
                                        border: '1.5px solid #E5E5E5',
                                        borderRadius: '8px',
                                        padding: '10px 14px',
                                        fontSize: '14px',
                                        width: '100%',
                                        outline: 'none',
                                    }}
                                    placeholder="e.g. Digital Pulse"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                                    Start Date
                                    <span className="text-blue-600 font-medium normal-case tracking-normal" dir="rtl">شروع کرنے کی تاریخ</span>
                                </label>
                                <input
                                    type="month"
                                    required
                                    value={editingEntry.startDate}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, startDate: e.target.value })}
                                    style={{
                                        background: '#FFFFFF',
                                        color: '#0A0A0A',
                                        border: '1.5px solid #E5E5E5',
                                        borderRadius: '8px',
                                        padding: '10px 14px',
                                        fontSize: '14px',
                                        width: '100%',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                                    End Date
                                    <span className="text-blue-600 font-medium normal-case tracking-normal" dir="rtl">ختم کرنے کی تاریخ</span>
                                </label>
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="month"
                                        disabled={editingEntry.current}
                                        value={editingEntry.endDate || ''}
                                        onChange={(e) => setEditingEntry({ ...editingEntry, endDate: e.target.value })}
                                        style={{
                                            background: '#FFFFFF',
                                            color: '#0A0A0A',
                                            border: '1.5px solid #E5E5E5',
                                            borderRadius: '8px',
                                            padding: '10px 14px',
                                            fontSize: '14px',
                                            width: '100%',
                                            outline: 'none',
                                        }}
                                    />
                                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                                        <input
                                            type="checkbox"
                                            checked={editingEntry.current}
                                            onChange={(e) => setEditingEntry({ ...editingEntry, current: e.target.checked, endDate: e.target.checked ? '' : editingEntry.endDate })}
                                            className="w-4 h-4 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">I currently work here</span>
                                    </label>
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                                    Description
                                    <span className="text-blue-600 font-medium normal-case tracking-normal" dir="rtl">تفصیلات</span>
                                </label>
                                <textarea
                                    value={editingEntry.description}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                                    style={{
                                        background: '#FFFFFF',
                                        color: '#0A0A0A',
                                        border: '1.5px solid #E5E5E5',
                                        borderRadius: '8px',
                                        padding: '10px 14px',
                                        fontSize: '14px',
                                        width: '100%',
                                        outline: 'none',
                                        height: '128px',
                                        resize: 'none',
                                    }}
                                    placeholder="What were your key responsibilities and achievements?"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50">
                            <button
                                type="button"
                                onClick={() => { setIsEditing(false); setEditingEntry(null); }}
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
                                        Save Entry
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6">
                        {Array.isArray(experiences) && experiences.length > 0 ? (
                            [...experiences].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')).map((entry) => (
                                <div key={entry.id} className="group relative flex gap-6 bg-slate-50/30 p-6 rounded-3xl border border-slate-100 hover:bg-slate-50 transition-all">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                                        <Briefcase className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">
                                                {entry.title}
                                            </h3>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => handleEdit(entry)} className="p-2 bg-white text-slate-400 hover:text-blue-600 rounded-xl border border-slate-100 shadow-sm transition-all hover:scale-110">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(entry.id)} className="p-2 bg-white text-slate-400 hover:text-red-600 rounded-xl border border-slate-100 shadow-sm transition-all hover:scale-110">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-blue-600 font-bold text-sm uppercase italic tracking-tight">{entry.company}</p>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest pt-1">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {entry.startDate} — {entry.current ? 'Present' : entry.endDate}
                                            </div>
                                            {entry.location && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {entry.location}
                                                </div>
                                            )}
                                        </div>
                                        {entry.description && (
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed pt-3">
                                                {entry.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No work history added yet.</p>
                                <button onClick={handleAdd} className="mt-4 text-blue-600 font-black uppercase tracking-widest text-[10px] hover:underline">Add Your First Role →</button>
                            </div>
                        )}
                    </div>
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
