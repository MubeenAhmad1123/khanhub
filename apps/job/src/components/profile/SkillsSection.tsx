'use client';

import React, { useState } from 'react';
import { Edit2, Check, X, Plus } from 'lucide-react';
import { db } from '@/lib/firebase/firebase-config';
import { doc, updateDoc } from 'firebase/firestore';

interface SkillsSectionProps {
    user: any;
    accentColor: string;
}

export default function SkillsSection({ user, accentColor }: SkillsSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [skills, setSkills] = useState<string[]>(user?.skills || []);
    const [newSkill, setNewSkill] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAddSkill = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSkill.trim() && !skills.includes(newSkill.trim())) {
            setSkills([...skills, newSkill.trim()]);
            setNewSkill('');
        }
    };

    const handleRemoveSkill = (skill: string) => {
        setSkills(skills.filter(s => s !== skill));
    };

    const handleSave = async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            await updateDoc(doc(db, 'users', user.uid), {
                skills: skills
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating skills:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="px-6 py-6 border-b border-[#E5E5E5]" style={{ background: '#FFFFFF' }}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: '#0A0A0A' }}>Skills & Expertise</h3>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="text-[--text-muted] hover:text-white transition-colors">
                        <Edit2 size={14} />
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                    <div
                        key={index}
                        className="group relative flex items-center gap-2 px-4 py-2 bg-[#F8F8F8] border border-[#E5E5E5] rounded-full text-xs font-bold uppercase tracking-widest text-[#444444]"
                        style={{ borderColor: isEditing ? accentColor : '#E5E5E5' }}
                    >
                        {skill}
                        {isEditing && (
                            <button
                                onClick={() => handleRemoveSkill(skill)}
                                className="text-red-500 hover:text-red-400"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {isEditing && (
                <div className="mt-6 space-y-4">
                    <form onSubmit={handleAddSkill} className="flex gap-2">
                        <input
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            placeholder="Add a skill (e.g. React, UI Design...)"
                            style={{
                                background: '#FFFFFF',
                                color: '#0A0A0A',
                                border: '1.5px solid #E5E5E5',
                                borderRadius: '8px',
                                padding: '10px 14px',
                                fontSize: '14px',
                                flex: 1,
                                outline: 'none',
                            }}
                        />
                        <button
                            type="submit"
                            className="w-10 h-10 flex items-center justify-center bg-[#0A0A0A] text-white rounded-xl hover:bg-[#333333]"
                        >
                            <Plus size={20} />
                        </button>
                    </form>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => {
                                setSkills(user?.skills || []);
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

            {!isEditing && skills.length === 0 && (
                <p className="text-sm text-[--text-muted] font-medium">No skills added yet.</p>
            )}
        </section>
    );
}
