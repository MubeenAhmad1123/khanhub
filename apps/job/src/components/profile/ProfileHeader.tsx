'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { LogOut, Edit2, Check, X, Camera } from 'lucide-react';
import { auth, db } from '@/lib/firebase/firebase-config';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface ProfileHeaderProps {
    user: any;
    accentColor: string;
}

export default function ProfileHeader({ user, accentColor }: ProfileHeaderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSave = async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            await updateDoc(doc(db, 'users', user.uid), {
                name: name
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating name:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await auth.signOut();
        router.push('/');
    };

    return (
        <div className="px-6 pt-12 pb-8">
            <div className="flex items-start gap-6 mb-8">
                {/* Avatar */}
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#1A1A1A] p-1">
                        <Image
                            src={user?.photoURL || '/default-avatar.svg'}
                            alt={user?.name || 'User avatar'}
                            width={96}
                            height={96}
                            className="w-full h-full rounded-full object-cover"
                        />
                    </div>
                </div>

                {/* Info & Stats */}
                <div className="flex-1 pt-1">
                    <div className="flex items-center gap-3 mb-1">
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-[#141414] border border-[#1A1A1A] rounded px-2 py-1 text-lg font-bold outline-none focus:border-white"
                                    autoFocus
                                />
                                <button onClick={handleSave} disabled={loading} className="text-green-500 hover:scale-110 transition-transform">
                                    <Check size={20} />
                                </button>
                                <button onClick={() => setIsEditing(false)} className="text-red-500 hover:scale-110 transition-transform">
                                    <X size={20} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-2xl font-black font-poppins tracking-tighter">{user?.name}</h2>
                                <button onClick={() => setIsEditing(true)} className="text-[--text-muted] hover:text-white transition-colors">
                                    <Edit2 size={16} />
                                </button>
                            </>
                        )}
                    </div>
                    <p className="text-[--text-muted] text-sm mb-4">@{user?.email?.split('@')[0]}</p>

                    <div className="flex gap-6">
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-lg">0</span>
                            <span className="text-[--text-muted] text-xs uppercase tracking-widest font-bold">Following</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-lg">0</span>
                            <span className="text-[--text-muted] text-xs uppercase tracking-widest font-bold">Followers</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-lg">0</span>
                            <span className="text-[--text-muted] text-xs uppercase tracking-widest font-bold">Likes</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={handleLogout}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#141414] border border-[#1A1A1A] rounded-xl text-sm font-bold hover:bg-[#1A1A1A] transition-all"
                >
                    <LogOut size={16} />
                    Logout
                </button>
                <div
                    className="w-12 h-12 flex items-center justify-center bg-[#141414] border border-[#1A1A1A] rounded-xl hover:text-white transition-colors cursor-pointer"
                    title="Change Theme"
                >
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: accentColor }} />
                </div>
            </div>
        </div>
    );
}
