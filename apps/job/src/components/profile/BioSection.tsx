'use client';

import React, { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { db } from '@/lib/firebase/firebase-config';
import { doc, updateDoc } from 'firebase/firestore';

interface BioSectionProps {
    user: any;
}

export default function BioSection({ user }: BioSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [bio, setBio] = useState(user?.bio || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            await updateDoc(doc(db, 'users', user.uid), {
                bio: bio
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating bio:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="px-6 py-6 border-b border-[#1A1A1A]">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[--text-muted]">About Me</h3>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="text-[--text-muted] hover:text-white transition-colors">
                        <Edit2 size={14} />
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-3">
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        className="w-full bg-[#141414] border border-[#1A1A1A] rounded-xl p-4 text-sm font-medium outline-none focus:border-white min-h-[100px] resize-none"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsEditing(false)}
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
            ) : (
                <p className="text-sm text-gray-300 leading-relaxed font-medium">
                    {user?.bio || 'No bio yet. Tap edit to add one.'}
                </p>
            )}
        </section>
    );
}
