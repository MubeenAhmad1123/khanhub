'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    User,
    ArrowRight,
    Mail,
    Lock,
    Phone,
    MapPin,
    Loader2,
    ShieldCheck,
    Briefcase,
    Zap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import CitySearch from '@/components/forms/CitySearch';
import TagInput from '@/components/ui/TagInput';
import { cn } from '@/lib/utils';
import { CategoryKey, CATEGORY_CONFIG } from '@/lib/categories';

const EXPERIENCE_LEVELS = ['Fresher', '1-2 years', '3-5 years', '5-10 years', '10+ years'];

import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebase-config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Handle initial redirect if already auth
    useEffect(() => {
        if (isAuthenticated) {
            router.push('/feed');
        }
    }, [isAuthenticated, router]);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Read stored guest prefs
            const guestPrefsStr = localStorage.getItem('jobreel_guest_prefs');
            const guestPrefs = guestPrefsStr ? JSON.parse(guestPrefsStr) : {};

            // Priority: URL Params > LocalStorage > Default
            const finalCategory = searchParams.get('category') || guestPrefs.category || 'jobs';
            const finalRole = searchParams.get('role') || guestPrefs.role || 'provider';

            // Check if user already exists in Firestore
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    category: finalCategory,
                    role: finalRole,
                    city: '',
                    phone: '',
                    createdAt: serverTimestamp(),
                    videosWatched: 0,
                    savedVideos: [],
                    profileComplete: false,
                });
            }

            localStorage.removeItem('jobreel_guest_prefs');
            router.push('/feed');
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[--accent] flex flex-col justify-center">
            <div className="max-w-md mx-auto px-8 w-full">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-black font-syne italic text-transparent bg-clip-text bg-gradient-to-r from-[--accent] to-white/40 mb-4">
                        JOBREEL
                    </h1>
                    <p className="text-[--text-muted] text-[10px] uppercase tracking-[0.4em] font-bold">
                        Register Free • Connect Fast
                    </p>
                </div>

                <div className="space-y-6 bg-[--bg-card] p-8 rounded-[32px] border border-[--border] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <p className="text-center text-sm text-[--text-muted] leading-relaxed">
                        Join JobReel to unlock unlimited videos and connect with professionals.
                    </p>

                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full py-5 bg-white text-black font-black font-syne uppercase tracking-[0.2em] text-[10px] rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {loading ? 'Entering...' : 'Continue with Google'}
                    </button>

                    {error && (
                        <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-tighter">
                            {error}
                        </p>
                    )}
                </div>

                <p className="mt-12 text-center text-[--text-muted] text-[10px] uppercase tracking-[0.2em] font-medium">
                    Already have an account? <Link href="/auth/login" className="text-[--accent] font-black hover:underline">Login</Link>
                </p>

                <div className="mt-12 flex items-center justify-center gap-2 grayscale opacity-50">
                    <ShieldCheck size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Secure & Verified Connection</span>
                </div>
            </div>
        </div>
    );
}
