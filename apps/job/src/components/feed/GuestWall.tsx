'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, UserPlus, LogIn, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebase-config';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface GuestWallProps {
    isVisible: boolean;
    onContinue: () => void;
}

export function GuestWall({ isVisible, onContinue }: GuestWallProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // 2. Read stored guest prefs
            const guestPrefs = JSON.parse(localStorage.getItem('jobreel_guest_prefs') || '{}');
            const sessionId = localStorage.getItem('jobreel_session_id');

            // 3. Check if user already exists in Firestore
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                // 4. Create new user document (One-Time)
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

            // 5. Clear guest wall counter
            localStorage.removeItem('jobreel_videos_watched');

            // 6. Update guest session if exists
            if (sessionId) {
                await updateDoc(doc(db, 'guest_sessions', sessionId), {
                    converted: true,
                    convertedAt: serverTimestamp(),
                    uid: user.uid,
                });
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
                    className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center px-8 text-center"
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

                    <h2 className="text-3xl font-bold font-syne mb-3">You've seen 3 reels</h2>
                    <p className="text-[--text-muted] mb-12 max-w-xs leading-relaxed text-sm">
                        🎬 Register free to keep watching and connect with people in your industry.
                    </p>

                    <div className="w-full max-w-xs space-y-4">
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full py-4 bg-white text-black font-black font-syne uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_32px_rgba(255,255,255,0.1)] active:scale-95 transition-all disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            {loading ? 'Connecting...' : 'Continue with Google'}
                        </button>
                    </div>

                    <button
                        onClick={onContinue}
                        className="mt-12 text-[--text-muted] hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
                    >
                        ✕ Watch 3 more as guest
                    </button>

                    <div className="absolute bottom-12 text-[10px] text-[--text-muted] uppercase tracking-[0.3em] font-black italic">
                        <span className="text-[--accent]">JOB</span>REEL
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
