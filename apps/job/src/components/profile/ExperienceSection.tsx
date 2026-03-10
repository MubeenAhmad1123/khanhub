'use client';

import React, { useState } from 'react';
import { Edit2, Plus, X, Briefcase } from 'lucide-react';
import { db } from '@/lib/firebase/firebase-config';
import { doc, updateDoc } from 'firebase/firestore';

interface ExperienceSectionProps {
    user: any;
    accentColor: string;
}

export default function ExperienceSection({ user, accentColor }: ExperienceSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [experience, setExperience] = useState<any[]>(user?.experience || []);
    const [loading, setLoading] = useState(false);

    const handleAdd = () => {
        setExperience([...experience, { company: '', role: '', period: '' }]);
    };

    const handleRemove = (index: number) => {
        setExperience(experience.filter((_, i) => i !== index));
    };

    const handleChange = (index: number, field: string, value: string) => {
        const updated = [...experience];
        updated[index] = { ...updated[index], [field]: value };
        setExperience(updated);
    };

    const handleSave = async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            await updateDoc(doc(db, 'users', user.uid), {
                experience: experience
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating experience:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="px-6 py-6 border-b border-[#E5E5E5]" style={{ background: '#FFFFFF' }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: '#0A0A0A' }}>Experience</h3>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="text-[--text-muted] hover:text-white transition-colors">
                        <Edit2 size={14} />
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {experience.map((exp, index) => (
                    <div key={index} className="flex gap-4 group">
                        <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-[#F8F8F8] border border-[#E5E5E5] rounded-xl text-[#888888] group-hover:text-[#0A0A0A] transition-colors">
                            <Briefcase size={20} />
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
                                        value={exp.role}
                                        onChange={(e) => handleChange(index, 'role', e.target.value)}
                                        placeholder="Job Title (e.g. Software Engineer)"
                                        style={{
                                            background: '#FFFFFF',
                                            color: '#0A0A0A',
                                            border: '1.5px solid #E5E5E5',
                                            borderRadius: '8px',
                                            padding: '10px 14px',
                                            fontSize: '14px',
                                            width: '100%',
                                            outline: 'none',
                                            marginBottom: '8px'
                                        }}
                                    />
                                    <input
                                        value={exp.company}
                                        onChange={(e) => handleChange(index, 'company', e.target.value)}
                                        placeholder="Company Name"
                                        style={{
                                            background: '#FFFFFF',
                                            color: '#0A0A0A',
                                            border: '1.5px solid #E5E5E5',
                                            borderRadius: '8px',
                                            padding: '10px 14px',
                                            fontSize: '12px',
                                            width: '100%',
                                            outline: 'none',
                                            marginBottom: '8px'
                                        }}
                                    />
                                    <input
                                        value={exp.period}
                                        onChange={(e) => handleChange(index, 'period', e.target.value)}
                                        placeholder="Period (e.g. 2020 - Present)"
                                        style={{
                                            background: '#FFFFFF',
                                            color: '#0A0A0A',
                                            border: '1.5px solid #E5E5E5',
                                            borderRadius: '8px',
                                            padding: '10px 14px',
                                            fontSize: '10px',
                                            width: '100%',
                                            outline: 'none',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.1em'
                                        }}
                                    />
                                </div>
                            ) : (
                                <>
                                    <h4 className="font-bold text-sm text-[#0A0A0A] mb-0.5">{exp.role || 'Title'}</h4>
                                    <p className="text-xs font-medium text-[#666666] mb-1">{exp.company || 'Company'}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#999999]">{exp.period || 'Period'}</p>
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
                        className="w-full py-4 border border-dashed border-[#E5E5E5] rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-[#888888] hover:text-[#0A0A0A] hover:border-[#0A0A0A] transition-all"
                    >
                        <Plus size={14} />
                        Add Experience
                    </button>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => {
                                setExperience(user?.experience || []);
                                setIsEditing(false);
                            }}
                            className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-[--text-muted] hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-6 py-2 bg-[#0A0A0A] text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-[#333333] transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            )}

            {!isEditing && experience.length === 0 && (
                <p className="text-sm text-[--text-muted] font-medium">No experience added yet.</p>
            )}
        </section>
    );
}
