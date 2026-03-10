'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Languages, Plus, Trash2, Save, Loader2, Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobSeekerProfile, Language } from '@/types/user';

interface LanguagesSectionProps {
    profile: JobSeekerProfile;
    onSave: (data: Partial<JobSeekerProfile>) => Promise<void>;
}

export default function LanguagesSection({ profile, onSave }: LanguagesSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const getNormalizedLanguages = useCallback(() => {
        const rawLangs = (profile as any).languages || (profile as any).profile?.languages;
        return Array.isArray(rawLangs) ? rawLangs : (typeof rawLangs === 'object' && rawLangs !== null ? Object.values(rawLangs) as Language[] : []);
    }, [profile]);

    const [languages, setLanguages] = useState<Language[]>(getNormalizedLanguages());
    const [newLang, setNewLang] = useState<{ name: string, proficiency: Language['proficiency'] }>({
        name: '',
        proficiency: 'Intermediate'
    });
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        setLanguages(getNormalizedLanguages());
    }, [getNormalizedLanguages]);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newLang.name.trim();
        if (trimmed && !languages.find(l => l.name.toLowerCase() === trimmed.toLowerCase())) {
            const entry: Language = {
                id: Math.random().toString(36).substr(2, 9),
                name: trimmed,
                proficiency: newLang.proficiency
            };
            setLanguages([...languages, entry]);
            setNewLang({ name: '', proficiency: 'Intermediate' });
        }
    };

    const handleRemove = (id: string) => {
        setLanguages(languages.filter(l => l.id !== id));
    };

    const handleSubmit = async () => {
        setSaveStatus('saving');
        try {
            await onSave({ languages });
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
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Languages className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase flex flex-col">
                            Languages
                            <span className="text-blue-600 text-sm normal-case mt-1" dir="rtl">زبانیں</span>
                        </h2>
                    </div>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-6 py-2 bg-slate-50 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                        >
                            Edit Languages
                        </button>
                    )}
                </div>

                {!isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {languages.length > 0 ? (
                            languages.map((lang) => (
                                <div key={lang.id} className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm">
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{lang.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lang.proficiency}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-400 italic text-sm font-medium">No languages added yet.</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-1">
                                <input
                                    type="text"
                                    value={newLang.name}
                                    onChange={(e) => setNewLang({ ...newLang, name: e.target.value })}
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
                                    placeholder="زبان (Language)"
                                />
                            </div>
                            <div className="sm:col-span-1">
                                <select
                                    value={newLang.proficiency}
                                    onChange={(e) => setNewLang({ ...newLang, proficiency: e.target.value as any })}
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
                                >
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Fluent">Fluent</option>
                                    <option value="Native">Native</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="sm:col-span-1 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Add
                            </button>
                        </form>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                            {languages.map((lang) => (
                                <div key={lang.id} className="group flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{lang.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lang.proficiency}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(lang.id)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => { setIsEditing(false); setLanguages(getNormalizedLanguages()); }}
                                className="px-6 py-2 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saveStatus === 'saving'}
                                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                            >
                                {saveStatus === 'saving' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save
                                    </>
                                )}
                            </button>
                        </div>
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
