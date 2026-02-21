'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/firebase-config';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { writeActivityLog } from '@/hooks/useActivityLog';
import VideoModerationCard from '@/components/admin/VideoModerationCard';
import { Loader2, Video, CheckCircle, Clock, XCircle, Filter, Search } from 'lucide-react';
import Image from 'next/image';

interface VideoRequest {
    id: string;
    userId: string;
    userEmail: string;
    cloudinaryUrl: string;
    admin_status: 'pending' | 'approved' | 'rejected';
    is_live: boolean;
    transcriptionStatus: 'pending' | 'processing' | 'completed' | 'failed';
    transcriptionText?: string;
    aiFlags?: string[];
    role?: string;
    industry?: string;
    subcategory?: string;
    createdAt: any;
    published_at?: any;
    rejection_reason?: string;
}

export default function AdminVideosPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [videos, setVideos] = useState<VideoRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

    useEffect(() => {
        // We fetch everything to have live counts for tabs, but filter client-side
        const q = query(collection(db, 'videos'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoRequest));
            // Sort by createdAt desc
            list.sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            });
            setVideos(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleApprove = async (videoId: string) => {
        const video = videos.find(v => v.id === videoId);
        if (!video) return;

        try {
            // 1. Update video doc
            await updateDoc(doc(db, 'videos', videoId), {
                admin_status: 'approved',
                is_live: true,
                published_at: serverTimestamp(),
                approvedBy: user?.uid
            });

            // 2. Update user doc
            await updateDoc(doc(db, 'users', video.userId), {
                profile_status: 'active',
                video_upload_enabled: true
            });

            // 3. Write notification
            await addDoc(collection(db, 'notifications'), {
                userId: video.userId,
                type: 'video_approved',
                title: 'Video Approved',
                message: 'Your introduction video has been approved! Your profile is now live.',
                read: false,
                createdAt: serverTimestamp()
            });

            // 4. Write activity log
            await writeActivityLog({
                admin_id: user?.uid || 'system',
                action_type: 'video_approved',
                target_id: videoId,
                target_type: 'video',
                note: `Video approved — ${video.role || 'Job Seeker'}, ${video.industry || 'General'}/${video.subcategory || 'General'}`
            });

            toast('Video approved successfully', 'success');
        } catch (err) {
            console.error(err);
            toast('Failed to approve video', 'error');
        }
    };

    const handleReject = async (videoId: string, reason: string) => {
        const video = videos.find(v => v.id === videoId);
        if (!video) return;

        try {
            // 1. Update video doc
            await updateDoc(doc(db, 'videos', videoId), {
                admin_status: 'rejected',
                is_live: false,
                rejection_reason: reason,
                rejectedBy: user?.uid
            });

            // 2. Update user doc
            await updateDoc(doc(db, 'users', video.userId), {
                profile_status: 'incomplete', // Allow them to re-upload but profile isn't active
                video_upload_enabled: true
            });

            // 3. Write notification
            await addDoc(collection(db, 'notifications'), {
                userId: video.userId,
                type: 'video_rejected',
                title: 'Video Rejected',
                message: `Your video was rejected: ${reason}. Please upload a new one.`,
                read: false,
                createdAt: serverTimestamp()
            });

            // 4. Write activity log
            await writeActivityLog({
                admin_id: user?.uid || 'system',
                action_type: 'video_rejected',
                target_id: videoId,
                target_type: 'video',
                note: `Video rejected: ${reason}`
            });

            toast('Video rejected', 'info');
        } catch (err) {
            console.error(err);
            toast('Failed to reject video', 'error');
        }
    };

    const counts = {
        all: videos.length,
        pending: videos.filter(v => v.admin_status === 'pending').length,
        approved: videos.filter(v => v.admin_status === 'approved').length,
        rejected: videos.filter(v => v.admin_status === 'rejected').length,
    };

    const filteredVideos = videos.filter(v => filter === 'all' || v.admin_status === filter);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-100 italic font-bold">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                LOADING MODERATION QUEUE...
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tighter">
                    <Video className="w-8 h-8 text-blue-600" />
                    Video Moderation Queue
                </h1>
                <p className="text-slate-500 font-bold">Review and approve candidate introduction videos</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'all', label: 'All', count: counts.all, color: 'slate' },
                    { id: 'pending', label: 'Pending', count: counts.pending, color: 'orange' },
                    { id: 'approved', label: 'Approved', count: counts.approved, color: 'green' },
                    { id: 'rejected', label: 'Rejected', count: counts.rejected, color: 'red' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id as any)}
                        className={`px-5 py-2.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 border-2 ${filter === tab.id
                                ? `bg-slate-900 border-slate-900 text-white shadow-lg`
                                : `bg-white border-slate-100 text-slate-500 hover:border-slate-300`
                            }`}
                    >
                        {tab.label}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {filteredVideos.length === 0 ? (
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                        <CheckCircle className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">No videos found</h3>
                    <p className="text-slate-500 font-bold">You're all caught up! No pending videos to moderate.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
                    {filteredVideos.map(video => (
                        <VideoModerationCard
                            key={video.id}
                            video={video}
                            onApprove={handleApprove}
                            onReject={handleReject}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
