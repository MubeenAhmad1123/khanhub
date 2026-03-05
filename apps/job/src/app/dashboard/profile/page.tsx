'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase/firebase-config';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useCategory } from '@/context/CategoryContext';
import { Loader2 } from 'lucide-react';

// Components
import ProfileHeader from '@/components/profile/ProfileHeader';
import BioSection from '@/components/profile/BioSection';
import SkillsSection from '@/components/profile/SkillsSection';
import ExperienceSection from '@/components/profile/ExperienceSection';
import EducationSection from '@/components/profile/EducationSection';
import VideosGrid from '@/components/profile/VideosGrid';

export default function ProfilePage() {
    const router = useRouter();
    const { accentColor } = useCategory();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            if (!firebaseUser) {
                router.push('/auth/register?from=profile');
                return;
            }

            // Sync with Firestore profile
            const unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (doc) => {
                if (doc.exists()) {
                    setUser({ uid: doc.id, ...doc.data() });
                }
                setLoading(false);
            });

            return () => unsubscribeProfile();
        });

        return () => unsubscribeAuth();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-[--accent] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-32">
            {/* TikTok Style Header */}
            <ProfileHeader user={user} accentColor={accentColor} />

            {/* LinkedIn Style Content Sections */}
            <main className="max-w-2xl mx-auto">
                <BioSection user={user} />
                <SkillsSection user={user} accentColor={accentColor} />
                <ExperienceSection user={user} accentColor={accentColor} />
                <EducationSection user={user} accentColor={accentColor} />

                {/* Videos Grid Section */}
                <div className="mt-8">
                    <div className="px-6 py-4 border-t border-[#1A1A1A]">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[--text-muted]">Videos</h3>
                    </div>
                    <VideosGrid uid={user?.uid} />
                </div>
            </main>

            <style jsx global>{`
                :root {
                    --accent: ${accentColor};
                    --text-muted: #888888;
                    --border: #1A1A1A;
                }
                
                body {
                    background-color: #050505;
                    font-family: 'DM Sans', sans-serif;
                }
            `}</style>
        </div>
    );
}
