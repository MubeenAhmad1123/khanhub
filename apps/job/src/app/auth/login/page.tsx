'use client';

import React, { useState } from 'react';
import { auth, db } from '@/lib/firebase/firebase-config';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GoogleSignInButton } from '@/components/ui/GoogleSignInButton';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);

            const provider = new GoogleAuthProvider();
            // Add this so Google always shows account picker — important for multi-account users
            provider.setCustomParameters({ prompt: 'select_account' });

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
                // Restore category from Firestore
                const data = userDoc.data();
                if (data.category) {
                    localStorage.setItem('jobreel_active_category', data.category);
                }
            }

            localStorage.removeItem('jobreel_videos_watched');
            localStorage.setItem('jobreel_registered', 'true');
            sessionStorage.setItem('authRedirect', 'true');

            router.push('/feed');
        } catch (error: any) {
            // ✅ Don't show error for popup-closed — user just dismissed it
            if (error.code === 'auth/popup-closed-by-user' || 
                error.code === 'auth/cancelled-popup-request') {
                setLoading(false);
                return;
            }
            console.error('Login error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] flex flex-col items-center justify-center px-6 font-sans">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FF0069] rounded-full blur-[150px] opacity-10 pointer-events-none" />

            <div className="w-full max-w-sm text-center relative z-10 bg-[#F8F8F8] p-8 rounded-2xl border border-[#E5E5E5]">
                <Link href="/" className="inline-block mb-12">
                    <span className="font-poppins font-black text-3xl tracking-tighter italic">
                        <span className="text-[#FF0069]">KHAN</span> <span className="text-[#0A0A0A]">HUB</span>
                    </span>
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <h1 className="text-4xl font-poppins font-bold mb-3 tracking-tight text-[#0A0A0A]">Welcome back</h1>
                    <p className="text-[#666666] font-medium tracking-wide">Sign in to continue your journey</p>
                </motion.div>

                <div className="space-y-6">
                    <GoogleSignInButton onClick={handleGoogleLogin} loading={loading} />

                    <div className="flex items-center gap-4 py-2">
                        <div className="flex-1 h-[1px] bg-[#E5E5E5]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#AAAAAA]">or</span>
                        <div className="flex-1 h-[1px] bg-[#E5E5E5]" />
                    </div>

                    <div className="space-y-4">
                        <div className="text-sm text-[#666666]">
                            Don't have an account?
                        </div>
                        <Link
                            href="/auth/register"
                            className="inline-block font-poppins font-bold text-[#FF0069] tracking-widest text-sm uppercase hover:underline underline-offset-8"
                        >
                            Create Account →
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
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap');
                
                body {
                    background: #FFFFFF;
                    font-family: 'DM Sans', sans-serif;
                }
                .font-poppins {
                    font-family: 'Poppins', sans-serif;
                }
            `}</style>
        </div>
    );
}
