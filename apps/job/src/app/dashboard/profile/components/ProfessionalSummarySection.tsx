'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Edit3, Save, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobSeekerProfile } from '@/types/user';

interface ProfessionalSummarySectionProps {
    profile: JobSeekerProfile;
    onSave: (data: Partial<JobSeekerProfile>) => Promise<void>;
}

export default function ProfessionalSummarySection({ profile, onSave }: ProfessionalSummarySectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [bio, setBio] = useState(profile.bio || '');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        setBio(profile.bio || '');
    }, [profile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveStatus('saving');
        try {
            await onSave({ bio });
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
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">Professional Summary</h2>
                    </div>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
                    >
                        <Edit3 className="w-5 h-5" />
                    </button>
                </div>

                {!isEditing ? (
                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-50 italic text-slate-600 font-medium leading-relaxed">
                        {profile.bio ? (
                            `"${profile.bio}"`
                        ) : (
                            <p className="text-slate-400 not-italic">
                                Introduce yourself to potential employers. Highlight your key strengths, career goals, and what makes you unique.
                            </p>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full h-40 px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-medium text-slate-700 resize-none"
                            placeholder="Write a compelling summary of your professional journey..."
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saveStatus === 'saving'}
                                className="bg-blue-600 text-white px-8 py-2 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
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
