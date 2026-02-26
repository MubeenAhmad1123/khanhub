'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Rocket, Plus, Edit2, Trash2, Save, Loader2, Check, ExternalLink, Calendar, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobSeekerProfile, Project } from '@/types/user';

interface ProjectsSectionProps {
    profile: JobSeekerProfile;
    onSave: (data: Partial<JobSeekerProfile>) => Promise<void>;
    isEmployer?: boolean;
}

export default function ProjectsSection({ profile, onSave, isEmployer }: ProjectsSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editingEntry, setEditingEntry] = useState<Partial<Project> | null>(null);
    const getNormalizedProjects = useCallback(() => {
        const rawProjects = (profile as any).projects || (profile as any).profile?.projects;
        return Array.isArray(rawProjects) ? rawProjects : (typeof rawProjects === 'object' && rawProjects !== null ? Object.values(rawProjects) as Project[] : []);
    }, [profile]);

    const [projects, setProjects] = useState<Project[]>(getNormalizedProjects());
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        setProjects(getNormalizedProjects());
    }, [getNormalizedProjects]);

    const handleAdd = () => {
        setEditingEntry({
            id: Math.random().toString(36).substr(2, 9),
            title: '',
            description: '',
            url: '',
            startDate: '',
            endDate: '',
            current: false,
        });
        setIsEditing(true);
    };

    const handleEdit = (entry: Project) => {
        setEditingEntry(entry);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this project?')) return;
        const updated = projects.filter(p => p.id !== id);
        setSaveStatus('saving');
        try {
            await onSave({ projects: updated });
            setProjects(updated);
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
        let updated: Project[];
        const existingIndex = projects.findIndex(p => p.id === editingEntry.id);

        if (existingIndex > -1) {
            updated = [...projects];
            updated[existingIndex] = editingEntry as Project;
        } else {
            updated = [...projects, editingEntry as Project];
        }

        try {
            await onSave({ projects: updated });
            setProjects(updated);
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
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                            <Rocket className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">{isEmployer ? 'Portfolio & Case Studies' : 'Projects & Portfolio'}</h2>
                    </div>
                    {!isEditing && (
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            Add Project
                        </button>
                    )}
                </div>

                {isEditing && editingEntry ? (
                    <form onSubmit={handleSubmit} className="space-y-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 animate-in fade-in slide-in-from-top-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Title</label>
                                <input
                                    type="text"
                                    required
                                    value={editingEntry.title}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, title: e.target.value })}
                                    className="w-full px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-orange-500 focus:outline-none transition-all font-bold"
                                    placeholder="e.g. KhanHub Landing Page"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project URL (Optional)</label>
                                <input
                                    type="url"
                                    value={editingEntry.url}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, url: e.target.value })}
                                    className="w-full px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-orange-500 focus:outline-none transition-all font-bold"
                                    placeholder="https://github.com/..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                                <input
                                    type="month"
                                    value={editingEntry.startDate}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, startDate: e.target.value })}
                                    className="w-full px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-orange-500 focus:outline-none transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="month"
                                        disabled={editingEntry.current}
                                        value={editingEntry.endDate || ''}
                                        onChange={(e) => setEditingEntry({ ...editingEntry, endDate: e.target.value })}
                                        className="w-full px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-orange-500 focus:outline-none transition-all font-bold disabled:opacity-50"
                                    />
                                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                                        <input
                                            type="checkbox"
                                            checked={editingEntry.current}
                                            onChange={(e) => setEditingEntry({ ...editingEntry, current: e.target.checked, endDate: e.target.checked ? '' : editingEntry.endDate })}
                                            className="w-4 h-4 rounded-lg border-2 border-slate-200 text-orange-600 focus:ring-orange-500"
                                        />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">I'm currently working on this</span>
                                    </label>
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Short Description</label>
                                <textarea
                                    required
                                    value={editingEntry.description}
                                    onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                                    className="w-full h-32 px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-orange-500 focus:outline-none transition-all font-medium resize-none"
                                    placeholder="What did you build and which technologies did you use?"
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
                                className="bg-orange-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
                            >
                                {saveStatus === 'saving' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Project
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {projects.length > 0 ? (
                            projects.map((entry) => (
                                <div key={entry.id} className="group relative bg-slate-50/30 p-6 rounded-3xl border border-slate-100 hover:bg-slate-50 transition-all flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100 shrink-0">
                                            <Code className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => handleEdit(entry)} className="p-2 bg-white text-slate-400 hover:text-orange-600 rounded-lg border border-slate-100 shadow-sm transition-all hover:scale-110">
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => handleDelete(entry.id)} className="p-2 bg-white text-slate-400 hover:text-red-600 rounded-lg border border-slate-100 shadow-sm transition-all hover:scale-110">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">
                                            {entry.title}
                                        </h3>
                                        {entry.url && (
                                            <a href={entry.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-orange-600 font-bold text-xs uppercase hover:underline">
                                                View Project <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed pt-1 line-clamp-3">
                                            {entry.description}
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <Calendar className="w-3 h-3" />
                                        {entry.startDate} — {entry.current ? 'Ongoing' : entry.endDate}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="md:col-span-2 text-center py-10 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                <Rocket className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Showcase your best work.</p>
                                <button onClick={handleAdd} className="mt-4 text-orange-600 font-black uppercase tracking-widest text-[10px] hover:underline">Add Your First Project →</button>
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
