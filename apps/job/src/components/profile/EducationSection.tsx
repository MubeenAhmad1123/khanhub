'use client';

import React, { useState } from 'react';
import { Edit2, Plus, X, GraduationCap } from 'lucide-react';
import { db } from '@/lib/firebase/firebase-config';
import { doc, updateDoc } from 'firebase/firestore';

interface EducationSectionProps {
    user: any;
    accentColor: string;
}

export default function EducationSection({ user, accentColor }: EducationSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [education, setEducation] = useState<any[]>(user?.education || []);
    const [loading, setLoading] = useState(false);

    const handleAdd = () => {
        setEducation([...education, { school: '', degree: '', year: '' }]);
    };

    const handleRemove = (index: number) => {
        setEducation(education.filter((_, i) => i !== index));
    };

    const handleChange = (index: number, field: string, value: string) => {
        const updated = [...education];
        updated[index] = { ...updated[index], [field]: value };
        setEducation(updated);
    };

    const handleSave = async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            await updateDoc(doc(db, 'users', user.uid), {
                education: education
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating education:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="px-6 py-6 border-b border-[#1A1A1A]">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[--text-muted]">Education</h3>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="text-[--text-muted] hover:text-white transition-colors">
                        <Edit2 size={14} />
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {education.map((edu, index) => (
                    <div key={index} className="flex gap-4 group">
                        <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-[#141414] border border-[#1A1A1A] rounded-xl text-[--text-muted] group-hover:text-white transition-colors">
                            <GraduationCap size={20} />
                        </div>
                        <div className="flex-1">
                            {isEditing ? (
                                <div className="space-y-2 relative">
                                    <button
                                        onClick={() => handleRemove(index)}
                                        className="absolute -right-2 -top-2 text-red-500 hover:scale-110 transition-transform p-1"
                                    >
                                        <X size={14} />
                                    </button>
                                    <input
                                        value={edu.degree}
                                        onChange={(e) => handleChange(index, 'degree', e.target.value)}
                                        placeholder="Degree (e.g. BS Computer Science)"
                                        className="w-full bg-[#141414] border border-[#1A1A1A] rounded px-2 py-1 text-sm font-bold outline-none focus:border-white"
                                    />
                                    <input
                                        value={edu.school}
                                        onChange={(e) => handleChange(index, 'school', e.target.value)}
                                        placeholder="School/University Name"
                                        className="w-full bg-[#141414] border border-[#1A1A1A] rounded px-2 py-1 text-xs outline-none focus:border-white"
                                    />
                                    <input
                                        value={edu.year}
                                        onChange={(e) => handleChange(index, 'year', e.target.value)}
                                        placeholder="Year (e.g. 2016 - 2020)"
                                        className="w-full bg-[#141414] border border-[#1A1A1A] rounded px-2 py-1 text-[10px] text-[--text-muted] outline-none focus:border-white uppercase tracking-widest"
                                    />
                                </div>
                            ) : (
                                <>
                                    <h4 className="font-bold text-sm text-white mb-0.5">{edu.degree || 'Degree'}</h4>
                                    <p className="text-xs font-medium text-[--text-muted] mb-1">{edu.school || 'University'}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#666]">{edu.year || 'Year'}</p>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isEditing && (
                <div className="mt-8 space-y-4">
                    <button
                        onClick={handleAdd}
                        className="w-full py-4 border border-dashed border-[#1A1A1A] rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-[--text-muted] hover:text-white hover:border-white transition-all"
                    >
                        <Plus size={14} />
                        Add Education
                    </button>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => {
                                setEducation(user?.education || []);
                                setIsEditing(false);
                            }}
                            className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-[--text-muted] hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-6 py-2 bg-white text-black text-xs font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            )}

            {!isEditing && education.length === 0 && (
                <p className="text-sm text-[--text-muted] font-medium">No education added yet.</p>
            )}
        </section>
    );
}
