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
    seekerName: string;
    role: 'jobseeker' | 'employer';
    industry: string;
    subcategory: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    className?: string;
}

export default function VideoCard({
    seekerId,
    seekerName,
    role,
    industry,
    subcategory,
    videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-308-large.mp4',
    thumbnailUrl,
    className
}: VideoCardProps) {
    const [isHovering, setIsHovering] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const { user } = useAuth();
    const { getConnectionWith } = useConnections();
    const connection = getConnectionWith(seekerId);

    const isOwnVideo = user?.uid === seekerId;

    const handleMouseEnter = () => {
        // Desktop only autoplay
        if (window.innerWidth >= 1024) {
            setIsHovering(true);
            videoRef.current?.play().catch(() => { });
        }
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };

    const handleConnectClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOwnVideo) {
            // Logic for editing own video?
            return;
        }
        if (!user) {
            window.location.href = '/auth/login';
            return;
        }
        setShowConnectModal(true);
    };

    const handleViewProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Navigate to profile page
        window.location.href = `/profile/${role}/${seekerId}`;
    };

    const handlePlayMobile = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.innerWidth < 1024) {
            setShowVideoModal(true);
        }
    };

    const connectionStatus = isOwnVideo ? 'own' : (connection?.status || 'none');

    return (
        <>
            <div
                className={cn(
                    "group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col border border-slate-100",
                    "lg:hover:scale-[1.02]", // Disable scale on mobile
                    className
                )}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handlePlayMobile}
            >
                {/* Video Area (Top 75%) */}
                <div className="relative aspect-[9/16] bg-slate-900 overflow-hidden">
                    {/* Video Element */}
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        poster={thumbnailUrl}
                        muted
                        loop
                        playsInline
                        className={cn(
                            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                            isHovering ? "opacity-100" : "opacity-0"
                        )}
                    />

                    {/* Placeholder / Thumbnail when not hovering */}
                    {!isHovering && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            {thumbnailUrl ? (
                                <Image
                                    src={thumbnailUrl}
                                    alt={seekerName}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-slate-700">
                                    <Play className="w-12 h-12 opacity-20" />
                                </div>
                            )}

                            {/* Play Button Overlay (Visible on mobile or when not hovering) */}
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform duration-500 z-10">
                                <Play className="w-8 h-8 text-white fill-white ml-1" />
                            </div>
                        </div>
                    )}

                    {/* Gradient Overlay (Bottom 30% only) */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

                    {/* Info inside video area (Bottom Left) */}
                    <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                        <div className="flex flex-wrap gap-1.5 items-center">
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 backdrop-blur-md border border-white/20",
                                role === 'jobseeker' ? "bg-blue-600/90 text-white" : "bg-orange-500/90 text-white"
                            )}>
                                {role === 'jobseeker' ? <User className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                                {role === 'jobseeker' ? 'Candidate' : 'Employer'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white text-[9px] font-bold border border-white/10 uppercase tracking-widest">
                                {industry}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Info Area (Bottom 25%) */}
                <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                            <h3 className="text-slate-900 font-black text-sm uppercase tracking-tight truncate">
                                {seekerName}
                            </h3>
                            <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest truncate">
                                {subcategory}
                            </p>
                        </div>
                    </div>

                    {/* Buttons Row */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleViewProfileClick}
                            className="flex-1 py-2.5 border-2 border-blue-100 rounded-2xl text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                            {isOwnVideo ? <User className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {isOwnVideo ? 'Your Info' : 'View'}
                        </button>

                        <button
                            onClick={handleConnectClick}
                            disabled={connectionStatus === 'pending' || connectionStatus === 'approved' || connectionStatus === 'own'}
                            className={cn(
                                "flex-1 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-1.5",
                                connectionStatus === 'approved' ? "bg-green-600 text-white border-b-2 border-green-800" :
                                    connectionStatus === 'pending' ? "bg-slate-100 text-slate-400 border border-slate-200" :
                                        connectionStatus === 'own' ? "bg-slate-100 text-slate-500 border border-slate-200" :
                                            "bg-orange-500 text-white border-b-2 border-orange-700 hover:bg-orange-600"
                            )}
                        >
                            {connectionStatus === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                                connectionStatus === 'pending' ? <Clock className="w-3.5 h-3.5" /> :
                                    isOwnVideo ? <Edit className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}

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
                seekerName={seekerName}
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
                seekerName={seekerName}
            />
        </>
    );
}
