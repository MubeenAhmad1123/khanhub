'use client';

import { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle, FileText, Clock, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toDate } from '@/lib/firebase/firestore';

interface VideoModerationCardProps {
    video: {
        id: string;
        userId: string;
        userEmail?: string;
        cloudinaryUrl: string;
        role?: string;
        industry?: string;
        subcategory?: string;
        transcriptionText?: string;
        aiFlags?: string[];
        createdAt: any;
    };
    onApprove: (videoId: string) => Promise<void>;
    onReject: (videoId: string, reason: string) => Promise<void>;
}

export default function VideoModerationCard({ video, onApprove, onReject }: VideoModerationCardProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const timeAgo = video.createdAt
        ? formatDistanceToNow(toDate(video.createdAt), { addSuffix: true })
        : 'Just now';

    const handleApprove = async () => {
        if (!confirm('Approve this video and make it live?')) return;
        setIsProcessing(true);
        try {
            await onApprove(video.id);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }
        setIsProcessing(true);
        try {
            await onReject(video.id, rejectReason);
            setShowRejectModal(false);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group hover:shadow-md transition-all">
            {/* Video Player Section */}
            <div className="aspect-video bg-black relative">
                <video
                    src={video.cloudinaryUrl}
                    className="w-full h-full object-contain"
                    controls
                    preload="metadata"
                />
            </div>

            {/* Content Section */}
            <div className="p-6 space-y-4">
                {/* Meta Info */}
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-tight">
                        {video.role || 'JOB SEEKER'} 🔵
                    </span>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200 uppercase tracking-tight">
                        {video.industry || 'General'}
                    </span>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200 uppercase tracking-tight">
                        {video.subcategory || 'Specialist'}
                    </span>
                    <div className="flex-1 text-right">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" /> {timeAgo}
                        </span>
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> AI Transcription
                    </h4>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-600 leading-relaxed max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                        {video.transcriptionText || 'No transcription available.'}
                    </div>
                </div>

                <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5" /> AI Flags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {(!video.aiFlags || video.aiFlags.length === 0) ? (
                            <>
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                                    ✅ No phone numbers
                                </span>
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                                    ✅ No location detected
                                </span>
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                                    ✅ No contact sharing
                                </span>
                            </>
                        ) : (
                            video.aiFlags.map((flag, idx) => (
                                <span key={idx} className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100 italic">
                                    ⚠️ {flag.replace(/_/g, ' ').toUpperCase()}
                                </span>
                            ))
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={handleApprove}
                        disabled={isProcessing}
                        className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 disabled:opacity-50"
                    >
                        <CheckCircle className="w-4 h-4" />
                        APPROVE
                    </button>
                    <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={isProcessing}
                        className="flex-1 bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <XCircle className="w-4 h-4" />
                        REJECT
                    </button>
                </div>
            </div>

            {/* Rejection Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Reject Video</h3>
                        <p className="text-slate-500 text-sm mb-6 font-medium">Please provide a constructive reason for rejection. This will be sent as a notification to the candidate.</p>

                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none mb-6 text-sm"
                            placeholder="e.g. Video quality is too low, sound is distorted, or personal contact info was visible..."
                            autoFocus
                        />

                        <div className="flex gap-4">
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                                className="flex-1 font-bold text-slate-500 hover:bg-slate-50 py-3 rounded-xl transition-colors"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectReason.trim() || isProcessing}
                                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                            >
                                CONFIRM REJECT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
