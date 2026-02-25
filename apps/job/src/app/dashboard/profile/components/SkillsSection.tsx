'use client';

import React, { useState, useEffect } from 'react';
import { Target, X, Plus, Save, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobSeekerProfile } from '@/types/user';

interface SkillsSectionProps {
    profile: JobSeekerProfile;
    onSave: (data: Partial<JobSeekerProfile>) => Promise<void>;
}

export default function SkillsSection({ profile, onSave }: SkillsSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [skills, setSkills] = useState<string[]>((profile as any).skills || (profile as any).profile?.skills || []);
    const [newSkill, setNewSkill] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        setSkills((profile as any).skills || (profile as any).profile?.skills || []);
    }, [profile]);

    const handleAddSkill = (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = newSkill.trim();
        if (trimmed && !skills.includes(trimmed)) {
            setSkills([...skills, trimmed]);
            setNewSkill('');
        }
    };

    const handleRemoveSkill = (skillToRemove: string) => {
        setSkills(skills.filter(s => s !== skillToRemove));
    };

    const handleSubmit = async () => {
        setSaveStatus('saving');
        try {
            await onSave({ skills });
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
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Target className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">Skills & Expertise</h2>
                    </div>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-6 py-2 bg-slate-50 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                        >
                            Edit Skills
                        </button>
                    )}
                </div>

                {!isEditing ? (
                    <div className="flex flex-wrap gap-2">
                        {skills.length > 0 ? (
                            skills.map((skill, idx) => (
                                <span
                                    key={idx}
                                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-100 shadow-sm"
                                >
                                    {skill}
                                </span>
                            ))
                        ) : (
                            <p className="text-slate-400 italic text-sm font-medium">No skills added yet. Add skills to help employers find you.</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        <form onSubmit={handleAddSkill} className="flex gap-3">
                            <input
                                type="text"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                className="flex-1 px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-bold"
                                placeholder="Add a skill (e.g. React, UI Design, Marketing)"
                            />
                            <button
                                type="submit"
                                className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </form>

                        <div className="flex flex-wrap gap-2 min-h-[100px] p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                            {skills.map((skill, idx) => (
                                <div
                                    key={idx}
                                    className="px-4 py-2 bg-white text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-200 flex items-center gap-2 group hover:border-blue-300 transition-all"
                                >
                                    {skill}
                                    <button
                                        onClick={() => handleRemoveSkill(skill)}
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => { setIsEditing(false); setSkills((profile as any).skills || (profile as any).profile?.skills || []); }}
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
                                        Save Skills
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
