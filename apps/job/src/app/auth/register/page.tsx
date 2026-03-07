'use client';

import React, { useState } from 'react';
import { auth, db } from '@/lib/firebase/firebase-config';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function RegisterPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleGoogleRegister = async () => {
        try {
            setLoading(true);
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user exists in Firestore
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                // New user - create profile with guest prefs
                const guestPrefs = JSON.parse(localStorage.getItem('jobreel_guest_prefs') || '{}');
                await setDoc(userRef, {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    category: guestPrefs.category || 'jobs',
                    role: guestPrefs.role || 'provider',
                    createdAt: serverTimestamp(),
                    savedVideos: [],
                    bio: '',
                    skills: [],
                    experience: [],
                    education: [],
                });

                if (guestPrefs.category) {
                    localStorage.setItem('jobreel_active_category', guestPrefs.category);
                }
            } else {
                // Already registered, just update local storage and redirect
                const data = userDoc.data();
                if (data.category) {
                    localStorage.setItem('jobreel_active_category', data.category);
                }
            }

            localStorage.removeItem('jobreel_videos_watched');
            localStorage.setItem('jobreel_registered', 'true');

            router.push('/feed');
        } catch (error) {
            console.error('Registration error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] flex flex-col items-center justify-center px-6 font-sans">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FF0069] rounded-full blur-[150px] opacity-10 pointer-events-none" />

            <div className="w-full max-w-sm text-center relative z-10 bg-[#F8F8F8] p-8 rounded-2xl border border-[#E5E5E5]">
                <Link href="/" className="inline-block mb-12">
                    <span className="font-syne font-black text-3xl tracking-tighter italic">
                        <span className="text-[#FF0069]">JOB</span><span className="text-[#0A0A0A]">REEL</span>
                    </span>
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <h1 className="text-4xl font-syne font-bold mb-3 tracking-tight text-[#0A0A0A]">Join JobReel</h1>
                    <p className="text-[#666666] font-medium tracking-wide">Free forever. No credit card.</p>
                </motion.div>

                <div className="space-y-6">
                    <button
                        onClick={handleGoogleRegister}
                        disabled={loading}
                        className="w-full py-4 bg-white text-[#0A0A0A] border border-[#E5E5E5] font-black font-syne uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-3 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {loading ? 'Creating account...' : 'Continue with Google'}
                    </button>

                    <div className="text-[10px] text-[#666666] leading-relaxed uppercase tracking-widest px-8">
                        By continuing you agree to our<br />
                        <Link href="/terms" className="text-[#0A0A0A] hover:underline">Terms of Service</Link> & <Link href="/privacy" className="text-[#0A0A0A] hover:underline">Privacy Policy</Link>
                    </div>

                    <div className="flex items-center gap-4 py-2">
                        <div className="flex-1 h-[1px] bg-[#E5E5E5]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#AAAAAA]">or</span>
                        <div className="flex-1 h-[1px] bg-[#E5E5E5]" />
                    </div>

                    <div className="space-y-4">
                        <div className="text-sm text-[#666666]">
                            Already have an account?
                        </div>
                        <Link
                            href="/auth/login"
                            className="inline-block font-syne font-bold text-[#FF0069] tracking-widest text-sm uppercase hover:underline underline-offset-8"
                        >
                            Sign In →
                        </Link>
                    </div>
                </div>

                <div className="mt-20">
                    <Link
                        href="/"
                        className="text-[10px] font-black uppercase tracking-[0.4em] text-[#888888] hover:text-[#0A0A0A] transition-colors"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;700&display=swap');
                
                body {
                    background: #FFFFFF;
                    font-family: 'DM Sans', sans-serif;
                }
                .font-syne {
                    font-family: 'Syne', sans-serif;
                }
            `}</style>
        </div>
    );
}
