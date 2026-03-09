'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebase-config';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { GoogleSignInButton } from '@/components/ui/GoogleSignInButton';

interface GuestWallProps {
    isVisible: boolean;
    onContinue: () => void;
}

export function GuestWall({ isVisible, onContinue }: GuestWallProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Round 0: user just hit 3 videos for the first time → show bypass button
    // Round 1: user has already used the bypass → show ONLY Google sign-in, no bypass
    const guestRound = parseInt(
        typeof window !== 'undefined' ? localStorage.getItem('jobreel_guest_round') || '0' : '0'
    );
    const isHardWall = guestRound >= 1;

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const guestPrefs = JSON.parse(localStorage.getItem('jobreel_guest_prefs') || '{}');
            const sessionId = localStorage.getItem('jobreel_session_id');

            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    category: guestPrefs.category || 'jobs',
                    role: guestPrefs.role || 'provider',
                    city: '',
                    phone: '',
                    createdAt: serverTimestamp(),
                    videosWatched: 0,
                    savedVideos: [],
                    profileComplete: false,
                });
            }

            // Clear guest counters
            localStorage.removeItem('jobreel_videos_watched');
            localStorage.removeItem('jobreel_guest_round');
            localStorage.setItem('jobreel_registered', 'true');

            if (sessionId) {
                await updateDoc(doc(db, 'guest_sessions', sessionId), {
                    converted: true,
                    convertedAt: serverTimestamp(),
                    uid: user.uid,
                }).catch(() => { });
            }

            onContinue();
            router.push('/feed');
        } catch (error) {
            console.error('Google sign-in error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center px-8 text-center text-[#0A0A0A]"
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[--accent] rounded-full blur-[120px] opacity-20 pointer-events-none" />

                    <div className="w-24 h-24 rounded-3xl bg-[--bg-card] border border-[--border] flex items-center justify-center mb-8 relative">
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 4 }}
                        >
                            <UserPlus className="w-12 h-12 text-[--accent]" />
                        </motion.div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[--accent] shadow-[0_0_10px_var(--accent-glow)]" />
                    </div>

                    <h2 className="text-3xl font-bold font-poppins mb-3">
                        {isHardWall ? "That's your limit!" : "You've seen 3 reels"}
                    </h2>
                    <p className="text-[--text-muted] mb-12 max-w-xs leading-relaxed text-sm">
                        {isHardWall
                            ? '🔒 Register free to keep watching and connect with people in your industry.'
                            : '🎬 Register free to keep watching and connect with people in your industry.'}
                    </p>

                    <div className="w-full max-w-xs">
                        <GoogleSignInButton onClick={handleGoogleSignIn} loading={loading} />
                    </div>

                    {/* Only show bypass on first wall (round 0) */}
                    {!isHardWall && (
                        <button
                            onClick={onContinue}
                            className="mt-12 text-[#666666] hover:text-[#0A0A0A] text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
                        >
                            ✕ Watch 3 more as guest
                        </button>
                    )}

                    <div className="absolute bottom-12 text-[10px] text-[--text-muted] uppercase tracking-[0.3em] font-black italic">
                        <span className="text-[--accent]">JOB</span>REEL
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
