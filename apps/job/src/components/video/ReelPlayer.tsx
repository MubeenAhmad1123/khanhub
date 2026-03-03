'use client';

import { useState, useRef, useEffect } from 'react';
import { Heart, Share2, Link as LinkIcon, User, Building2, MapPin, Briefcase, Zap, Volume2, VolumeX, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReelPlayerProps {
    videoUrl: string;
    isActive: boolean;
    userProfile: any;
    role: 'job_seeker' | 'employer';
}

export function ReelPlayer({ videoUrl, isActive, userProfile, role }: ReelPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [muted, setMuted] = useState(true);
    const [liked, setLiked] = useState(false);

    useEffect(() => {
        if (isActive) {
            videoRef.current?.play().catch(() => { });
        } else {
            videoRef.current?.pause();
            if (videoRef.current) videoRef.current.currentTime = 0;
        }
    }, [isActive]);

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMuted(!muted);
    };

    const toggleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLiked(!liked);
    };

    return (
        <div className="relative w-full h-[calc(100vh-180px)] bg-[#0D0D0D] mb-6 snap-start overflow-hidden rounded-[40px] border border-[#1F1F1F] shadow-2xl group">
            {/* Video Element */}
            <video
                ref={videoRef}
                src={videoUrl}
                loop
                playsInline
                muted={muted}
                className="w-full h-full object-cover cursor-pointer"
                onClick={toggleMute}
            />

            {/* Side Actions (TikTok style) */}
            <div className="absolute right-6 bottom-32 flex flex-col gap-8 z-20">
                <button
                    onClick={toggleLike}
                    className="flex flex-col items-center gap-1 group/btn"
                >
                    <div className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
                        liked ? "bg-[#FF0069] text-white shadow-[0_0_20px_rgba(255,0,105,0.4)]" : "bg-black/40 backdrop-blur-xl border border-white/10 text-white hover:bg-black/60"
                    )}>
                        <Heart className={cn("w-7 h-7", liked && "fill-current")} />
                    </div>
                </button>

                <button className="flex flex-col items-center gap-1 group/btn">
                    <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center hover:bg-black/60 transition-all">
                        <MessageCircle className="w-7 h-7" />
                    </div>
                </button>

                <button className="flex flex-col items-center gap-1 group/btn">
                    <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center hover:bg-black/60 transition-all">
                        <Share2 className="w-7 h-7" />
                    </div>
                </button>

                <button
                    onClick={toggleMute}
                    className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md border border-white/5 text-white/40 flex items-center justify-center hover:text-white transition-all mx-auto"
                >
                    {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
            </div>

            {/* Overlay Info (Bottom) */}
            <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                <div className="space-y-4 pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full border-2 border-[#FF0069] bg-[#111111] overflow-hidden p-[2px]">
                            {userProfile.photoURL || userProfile.logoURL ? (
                                <img src={userProfile.photoURL || userProfile.logoURL} alt={userProfile.displayName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <div className="w-full h-full rounded-full bg-[#1F1F1F] flex items-center justify-center text-sm font-black uppercase">
                                    {(userProfile.displayName || userProfile.companyName || '?').charAt(0)}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="font-black font-syne uppercase tracking-tight text-white text-lg flex items-center gap-2 italic">
                                {userProfile.displayName || userProfile.companyName}
                                <Zap className="w-4 h-4 text-[#FFD600] fill-[#FFD600]" />
                            </p>
                            <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-[#888888]">
                                {role === 'job_seeker' ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                {userProfile.industry}
                            </div>
                        </div>
                    </div>

                    <h3 className="text-2xl font-black font-syne italic uppercase tracking-tighter text-white leading-tight">
                        {role === 'job_seeker' ? 'Hiring Me For: ' : 'Hiring For: '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF0069] to-[#7638FA]">
                            {userProfile.desiredJobTitle || userProfile.subcategory || (userProfile.firstJobPost?.jobTitle)}
                        </span>
                    </h3>

                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-[#111111]/80 backdrop-blur-md rounded-full border border-[#1F1F1F]">
                            <MapPin className="w-3.5 h-3.5 text-[#FF0069]" />
                            <span className="text-[11px] font-black uppercase tracking-widest">{userProfile.city}</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-[#111111]/80 backdrop-blur-md rounded-full border border-[#1F1F1F]">
                            <Briefcase className="w-3.5 h-3.5 text-[#7638FA]" />
                            <span className="text-[11px] font-black uppercase tracking-widest">{userProfile.totalExperience || userProfile.experienceRequired || 'Fresh'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gradient Glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FF0069] via-[#7638FA] to-[#FFD600] opacity-30" />
        </div>
    );
}
