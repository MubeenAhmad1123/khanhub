'use client';

import React, { useState } from 'react';
import { auth, db } from '@/lib/firebase/firebase-config';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GoogleSignInButton } from '@/components/ui/GoogleSignInButton';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { loginWithGoogle } = useAuth();

    const handleGoogleRegister = async () => {
        try {
            setLoading(true);
            console.log('🔵 [Register] Step 1: Starting Google registration via useAuth...');

            // loginWithGoogle handles the popup, Firestore creation, and select_account
            await loginWithGoogle('job_seeker');
            
            console.log('✅ [Register] Step 2: loginWithGoogle successful!');

            // Post-registration logic
            localStorage.removeItem('jobreel_videos_watched');
            localStorage.setItem('jobreel_registered', 'true');
            sessionStorage.setItem('authRedirect', 'true');

            // Note: Since useAuth updates state, we'd need to check the newly updated state
            // but for simplicity we can check the result of the Firestore creation logic
            // that is now internal to useAuth.
            // A common pattern is to check if onboardingCompleted is false in the profile.
            
            console.log('🔵 [Register] Step 3: Navigating to feed or onboarding...');
            // Redirect based on current knowledge or let it happen in a useEffect
            router.push('/feed'); 
            console.log('✅ [Register] Step 4: router.push called!');

        } catch (error: any) {
            if (error.code === 'auth/popup-closed-by-user' ||
                error.code === 'auth/cancelled-popup-request') {
                
                // ✅ THE KEY FIX: check if user actually got logged in despite the error
                const currentUser = auth.currentUser;
                if (currentUser) {
                    console.log('✅ [Register] User authenticated despite popup error — continuing...');
                    
                    localStorage.removeItem('jobreel_videos_watched');
                    localStorage.setItem('jobreel_registered', 'true');
                    sessionStorage.setItem('authRedirect', 'true');

                    router.push('/feed');
                    return;
                }

                console.warn('⚠️ [Register] Popup cancelled or closed.');
                return;
            }
            console.error('❌ [Register] FAILED:', error);
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
                        <span className="text-[#FF0069]">JOB</span><span className="text-[#0A0A0A]">REEL</span>
                    </span>
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <h1 className="text-4xl font-poppins font-bold mb-3 tracking-tight text-[#0A0A0A]">Join KHAN HUB</h1>
                    <p className="text-[#666666] font-medium tracking-wide">Free forever. No credit card.</p>
                </motion.div>

                <div className="space-y-6">
                    <GoogleSignInButton onClick={handleGoogleRegister} loading={loading} />

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
                            className="inline-block font-poppins font-bold text-[#FF0069] tracking-widest text-sm uppercase hover:underline underline-offset-8"
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
