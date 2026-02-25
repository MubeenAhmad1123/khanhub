'use client';

import React, { useState, useEffect } from 'react';
import { GraduationCap, Plus, Edit2, Trash2, Save, Loader2, Check, Calendar, MapPin, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobSeekerProfile, Education } from '@/types/user';

interface EducationSectionProps {
    profile: JobSeekerProfile;
    onSave: (data: Partial<JobSeekerProfile>) => Promise<void>;
}

export default function EducationSection({ profile, onSave }: EducationSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editingEntry, setEditingEntry] = useState<Partial<Education> | null>(null);
    const [educationList, setEducationList] = useState<Education[]>((profile as any).education || (profile as any).profile?.education || []);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        setEducationList((profile as any).education || (profile as any).profile?.education || []);
    }, [profile]);

    const handleAdd = () => {
        setEditingEntry({
            id: Math.random().toString(36).substr(2, 9),
            degree: '',
            degreeLevel: 'bachelors',
            institution: '',
            location: '',
            fieldOfStudy: '',
            startYear: '',
            endYear: '',
            current: false,
            grade: '',
            description: '',
        });
        setIsEditing(true);
    };

    const handleEdit = (entry: Education) => {
        setEditingEntry(entry);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this education entry?')) return;
        const updated = educationList.filter(e => e.id !== id);
        setSaveStatus('saving');
        try {
            await onSave({ education: updated });
            setEducationList(updated);
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
        let updated: Education[];
        const existingIndex = educationList.findIndex(edu => edu.id === editingEntry.id);

        if (existingIndex > -1) {
            updated = [...educationList];
            updated[existingIndex] = editingEntry as Education;
        } else {
            updated = [...educationList, editingEntry as Education];
        }

        try {
            await onSave({ education: updated });
            setEducationList(updated);
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
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">Education</h2>
                    </div>
                    {!isEditing && (
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            Add Education
                        </button>
                    )}
                </div>

                {isEditing && editingEntry ? (
                    <form onSubmit={handleSubmit} className="space-y-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 animate-in fade-in slide-in-from-top-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Degree Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editingEntry.degree}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, degree: e.target.value })}
                                    className="w-full px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all font-bold"
                                    placeholder="e.g. BS in Computer Science"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution</label>
                                <input
                                    type="text"
                                    required
                                    value={editingEntry.institution}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, institution: e.target.value })}
                                    className="w-full px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all font-bold"
                                    placeholder="e.g. Stanford University"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Field of Study</label>
                                <input
                                    type="text"
                                    value={editingEntry.fieldOfStudy}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, fieldOfStudy: e.target.value })}
                                    className="w-full px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all font-bold"
                                    placeholder="e.g. Software Engineering"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Degree Level</label>
                                <select
                                    value={editingEntry.degreeLevel}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, degreeLevel: e.target.value as any })}
                                    className="w-full px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all font-bold"
                                >
                                    <option value="high_school">High School</option>
                                    <option value="bachelors">Bachelors</option>
                                    <option value="masters">Masters</option>
                                    <option value="phd">PhD</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Year</label>
                                <input
                                    type="text"
                                    required
                                    value={editingEntry.startYear}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, startYear: e.target.value })}
                                    className="w-full px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all font-bold"
                                    placeholder="YYYY"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Year (or Expected)</label>
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="text"
                                        disabled={editingEntry.current}
                                        value={editingEntry.endYear || ''}
                                        onChange={(e) => setEditingEntry({ ...editingEntry, endYear: e.target.value })}
                                        className="w-full px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all font-bold disabled:opacity-50"
                                        placeholder="YYYY"
                                    />
                                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                                        <input
                                            type="checkbox"
                                            checked={editingEntry.current}
                                            onChange={(e) => setEditingEntry({ ...editingEntry, current: e.target.checked, endYear: e.target.checked ? '' : editingEntry.endYear })}
                                            className="w-4 h-4 rounded-lg border-2 border-slate-200 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">I'm currently studying here</span>
                                    </label>
                                </div>
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
                                className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                            >
                                {saveStatus === 'saving' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Education
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6">
                        {Array.isArray(educationList) && educationList.length > 0 ? (
                            [...educationList].sort((a, b) => (b.startYear || '').localeCompare(a.startYear || '')).map((entry) => (
                                <div key={entry.id} className="group relative flex gap-6 bg-slate-50/30 p-6 rounded-3xl border border-slate-100 hover:bg-slate-50 transition-all">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                                        <GraduationCap className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">
                                                {entry.degree}
                                            </h3>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => handleEdit(entry)} className="p-2 bg-white text-slate-400 hover:text-emerald-600 rounded-xl border border-slate-100 shadow-sm transition-all hover:scale-110">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(entry.id)} className="p-2 bg-white text-slate-400 hover:text-red-600 rounded-xl border border-slate-100 shadow-sm transition-all hover:scale-110">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-emerald-600 font-bold text-sm uppercase italic tracking-tight">{entry.institution}</p>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest pt-1">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {entry.startYear} — {entry.current ? 'Present' : entry.endYear}
                                            </div>
                                            {entry.fieldOfStudy && (
                                                <div className="flex items-center gap-1 text-slate-500">
                                                    <BookOpen className="w-3 h-3" />
                                                    {entry.fieldOfStudy}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No education details added yet.</p>
                                <button onClick={handleAdd} className="mt-4 text-emerald-600 font-black uppercase tracking-widest text-[10px] hover:underline">Add Your Education →</button>
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
