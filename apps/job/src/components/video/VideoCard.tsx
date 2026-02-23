'use client';

import { useState, useRef } from 'react';
import { Play, MapPin, User, Building2, Eye, Link as LinkIcon, Edit, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConnections } from '@/hooks/useConnections';
import { useAuth } from '@/hooks/useAuth';
import ConnectModal from './ConnectModal';
import VideoModal from './VideoModal';
import Image from 'next/image';

interface VideoCardProps {
    seekerId: string;
    role: 'jobseeker' | 'employer';
    industry: string;
    subcategory: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    experience?: string | number;
    salary?: string;
    className?: string;
}

export default function VideoCard({
    seekerId,
    role,
    industry,
    subcategory,
    videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-308-large.mp4',
    thumbnailUrl,
    experience,
    salary,
    className
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
    const coverImage = thumbnailUrl || (role === 'jobseeker'
        ? 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=800'
        : 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800');

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (playing) {
                videoRef.current.pause();
                setPlaying(false);
            } else {
                videoRef.current.play().catch(() => { });
                setPlaying(true);
            }
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMuted(!muted);
    };

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

    const handleCardClick = () => {
        if (window.innerWidth < 1024) {
            setShowVideoModal(true);
        }
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
                <div className="relative aspect-[9/16] bg-slate-950 overflow-hidden">
                    {/* Video Element - Always present but opacity changes for smooth transition */}
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

                    {/* Enhanced Overlays */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

                    {/* Floating Controls */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                        <button
                            onClick={toggleMute}
                            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white hover:bg-white/40 transition-all pointer-events-auto"
                        >
                            {muted ? <span className="text-sm">🔇</span> : <span className="text-sm">🔊</span>}
                        </button>
                        <button
                            onClick={togglePlay}
                            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white hover:bg-white/40 transition-all pointer-events-auto"
                        >
                            {playing ? <span className="text-lg">⏸</span> : <Play className="w-4 h-4 fill-current" />}
                        </button>
                    </div>

                    {/* Central Play Button (Visible when not playing) */}
                    {!playing && !isHovering && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-125 transition-transform duration-700">
                                <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/50">
                                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info Badges inside Video Area */}
                    <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-3 pointer-events-none">
                        <div className="flex flex-wrap gap-2">
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-2xl border border-white/30 shadow-2xl",
                                role === 'jobseeker' ? "bg-blue-600/90 text-white" : "bg-orange-500/90 text-white"
                            )}>
                                {role === 'jobseeker' ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                {role === 'jobseeker' ? 'Candidate (امیدوار)' : 'Company (کمپنی)'}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-2xl text-white text-[10px] font-black border border-white/10 uppercase tracking-widest">
                                {industry}
                            </span>
                        </div>
                        <h4 className="text-white text-xl font-black uppercase tracking-tight line-clamp-2 leading-tight drop-shadow-lg">
                            {subcategory}
                        </h4>
                    </div>
                </div>

                {/* Profile Action Area */}
                <div className="p-6 bg-white flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                                {role === 'jobseeker' ? 'Experience' : 'Offering'}
                            </span>
                            <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                                {role === 'jobseeker' && experience !== undefined && experience !== '' ? (
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        <span>{experience} {Number(experience) === 1 ? 'Year' : 'Years'}</span>
                                    </div>
                                ) : role === 'employer' && salary ? (
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                        <span>{salary}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <span className="italic">Standard Profile</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status Indicator */}
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center">
                                        <User className="w-3 h-3 text-slate-400" />
                                    </div>
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">+1.2k</span>
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
                            disabled={connectionStatus === 'pending' || connectionStatus === 'approved' || connectionStatus === 'own'}
                            className={cn(
                                "py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95",
                                connectionStatus === 'approved' ? "bg-green-600 text-white shadow-green-200" :
                                    connectionStatus === 'pending' ? "bg-slate-100 text-slate-400" :
                                        connectionStatus === 'own' ? "bg-slate-100 text-slate-500" :
                                            "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300"
                            )}
                        >
                            {connectionStatus === 'approved' ? <CheckCircle2 className="w-4 h-4" /> :
                                connectionStatus === 'pending' ? <Clock className="w-4 h-4" /> :
                                    isOwnVideo ? <Edit className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}

                            {connectionStatus === 'approved' ? 'Done' :
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
