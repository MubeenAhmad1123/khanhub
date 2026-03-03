'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { ReelPlayer } from './ReelPlayer';
import { Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function VideoFeed() {
    const { user: currentUser } = useAuth();
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState<string | null>(null);
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                // Fetch users of opposite role with videoUrl
                const targetRole = currentUser?.role === 'employer' ? 'job_seeker' : 'employer';

                // Firestore query for target role
                const q = query(
                    collection(db, 'users'),
                    where('role', '==', targetRole),
                    limit(20)
                );

                const snap = await getDocs(q);
                let results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filter ones with videoUrl and valid industry
                const videoResults = results.filter((u: any) =>
                    (u.videoUrl || u.videoResume) && u.industry
                );

                setVideos(videoResults);
                if (videoResults.length > 0) setActiveId(videoResults[0].id);
            } catch (err) {
                console.error('Fetch feed error:', err);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) fetchVideos();
    }, [currentUser]);

    useEffect(() => {
        observer.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.getAttribute('data-id'));
                    }
                });
            },
            { threshold: 0.6 }
        );

        return () => observer.current?.disconnect();
    }, [videos]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-[#FF0069] blur-2xl opacity-20 animate-pulse" />
                    <Loader2 className="w-12 h-12 text-[#FF0069] animate-spin relative" />
                </div>
                <p className="text-[#888888] font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
                    Curating your feed
                </p>
            </div>
        );
    }

    if (videos.length === 0) {
        return (
            <div className="max-w-md mx-auto aspect-[9/16] rounded-[40px] border border-[#1F1F1F] bg-[#0D0D0D] flex flex-col items-center justify-center p-12 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-[#111111] flex items-center justify-center border border-[#1F1F1F]">
                    <Sparkles className="w-10 h-10 text-[#FFD600]" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black font-syne uppercase italic tracking-tighter">Feed Empty</h3>
                    <p className="text-[#888888] font-dm-sans text-sm">
                        No video profiles found for {currentUser?.role === 'employer' ? 'Job Seekers' : 'Companies'} in your area yet.
                    </p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-[#111111] border border-[#1F1F1F] rounded-full text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
                >
                    Refresh
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto h-[calc(100vh-180px)] snap-y snap-mandatory overflow-y-scroll scroll-smooth no-scrollbar">
            {videos.map((v) => (
                <div key={v.id} data-id={v.id} ref={(el) => { if (el) observer.current?.observe(el); }} className="snap-start">
                    <ReelPlayer
                        videoUrl={v.videoUrl || v.videoResume}
                        isActive={activeId === v.id}
                        userProfile={v}
                        role={v.role}
                    />
                </div>
            ))}

            {/* End of feed indicator */}
            <div className="h-40 flex items-center justify-center text-[#444444]">
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">You're caught up</p>
            </div>
        </div>
    );
}
