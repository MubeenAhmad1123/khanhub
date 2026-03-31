'use client';
//VideoCard.tsx
import { useState, useRef } from 'react';
import { Play, User, Building2, Eye, Link as LinkIcon, Edit, CheckCircle2, Clock, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConnections } from '@/hooks/useConnections';
import { useAuth } from '@/hooks/useAuth';
import ConnectModal from './ConnectModal';
import VideoModal from './VideoModal';

interface VideoCardProps {
    seekerId: string;
    videoId?: string;
    role: 'job_seeker' | 'employer';
    industry: string;
    subcategory: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    experience?: string | number;
    salary?: string;
    className?: string;
    hiringFor?: string;
    expectedExperience?: string;
    salaryMin?: number;
    salaryMax?: number;
    hideSalary?: boolean;
    jobType?: string;
    targetJobTitle?: string;
}

export default function VideoCard({
    seekerId,
    videoId,
    role,
    industry,
    subcategory,
    videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-308-large.mp4',
    thumbnailUrl,
    experience,
    salary,
    className,
    hiringFor,
    expectedExperience,
    salaryMin,
    salaryMax,
    hideSalary,
    jobType,
    targetJobTitle
}: VideoCardProps) {
    const [muted, setMuted] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const { user } = useAuth();
    const { getConnectionWith } = useConnections();
    const connection = getConnectionWith(seekerId);

    const isOwnVideo = user?.uid === seekerId;
    const coverImage = thumbnailUrl || (role === 'job_seeker'
        ? 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=800'
        : 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800');

    const handleMouseEnter = () => {
        if (window.innerWidth >= 1024) {
            setIsHovering(true);
            videoRef.current?.play().catch(() => { });
            setPlaying(true);
        }
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            setPlaying(false);
        }
    };

    const handleConnectClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOwnVideo) return;
        if (!user) {
            window.location.href = '/auth/login';
            return;
        }
        setShowConnectModal(true);
    };

    const handleViewProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.location.href = `/profile/${role}/${seekerId}`;
    };

    const toggleFullscreen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (videoRef.current.requestFullscreen) {
                videoRef.current.requestFullscreen();
            } else if ((videoRef.current as any).webkitRequestFullscreen) {
                (videoRef.current as any).webkitRequestFullscreen();
            }
        }
    };

    const handleCardClick = () => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
        if (isMobile) {
            if (videoRef.current) {
                if (playing) {
                    videoRef.current.pause();
                    setPlaying(false);
                } else {
                    videoRef.current.play().catch(() => { });
                    setPlaying(true);
                }
            }
            return;
        }
        // Desktop: go to feed at this specific video
        if (videoId) {
            window.location.href = `/feed?v=${videoId}`;
            return;
        }
        setShowVideoModal(true);
    };

    const connectionStatus = isOwnVideo ? 'own' : (connection?.status || 'none');

    return (
        <>
            <div
                className={cn(
                    "group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 flex flex-col border border-slate-100",
                    "lg:hover:-translate-y-2",
                    className
                )}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleCardClick}
            >
                {/* Video Area */}
                <div className="relative aspect-[3/4] bg-slate-950 overflow-hidden">
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        poster={coverImage}
                        muted={muted}
                        loop
                        playsInline
                        className={cn(
                            "absolute inset-0 w-full h-full object-cover transition-all duration-700",
                            isHovering || playing ? "scale-105 opacity-100" : "scale-100 opacity-80 shadow-inner"
                        )}
                    />

                    {/* Overlays */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

                    {/* Floating Controls */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 translate-x-0 lg:translate-x-4 lg:group-hover:translate-x-0 z-30 pointer-events-auto">
                        <button
                            onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
                            className="w-10 h-10 rounded-full bg-slate-900/40 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/40 transition-all"
                        >
                            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            className="w-10 h-10 rounded-full bg-slate-900/40 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/40 transition-all"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Central Play Button */}
                    {!playing && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center animate-pulse lg:animate-none group-hover:scale-110 transition-transform duration-500">
                                <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/50">
                                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info Badges */}
                    <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-3 pointer-events-none">
                        <div className="flex flex-wrap gap-2">
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-2xl border border-white/30 shadow-2xl",
                                role === 'job_seeker' ? "bg-blue-600/90 text-white" : "bg-orange-500/90 text-white"
                            )}>
                                {role === 'job_seeker' ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                {role === 'job_seeker' ? 'Candidate (امیدوار)' : 'Company (کمپنی)'}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-2xl text-white text-[10px] font-black border border-white/10 uppercase tracking-widest">
                                {industry}
                            </span>
                        </div>
                        {role === 'employer' ? (
                            <div className="flex flex-col gap-1">
                                <h4 className="text-white text-xl font-black uppercase tracking-tight line-clamp-2 leading-tight drop-shadow-lg">
                                    Hiring: {hiringFor || subcategory}
                                </h4>
                                <div className="flex gap-2 items-center">
                                    {jobType && (
                                        <span className="px-2 py-0.5 bg-orange-500 text-white text-[8px] font-black rounded-lg uppercase tracking-widest">
                                            {jobType}
                                        </span>
                                    )}
                                    <p className="text-white text-[10px] font-bold drop-shadow-md">
                                        {hideSalary
                                            ? 'Competitive Salary'
                                            : (salaryMin && salaryMax
                                                ? `PKR ${salaryMin.toLocaleString()} - ${salaryMax.toLocaleString()}`
                                                : 'Salary Negotiable')}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <h4 className="text-white text-xl font-black uppercase tracking-tight line-clamp-2 leading-tight drop-shadow-lg">
                                {targetJobTitle || subcategory}
                            </h4>
                        )}
                    </div>
                </div>

                {/* Profile Action Area */}
                <div className="p-6 bg-white flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1 flex-1">
                            {role === 'job_seeker' ? (
                                <>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        Looking For
                                    </span>
                                    <span className="text-sm font-black text-slate-800 leading-tight">
                                        {targetJobTitle || subcategory || 'Open to Opportunities'}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        <span className="text-[11px] font-bold text-slate-500">
                                            {experience || 'Fresher'} • تجربہ
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        Hiring For · ملازمت
                                    </span>
                                    <span className="text-sm font-black text-slate-800 leading-tight">
                                        {hiringFor || subcategory || 'Open Position'}
                                    </span>
                                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                        {jobType && (
                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black rounded-md uppercase tracking-wider">
                                                {jobType}
                                            </span>
                                        )}
                                        <span className="text-[11px] font-bold text-slate-500">
                                            {expectedExperience || 'Any Exp'} required
                                        </span>
                                    </div>
                                    {!hideSalary && salaryMin && salaryMax && (
                                        <span className="text-[11px] font-bold text-emerald-600 mt-0.5">
                                            PKR {salaryMin.toLocaleString()} – {salaryMax.toLocaleString()}
                                        </span>
                                    )}
                                    {hideSalary && (
                                        <span className="text-[11px] font-bold text-slate-400 mt-0.5">
                                            Competitive Salary · تنخواہ
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleViewProfileClick}
                            className="group/btn py-3.5 border-2 border-slate-100 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            Profile
                        </button>

                        <button
                            onClick={handleConnectClick}
                            disabled={connectionStatus === 'pending' || connectionStatus === 'accepted' || connectionStatus === 'own'}
                            className={cn(
                                "py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95",
                                connectionStatus === 'accepted' ? "bg-green-600 text-white shadow-green-200" :
                                    connectionStatus === 'pending' ? "bg-slate-100 text-slate-400" :
                                        connectionStatus === 'own' ? "bg-slate-100 text-slate-500" :
                                            "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300"
                            )}
                        >
                            {connectionStatus === 'accepted' ? <CheckCircle2 className="w-4 h-4" /> :
                                connectionStatus === 'pending' ? <Clock className="w-4 h-4" /> :
                                    isOwnVideo ? <Edit className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}

                            {connectionStatus === 'accepted' ? 'Done' :
                                connectionStatus === 'pending' ? 'Wait' :
                                    isOwnVideo ? 'Edit' : (role === 'employer' ? 'Hire' : 'Connect')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <VideoModal
                isOpen={showVideoModal}
                onClose={() => setShowVideoModal(false)}
                videoUrl={videoUrl}
                role={role}
                industry={industry}
                subcategory={subcategory}
                onViewProfile={() => { setShowVideoModal(false); window.location.href = `/profile/${role}/${seekerId}`; }}
                onConnect={() => { setShowVideoModal(false); setShowConnectModal(true); }}
                connectionStatus={connectionStatus as any}
            />

            <ConnectModal
                isOpen={showConnectModal}
                onClose={() => setShowConnectModal(false)}
                seekerId={seekerId}
            />
        </>
    );
}