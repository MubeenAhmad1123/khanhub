'use client';

import { X, User, Building2, ExternalLink, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface VideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoUrl: string;
    role: 'jobseeker' | 'employer';
    industry: string;
    subcategory: string;
    onViewProfile: () => void;
    onConnect: () => void;
    connectionStatus?: 'none' | 'pending' | 'approved' | 'rejected' | 'own';
}

export default function VideoModal({
    isOpen,
    onClose,
    videoUrl,
    role,
    industry,
    subcategory,
    onViewProfile,
    onConnect,
    connectionStatus = 'none'
}: VideoModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col pt-safe animate-in fade-in duration-300">
            {/* Header / Close Button */}
            <div className="absolute top-4 right-4 z-[210]">
                <button
                    onClick={onClose}
                    className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Video Container */}
            <div className="flex-1 relative flex items-center justify-center bg-black">
                <video
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    playsInline
                />
            </div>

            {/* Bottom Info & Actions Overlay */}
            <div className="bg-gradient-to-t from-black via-black/80 to-transparent p-6 pb-12">
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1",
                            role === 'jobseeker' ? "bg-blue-600 text-white" : "bg-orange-600 text-white"
                        )}>
                            {role === 'jobseeker' ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                            {role === 'jobseeker' ? 'Candidate' : 'Employer'}
                        </span>
                        <span className="text-white/60 text-xs font-bold uppercase tracking-widest">{industry}</span>
                    </div>

                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-1">
                        🔒 Hidden Profile
                    </h2>
                    <p className="text-blue-400 font-bold uppercase tracking-widest text-xs">
                        {subcategory}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onViewProfile}
                        className="flex items-center justify-center gap-2 py-4 bg-white/10 border border-white/20 rounded-2xl text-white font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
                    >
                        <ExternalLink className="w-4 h-4" />
                        View Profile
                    </button>

                    <button
                        onClick={onConnect}
                        disabled={connectionStatus === 'pending' || connectionStatus === 'approved' || connectionStatus === 'own'}
                        className={cn(
                            "flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all",
                            connectionStatus === 'approved' ? "bg-green-600 text-white" :
                                connectionStatus === 'pending' ? "bg-slate-700 text-slate-400" :
                                    connectionStatus === 'own' ? "bg-blue-600 text-white" :
                                        "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                        )}
                    >
                        {connectionStatus === 'approved' ? '✅ Connected' :
                            connectionStatus === 'pending' ? '⏳ Pending' :
                                connectionStatus === 'own' ? '👤 Your Video' :
                                    role === 'employer' ? '🔗 Hire Me' : '🔗 Connect'}
                    </button>
                </div>
            </div>
        </div>
    );
}
