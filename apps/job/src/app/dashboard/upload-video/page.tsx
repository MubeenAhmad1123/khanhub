'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { uploadToCloudinary } from '@/lib/services/cloudinaryUpload';
import { db } from '@/lib/firebase/firebase-config';
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';
import { Loader2, Upload, Video, StopCircle, Play, X, CheckCircle, AlertCircle, Info, ChevronRight, UserCircle, Clock, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { INDUSTRIES, getSubcategories, getRoles } from '@/lib/constants/categories';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export default function VideoUploadPage() {
    const router = useRouter();
    const { user, loading: authLoading, refreshProfile } = useAuth();

    // State
    const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<string>('Preparing upload...');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showWatchModal, setShowWatchModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [liveVideosCount, setLiveVideosCount] = useState(0);
    const [showSecondUpload, setShowSecondUpload] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Profile Completion Check State
    const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

    // Thumbnail State
    const [autoThumbnail, setAutoThumbnail] = useState<string | null>(null);
    const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
    const [uploadedThumbnail, setUploadedThumbnail] = useState<File | null>(null);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const [recordingTime, setRecordingTime] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);
    const [canUpload, setCanUpload] = useState(true);
    const [videoData, setVideoData] = useState<any>(null);

    // Max duration constant (60 seconds)
    const MAX_DURATION = 60;

    // 1. Fetch Video Status & Data
    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, 'videos'),
            where('userId', '==', user.uid),
            where('is_live', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            setLiveVideosCount(snap.docs.length);

            // Check second video slot
            const slotUnlocked = (user as any)?.secondVideoSlotUnlocked === true;
            setShowSecondUpload(slotUnlocked && snap.docs.length < 2);

            if (!snap.empty) {
                const sortedDocs = snap.docs.sort((a, b) => {
                    const timeA = a.data().createdAt?.toMillis() || 0;
                    const timeB = b.data().createdAt?.toMillis() || 0;
                    return timeB - timeA;
                });
                const data = sortedDocs[0].data();
                setVideoData(data);

                // 2. Check Monthly Limit (30 days) - Only if NOT rejected
                if (data.admin_status !== 'rejected') {
                    const lastUpload = data.createdAt;
                    if (lastUpload) {
                        const lastUploadDate = lastUpload.toDate ? lastUpload.toDate() : new Date(lastUpload);
                        const now = new Date();
                        const diffTime = Math.abs(now.getTime() - lastUploadDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays < 30) {
                            setCanUpload(false);
                            setCooldownRemaining(30 - diffDays);
                        } else {
                            setCanUpload(true);
                            setCooldownRemaining(null);
                        }
                    }
                } else {
                    setCanUpload(true);
                    setCooldownRemaining(null);
                }
            } else {
                setVideoData(null);
                setCanUpload(true);
                setCooldownRemaining(null);
            }
        });

        return () => unsubscribe();
    }, [user?.uid, user]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isSecondSlotUnlocked = (user as any)?.secondVideoSlotUnlocked === true;
    const canUploadSecondVideo = isSecondSlotUnlocked && liveVideosCount < 2;
    const shouldShowUploadForm = canUpload || canUploadSecondVideo || showSecondUpload;

    // 2. Profile Completion Check for Video Gate (Prompt 5)
    useEffect(() => {
        if (!authLoading && user) {
            const missingFields: string[] = [];
            // Check flat schema first, then legacy profile
            if (!user.name && !user.displayName && !user.profile?.name && !(user.profile as any)?.fullName) missingFields.push('Full Name');
            if (!user.phone && !user.profile?.phone) missingFields.push('Phone Number');
            if (!user.industry && !(user as any).desiredIndustry && !user.profile?.industry) missingFields.push('Industry');
            if (!(user as any).jobTitle && !(user as any).desiredJobTitle && !user.profile?.desiredJobTitle) missingFields.push('Target Job Title');

            const bio = user.professionalSummary || user.profile?.bio || (user as any).bio || '';
            if (bio.length < 50) missingFields.push('Professional Summary');

            const skills = user.skills || user.profile?.skills || [];
            if (skills.length < 1) missingFields.push('At least 1 Skill');

            setIsProfileIncomplete(missingFields.length > 0);
        }
    }, [user, authLoading]);


    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            if (activeTab === 'record') {
                setError(null);
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Could not access camera/microphone. Please check permissions.');
        }
    }, [activeTab]);

    const stopRecording = useCallback(() => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            stopStream();
        }
    }, [mediaRecorder, isRecording, stopStream]);

    // Cleanup stream on unmount
    useEffect(() => {
        return () => {
            stopStream();
        };
    }, [stopStream]);

    // Timer effect for limit enforcement
    useEffect(() => {
        if (isRecording && recordingTime >= MAX_DURATION) {
            stopRecording();
            setError("Maximum duration of 1 minute reached.");
        }
    }, [isRecording, recordingTime, stopRecording]);

    const startRecording = useCallback(() => {
        if (!streamRef.current) return;

        const recorder = new MediaRecorder(streamRef.current);
        setMediaRecorder(recorder);
        setRecordedChunks([]);
        setRecordingTime(0);

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                setRecordedChunks((prev) => [...prev, e.data]);
            }
        };

        recorder.start();
        setIsRecording(true);

        timerRef.current = setInterval(() => {
            setRecordingTime((prev) => prev + 1);
        }, 1000);
    }, []); // Note: Removed isRecording dependency as it was unnecessary

    const generateThumbnail = useCallback((url: string, time: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = url;
            video.crossOrigin = 'anonymous';
            video.muted = true;
            video.playsInline = true;

            video.addEventListener('loadeddata', () => {
                video.currentTime = Math.min(time, video.duration);
            });

            video.addEventListener('seeked', () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 1280;
                canvas.height = video.videoHeight || 720;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.85));
                } else {
                    reject(new Error('Canvas context not found'));
                }
            });

            video.addEventListener('error', (e) => reject(e));
        });
    }, []);

    // Handle File Selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];

            // Validate Size (100MB)
            if (selectedFile.size > 100 * 1024 * 1024) {
                setError('File size too large. Max 100MB allowed.');
                return;
            }
            // Validate Type
            if (!selectedFile.type.startsWith('video/')) {
                setError('Invalid file type. Please upload a video.');
                return;
            }

            const url = URL.createObjectURL(selectedFile);
            setFile(selectedFile);
            setPreviewUrl(url);
            setError(null);

            // Auto capture thumbnail
            generateThumbnail(url, 1.0).then(setAutoThumbnail).catch(e => console.error("Thumbnail capture failed:", e));
        }
    };

    // Handle Recorded Video Process
    useEffect(() => {
        if (recordedChunks.length > 0 && !isRecording) {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const recordedFile = new File([blob], "recorded-video.webm", { type: 'video/webm' });
            setFile(recordedFile);
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            generateThumbnail(url, 1.0).then(setAutoThumbnail).catch(e => console.error("Thumbnail capture failed:", e));
        }
    }, [recordedChunks, isRecording, generateThumbnail]);


    const handleUpload = async () => {

        if (!file || !user) return;

        try {
            setUploading(true);
            setUploadStatus('Preparing upload...');
            setError(null);

            // 0. Double-Check Monthly Limit (Strictness)
            if (!canUpload) {
                throw new Error(`Strict Limit: You must wait ${cooldownRemaining} more days before replacing your video.`);
            }

            setUploadStatus('Uploading video...');
            // 1. Upload to Cloudinary using the standardized service
            const result = await uploadToCloudinary(
                file,
                'khanhub/videos',
                (progress) => {
                    setUploadProgress(progress.percentage);
                }
            );

            setUploadStatus('Processing thumbnail...');
            // 1b. Get and upload thumbnail
            const getThumbnailUrl = async (): Promise<string> => {
                try {
                    if (uploadedThumbnail) {
                        return (await uploadToCloudinary(uploadedThumbnail, 'khanhub/images')).secureUrl;
                    }
                    if (selectedThumbnail || autoThumbnail) {
                        const base64 = selectedThumbnail || autoThumbnail;
                        if (base64) {
                            const blob = await fetch(base64).then(r => r.blob());
                            const thumbFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
                            return (await uploadToCloudinary(thumbFile, 'khanhub/images')).secureUrl;
                        }
                    }
                } catch (e) {
                    console.error("Thumbnail upload failed", e);
                }
                return '';
            };
            const thumbnailUrl = await getThumbnailUrl();
            setUploadStatus('Almost done...');

            // 2. Mark previous videos as superseded (Strictness)
            const q = query(collection(db, 'videos'), where('userId', '==', user.uid), where('admin_status', 'in', ['pending', 'approved']));
            const prevVideos = await getDocs(q);
            const batch = writeBatch(db);
            prevVideos.forEach((doc) => {
                batch.update(doc.ref, {
                    admin_status: 'superseded',
                    is_live: false,
                    updatedAt: serverTimestamp()
                });
            });
            await batch.commit();

            // 3. Create Video Document
            const videoData = {
                userId: user.uid,
                userEmail: user.email,
                cloudinaryId: result.publicId,
                cloudinaryUrl: result.secureUrl,
                status: 'pending', // Functional status
                admin_status: 'pending', // Moderation status for admin page
                title: user.role === 'employer' ? 'Company Introduction' : 'Personal Introduction',
                description: user.role === 'employer' ? 'Employer introduction video' : 'Candidate introduction video',
                duration: result.duration || 0,
                format: result.format,
                size: result.bytes,
                type: 'introduction',
                role: user.role || 'candidate',
                industry: (user as any).industry || 'General',
                subcategory: (user as any).subcategory || 'General',
                thumbnailUrl: thumbnailUrl,
                videoIndex: 1,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const videoRef = await addDoc(collection(db, 'videos'), videoData);

            // Add Admin Notification
            await addDoc(collection(db, 'adminNotifications'), {
                type: 'new_video',
                title: 'New Video Needs Review',
                message: `${(user as any)?.displayName || (user as any)?.name || 'A user'} uploaded a new intro video - pending admin approval.`,
                read: false,
                targetId: videoRef.id,
                targetType: 'video',
                createdAt: serverTimestamp()
            });

            // 2b. Cleanup/Supersede old videos (Strictness: Only one active/pending video)
            // Note: We don't delete them for audit/admin history, but we can mark them.
            // In a real production app, we might call a cloud function to delete from Cloudinary.

            if (!result.secureUrl) {
                console.error('[Video Page] Missing URL in result:', result);
                throw new Error('Cloudinary upload succeeded but returned no URL.');
            }

            // 3. Update User Profile
            await updateDoc(doc(db, 'users', user.uid), {
                profile_status: 'video_submitted',
                video_upload_enabled: true,
                'profile.videoResume': result.secureUrl, // Strict replacement of the profile URL
                lastVideoUpload: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // 4. Force status sync for immediate UI update
            if (user) {
                (user as any).profile_status = 'video_submitted';
                (user as any).profile = { ...(user as any).profile, videoResume: result.secureUrl };
            }



            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard');
            }, 2500);

        } catch (err: any) {
            console.error('Upload failed:', err);
            setError(err.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleSecondVideoUpload = async () => {
        if (!file || !user) return;

        try {
            setUploading(true);
            setUploadStatus('Preparing upload...');
            setError(null);

            setUploadStatus('Uploading video...');
            const result = await uploadToCloudinary(
                file,
                'khanhub/videos',
                (progress) => {
                    setUploadProgress(progress.percentage);
                }
            );

            setUploadStatus('Processing thumbnail...');
            const getThumbnailUrl = async (): Promise<string> => {
                try {
                    if (uploadedThumbnail) {
                        return (await uploadToCloudinary(uploadedThumbnail, 'khanhub/images')).secureUrl;
                    }
                    if (selectedThumbnail || autoThumbnail) {
                        const base64 = selectedThumbnail || autoThumbnail;
                        if (base64) {
                            const blob = await fetch(base64).then(r => r.blob());
                            const thumbFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
                            return (await uploadToCloudinary(thumbFile, 'khanhub/images')).secureUrl;
                        }
                    }
                } catch (e) {
                    console.error("Thumbnail upload failed", e);
                }
                return '';
            };
            const thumbnailUrl = await getThumbnailUrl();
            setUploadStatus('Almost done...');

            if (!result.secureUrl) {
                console.error('[Video Page] Missing URL in result:', result);
                throw new Error('Cloudinary upload succeeded but returned no URL.');
            }

            // 1. Create NEW document (not update existing)
            const secondVideoRef = await addDoc(collection(db, 'videos'), {
                userId: user.uid,
                userEmail: user.email,
                cloudinaryId: result.publicId,
                cloudinaryUrl: result.secureUrl,
                status: 'pending',
                admin_status: 'pending',
                title: user.role === 'employer' ? 'Company Introduction 2' : 'Personal Introduction 2',
                description: user.role === 'employer' ? 'Second Employer introduction video' : 'Second Candidate introduction video',
                duration: result.duration || 0,
                format: result.format,
                size: result.bytes,
                type: 'introduction',
                role: user.role || 'candidate',
                industry: (user as any).industry || 'General',
                subcategory: (user as any).subcategory || 'General',
                thumbnailUrl: thumbnailUrl,
                videoIndex: 2,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Add Admin Notification
            await addDoc(collection(db, 'adminNotifications'), {
                type: 'new_video',
                title: 'New Video Needs Review',
                message: `${(user as any)?.displayName || (user as any)?.name || 'A user'} uploaded a second intro video - pending admin approval.`,
                read: false,
                targetId: secondVideoRef.id,
                targetType: 'video',
                createdAt: serverTimestamp()
            });

            // 2. Consume the slot
            await updateDoc(doc(db, 'users', user.uid), {
                secondVideoSlotUnlocked: false,
                updatedAt: serverTimestamp(),
            });

            // 3. Update local state
            setShowSecondUpload(false);
            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard/profile');
            }, 2500);

        } catch (err: any) {
            console.error('Second upload failed:', err);
            setError(err.message || 'Secondary upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setPreviewUrl(null);
        setRecordedChunks([]);
        setError(null);
        setRecordingTime(0);
        if (activeTab === 'record') {
            startCamera();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (authLoading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin text-blue-600 h-12 w-12" /></div>;

    if (!user) {
        router.push('/auth/login');
        return null;
    }

    if (!mounted) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-24">
            <Loader2 className="animate-spin text-blue-600 h-12 w-12" />
        </div>
    );

    // Profile Gate (Prompt 5)
    if (isProfileIncomplete) {
        return <ProfileGate user={user} onComplete={() => { refreshProfile(); setIsProfileIncomplete(false); }} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto italic">
                {showWatchModal && user.profile?.videoResume && (
                    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-300">
                        <div className="flex justify-end p-6">
                            <button onClick={() => setShowWatchModal(false)} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 flex items-center justify-center p-4">
                            <video src={user.profile.videoResume} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl" />
                        </div>
                    </div>
                )}

                {showPaymentModal && (
                    <PaymentModal
                        user={user}
                        onClose={() => setShowPaymentModal(false)}
                        onSuccess={() => {
                            setShowPaymentModal(false);
                            alert("Payment submitted for admin approval! You will be notified when the second slot activates.");
                        }}
                    />
                )}

                {/* Header Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4">
                        <Video className="w-3 h-3" />
                        Video Profile setup
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 leading-none tracking-tighter italic">
                        {user.role === 'employer' ? 'Introduce Your Company' : 'Show Your True Self'}
                    </h1>
                    <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">
                        Traditional resumes are boring. Let recruiters see your passion, skills, and personality in action.
                    </p>
                </div>

                {/* Empty State representing NO video */}
                {!user.profile?.videoResume && !success && (
                    <div className="mb-12 bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-[2.5rem] p-8 border border-blue-100/50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 text-center">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 shadow-inner">
                            <Video className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-3 italic tracking-tight">Your profile has no video yet</h3>
                        <p className="text-slate-500 font-medium max-w-md mx-auto text-sm leading-relaxed">
                            Profiles with videos get <span className="font-bold text-slate-700">10x more views</span> from employers. Upload yours now — it only takes a minute.
                        </p>
                    </div>
                )}

                {/* Current Video Display (If exists) */}
                {user.profile?.videoResume && !success && (
                    <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm overflow-hidden relative">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="w-full md:w-72 aspect-video bg-black rounded-2xl overflow-hidden shadow-lg border-2 border-slate-50 relative group cursor-pointer" onClick={() => setShowWatchModal(true)}>
                                    <video
                                        src={user.profile.videoResume}
                                        className="w-full h-full object-cover"
                                        poster={videoData?.thumbnailUrl || ''}
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play className="w-10 h-10 text-white fill-white" />
                                    </div>
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                                        {videoData?.admin_status === 'approved' && (
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                                                ✅ Approved
                                            </span>
                                        )}
                                        {videoData?.admin_status === 'pending' && (
                                            <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-black uppercase tracking-widest">
                                                🕒 Pending Review
                                            </span>
                                        )}
                                        {videoData?.admin_status === 'rejected' && (
                                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest">
                                                ❌ Rejected
                                            </span>
                                        )}
                                        <span className="text-slate-300 text-xs">|</span>
                                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Introduction Video</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-2 italic tracking-tight">Your Current Video</h3>

                                    <div className="mb-6">
                                        {videoData?.admin_status === 'approved' && (
                                            <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                                Recruiters can see this video when they view your profile. It's your digital handshake!
                                            </p>
                                        )}
                                        {videoData?.admin_status === 'pending' && (
                                            <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                                Your video is currently under review by our team. This usually takes under 30 minutes. Once approved, it will be visible to employers.
                                            </p>
                                        )}
                                        {videoData?.admin_status === 'rejected' && (
                                            <div className="space-y-2">
                                                <p className="text-red-600 text-sm font-bold leading-relaxed">
                                                    Your video was not approved for the following reason:
                                                </p>
                                                <p className="bg-red-50 p-3 rounded-xl text-red-700 text-xs italic border border-red-100">
                                                    "{videoData?.rejection_reason || 'Video does not meet our quality guidelines.'}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                        <button
                                            onClick={() => setShowWatchModal(true)}
                                            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-white" /> Watch Full
                                        </button>
                                        {!canUpload && cooldownRemaining !== null && (
                                            <div className="group relative">
                                                <span className="text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 cursor-help">
                                                    <Clock className="w-3.5 h-3.5" /> COOLDOWN: {cooldownRemaining} DAYS LEFT
                                                </span>
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all text-center font-medium z-50">
                                                    You can replace this video after the cooldown expires. Or add a second video for PKR 1,000.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                            {/* Tab Selection */}
                            <div className="flex p-2 bg-slate-50/50">
                                <button
                                    onClick={() => { setActiveTab('upload'); reset(); stopStream(); }}
                                    disabled={!shouldShowUploadForm}
                                    className={`flex-1 py-4 rounded-3xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'upload'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                        } ${!shouldShowUploadForm ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Upload
                                </button>
                                <button
                                    onClick={() => { setActiveTab('record'); reset(); }}
                                    disabled={!shouldShowUploadForm}
                                    className={`flex-1 py-4 rounded-3xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'record'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                        } ${!shouldShowUploadForm ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Record
                                </button>
                            </div>

                            <div className="p-8">
                                {error && (
                                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-bold border border-red-100">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                {showSecondUpload && (
                                    <div className="mb-6 bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-6 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-2xl flex-shrink-0">
                                            🎉
                                        </div>
                                        <div>
                                            <h3 className="font-black text-emerald-800 uppercase tracking-tight text-lg">
                                                Second Video Slot Active!
                                            </h3>
                                            <p className="text-emerald-700 font-bold text-sm">
                                                Upload your second video below. Both videos will appear on your public profile for employers to see.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {!canUpload && !showSecondUpload && cooldownRemaining !== null && (
                                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        {/* Option A */}
                                        <div className="bg-orange-50 text-orange-800 rounded-3xl p-6 border border-orange-100 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Clock className="w-5 h-5 text-orange-500" />
                                                    <h4 className="text-lg font-black uppercase tracking-tighter italic">Update Your Video</h4>
                                                </div>
                                                <p className="text-xs font-medium mb-4">
                                                    Replace your current video after the cooldown period.
                                                </p>
                                                <div className="inline-block px-3 py-1.5 bg-orange-100/50 rounded-lg text-[10px] font-black uppercase tracking-widest text-orange-600 mb-6 border border-orange-200/50">
                                                    ⏳ Available in {cooldownRemaining} days
                                                </div>
                                            </div>
                                            <button onClick={() => alert('We will notify you when you can update')} className="w-full py-3 bg-white text-orange-600 rounded-xl text-xs font-black uppercase tracking-widest border border-orange-200 hover:bg-orange-50 transition-colors shadow-sm focus:outline-none">
                                                Reminder me
                                            </button>
                                        </div>

                                        {/* Option B */}
                                        <div className="bg-blue-600 text-white rounded-3xl p-6 shadow-xl shadow-blue-500/20 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Video className="w-5 h-5 text-blue-200" />
                                                    <h4 className="text-lg font-black uppercase tracking-tighter italic">Add a Second Video</h4>
                                                </div>
                                                <p className="text-xs font-medium text-blue-100 mb-4 leading-relaxed">
                                                    Show employers TWO sides of you. Both videos will appear on your profile.
                                                </p>
                                                <div className="inline-block px-3 py-1.5 bg-blue-500/50 rounded-lg text-[10px] font-black uppercase tracking-widest text-white mb-6 border border-blue-400/50">
                                                    PKR 1,000 Fee For Video Upload
                                                </div>
                                            </div>
                                            <button onClick={() => setShowPaymentModal(true)} className="w-full py-3 bg-white text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg focus:outline-none">
                                                Upload Second Video →
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {success ? (
                                    <div className="text-center py-16 animate-in zoom-in-95 duration-500">
                                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600 border-4 border-white shadow-xl">
                                            <CheckCircle className="w-12 h-12" />
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-900 mb-2">Video Submitted!</h3>
                                        <p className="text-slate-500 font-medium">Your profile is being updated. Redirecting to dashboard...</p>
                                    </div>
                                ) : (
                                    <>
                                        {!file ? (
                                            <>
                                                {activeTab === 'upload' ? (
                                                    <div className="group relative border-2 border-dashed border-slate-200 rounded-[2rem] p-16 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer">
                                                        <input
                                                            type="file"
                                                            accept="video/*"
                                                            onChange={handleFileChange}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        />
                                                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500 group-hover:scale-110 transition-transform">
                                                            <Upload className="w-10 h-10" />
                                                        </div>
                                                        <h3 className="text-xl font-bold text-slate-900 mb-2">Select a video file</h3>
                                                        <p className="text-slate-400 font-medium mb-4">Drag and drop or click to browse</p>
                                                        <div className="inline-flex items-center gap-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                                                            <span>MP4, WebM</span>
                                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                            <span>Max 100MB</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6">
                                                        {/* Privacy Warning Banner */}
                                                        <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3">
                                                            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                                            <p className="text-orange-800 text-[11px] font-bold leading-relaxed uppercase tracking-wide">
                                                                Important: Do not mention your phone number, email, or exact location in your video. This is for your privacy and safety.
                                                            </p>
                                                        </div>

                                                        <div className="relative aspect-video bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white">
                                                            <video
                                                                ref={videoRef}
                                                                autoPlay
                                                                muted
                                                                playsInline
                                                                className="w-full h-full object-cover"
                                                            />

                                                            {!streamRef.current && (
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-all">
                                                                    <button
                                                                        onClick={startCamera}
                                                                        className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-2xl active:scale-95 transition-all"
                                                                    >
                                                                        <Video className="w-5 h-5" />
                                                                        Enable Camera
                                                                    </button>
                                                                    <p className="text-white/60 text-xs font-bold mt-4 uppercase tracking-widest">Permissions required to record</p>
                                                                </div>
                                                            )}

                                                            {isRecording && (
                                                                <div className="absolute top-6 right-6 flex items-center gap-3 bg-red-600 text-white px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg animate-pulse">
                                                                    <div className="w-2 h-2 bg-white rounded-full" />
                                                                    Recording {formatTime(recordingTime)} / 01:00
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex justify-center">
                                                            {streamRef.current && (
                                                                !isRecording ? (
                                                                    <button
                                                                        onClick={startRecording}
                                                                        className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-red-500/30 hover:scale-110 active:scale-95 transition-all border-4 border-white"
                                                                    >
                                                                        <div className="w-8 h-8 bg-white rounded-full" />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={stopRecording}
                                                                        className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-red-600 shadow-2xl hover:scale-110 active:scale-95 transition-all border-4 border-red-600"
                                                                    >
                                                                        <StopCircle className="w-10 h-10" />
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                                                <div className="relative aspect-video bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white group">
                                                    <video
                                                        src={previewUrl!}
                                                        controls
                                                        className="w-full h-full"
                                                    />
                                                    <button
                                                        onClick={reset}
                                                        className="absolute top-4 right-4 p-3 bg-red-500 text-white rounded-2xl shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 active:scale-95"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={showSecondUpload ? handleSecondVideoUpload : handleUpload}
                                                    disabled={uploading}
                                                    className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black text-lg uppercase tracking-widest transition-all shadow-xl shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-4 active:scale-[0.98]"
                                                >
                                                    {uploading ? (
                                                        <>
                                                            <Loader2 className="w-6 h-6 animate-spin" />
                                                            Sending to Cloud {uploadProgress}%
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="w-6 h-6" />
                                                            Confirm & Upload
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Guidelines Sidebar */}
                    <div className="space-y-6">
                        {/* What to Include Card */}
                        <div className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                            <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6">What to Include?</h3>
                            <ul className="space-y-4">
                                {user.role === 'employer' ? (
                                    <>
                                        <li className="flex gap-3 text-sm font-medium text-slate-300">
                                            <span className="text-blue-500 font-black">01</span>
                                            Your company's mission and core values.
                                        </li>
                                        <li className="flex gap-3 text-sm font-medium text-slate-300">
                                            <span className="text-blue-500 font-black">02</span>
                                            What a day in your office looks like.
                                        </li>
                                        <li className="flex gap-3 text-sm font-medium text-slate-300">
                                            <span className="text-blue-500 font-black">03</span>
                                            The kind of talent you're looking for.
                                        </li>
                                    </>
                                ) : (
                                    <>
                                        <li className="flex gap-3 text-sm font-medium text-slate-300">
                                            <span className="text-blue-500 font-black">01</span>
                                            A friendly "Hello" and your name.
                                        </li>
                                        <li className="flex gap-3 text-sm font-medium text-slate-300">
                                            <span className="text-blue-500 font-black">02</span>
                                            Your top skill or biggest achievement.
                                        </li>
                                        <li className="flex gap-3 text-sm font-medium text-slate-300">
                                            <span className="text-blue-500 font-black">03</span>
                                            Why you're passionate about your field.
                                        </li>
                                    </>
                                )}
                            </ul>
                        </div>

                        {/* Constraints Card */}
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Constraints</h3>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                                        <StopCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase">Under 1 Minute</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Be concise and impactful</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                                        <Info className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase">Professional</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Good lighting & clear audio</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase">1 Upload Monthly</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Re-upload anytime if rejected — no extra charge</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Why Video Card */}
                        <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-lg shadow-blue-500/20">
                            <h3 className="text-xs font-black uppercase tracking-widest mb-4 opacity-70">Insider Tip</h3>
                            <p className="text-sm font-bold leading-relaxed mb-6">Profiles with a video introduction receive on average 10x more profile visits and responses.</p>
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-black italic">10X</span>
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Profile Gate Sub-component (Prompt 5)
function ProfileGate({ user, onComplete }: { user: any, onComplete: () => void }) {
    const [formData, setFormData] = useState({
        fullName: user?.name || user?.displayName || '',
        phone: user?.phone || '',
        bio: user?.professionalSummary || '',
        skills: (user?.skills || []).join(', ') || '',
        industry: user?.desiredIndustry || user?.industry || '',
        subcategory: user?.desiredSubcategory || user?.subcategory || '',
        jobTitle: user?.desiredJobTitle || '',
        totalExperience: user?.careerLevel || user?.totalExperience || '',
        desiredSalary: user?.desiredSalary || '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checklist = [
        { id: 'fullName', label: 'Full Name', complete: !!formData.fullName.trim() },
        { id: 'phone', label: 'Phone Number', complete: !!formData.phone.trim() },
        { id: 'industry', label: 'Industry', complete: !!formData.industry },
        { id: 'jobTitle', label: 'Job Title', complete: !!formData.jobTitle },
        { id: 'bio', label: 'Biography (50+ chars)', complete: formData.bio.trim().length >= 50 },
        { id: 'skills', label: 'At least 3 Skills', complete: formData.skills.split(',').filter(s => s.trim()).length >= 3 }
    ];

    const completedCount = checklist.filter(i => i.complete).length;
    const progress = (completedCount / checklist.length) * 100;
    const isReady = completedCount === checklist.length;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isReady) return;

        try {
            setSaving(true);
            setError(null);

            const { doc, setDoc } = await import('firebase/firestore');
            const { updateProfile: firebaseUpdateProfile } = await import('firebase/auth');
            const { auth, db } = await import('@/lib/firebase/firebase-config');

            // 1. Update Firestore Profile using setDoc with merge: true directly
            await setDoc(doc(db, 'users', user.uid), {
                displayName: formData.fullName.trim(),
                name: formData.fullName.trim(),
                phone: formData.phone.trim(),
                professionalSummary: formData.bio.trim(),
                skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
                industry: formData.industry,
                desiredIndustry: formData.industry,
                subcategory: formData.subcategory,
                desiredSubcategory: formData.subcategory,
                desiredJobTitle: formData.jobTitle,
                totalExperience: formData.totalExperience,
                desiredSalary: formData.desiredSalary,
                updatedAt: new Date()
            }, { merge: true });

            // 2. Update Firebase Auth displayName (for navbar and greeting consistency)
            if (auth.currentUser) {
                await firebaseUpdateProfile(auth.currentUser, {
                    displayName: formData.fullName.trim()
                });
            }

            onComplete();
        } catch (err: any) {
            console.error('ProfileGate submit error:', err);
            setError(err.message || 'Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center animate-in fade-in duration-700">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="p-8 md:p-10">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">Professional Setup</h2>
                            <div className="text-right">
                                <span className="text-blue-600 font-black text-xl italic">{Math.round(progress)}%</span>
                                <div className="w-24 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                    <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 rounded-2xl p-6 mb-8 border border-blue-100">
                            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Finalizing Profile</h3>
                            <ul className="grid grid-cols-2 gap-3">
                                {checklist.map(item => (
                                    <li key={item.id} className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-4 h-4 rounded-full flex items-center justify-center border transition-colors",
                                            item.complete ? "bg-green-500 border-green-500 text-white" : "bg-white border-slate-200"
                                        )}>
                                            {item.complete && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase tracking-tight",
                                            item.complete ? "text-slate-900" : "text-slate-400"
                                        )}>{item.label}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-50 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="03XXXXXXXXX"
                                        className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-50 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Industry</label>
                                    <SearchableSelect
                                        options={INDUSTRIES.map(i => ({ id: i.id, label: i.label }))}
                                        value={formData.industry}
                                        onChange={(val) => {
                                            handleSelectChange('industry', val);
                                            handleSelectChange('subcategory', '');
                                            handleSelectChange('jobTitle', '');
                                        }}
                                        placeholder="Select Industry..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Category</label>
                                    <SearchableSelect
                                        options={getSubcategories(formData.industry).map(s => ({ id: s.id, label: s.label }))}
                                        value={formData.subcategory}
                                        onChange={(val) => {
                                            handleSelectChange('subcategory', val);
                                            handleSelectChange('jobTitle', '');
                                        }}
                                        placeholder="Select category..."
                                        disabled={!formData.industry}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desired Job Title</label>
                                    <SearchableSelect
                                        options={getRoles(formData.industry, formData.subcategory).map(r => ({ id: r, label: r }))}
                                        value={formData.jobTitle}
                                        onChange={(val) => handleSelectChange('jobTitle', val)}
                                        placeholder="Select job title..."
                                        disabled={!formData.subcategory}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Experience</label>
                                    <select
                                        className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-50 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900 text-xs"
                                        value={formData.totalExperience}
                                        onChange={e => setFormData({ ...formData, totalExperience: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Range</option>
                                        <option value="Fresher / 0-1 Year">Fresher / 0-1 Year</option>
                                        <option value="1-3 Years">1-3 Years</option>
                                        <option value="3-5 Years">3-5 Years</option>
                                        <option value="5-10 Years">5-10 Years</option>
                                        <option value="10+ Years">10+ Years</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Bio (Internal Pitch)</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    rows={3}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none"
                                    placeholder="Briefly describe your expertise (min 50 characters)..."
                                />
                                <div className="flex justify-between mt-1">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{formData.bio.length} characters</span>
                                    {formData.bio.length < 50 && <span className="text-[9px] text-orange-500 font-black uppercase">Min 50 required</span>}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Skills (Comma separated)</label>
                                <input
                                    type="text"
                                    value={formData.skills}
                                    onChange={e => setFormData({ ...formData, skills: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                    placeholder="React, Next.js, TypeScript..."
                                />
                                <div className="flex justify-between mt-1">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{formData.skills.split(',').filter(s => s.trim()).length} skills added</span>
                                    {formData.skills.split(',').filter(s => s.trim()).length < 3 && <span className="text-[9px] text-orange-500 font-black uppercase">Min 3 required</span>}
                                </div>
                            </div>

                            {error && (
                                <p className="text-red-500 text-[10px] font-black uppercase text-center">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={!isReady || saving}
                                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 disabled:opacity-30 disabled:grayscale hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Continue to Video'}
                                {!saving && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </form>
                    </div>

                    <div className="bg-orange-50 p-8 border-t border-orange-100">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm flex-shrink-0">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1">Your Privacy Matters</h3>
                                <p className="text-[11px] text-orange-800 font-bold leading-relaxed uppercase tracking-wide">
                                    Only your Industry and Role are public. Contact details like Phone and precise Bio are only visible after you mutually connect with an employer.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PaymentModal({
    user,
    onClose,
    onSuccess
}: {
    user: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [notes, setNotes] = useState(`Full Name: ${user.name || user.displayName || ''}\nUID: ${user.uid}`);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        try {
            setLoading(true);
            const { secureUrl } = await uploadToCloudinary(file, 'khanhub/payments', () => { });

            await addDoc(collection(db, 'payments'), {
                userId: user.uid,
                userName: user.name || user.displayName || '',
                userEmail: user.email,
                type: 'second_video_slot',
                amount: 1000,
                status: 'pending',
                screenshotUrl: secureUrl,
                notes: notes,
                createdAt: serverTimestamp()
            });

            onSuccess();
        } catch (err) {
            console.error(err);
            alert('Failed to submit payment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-black italic tracking-tighter text-slate-900">Unlock Second Video</h3>
                    <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 md:p-8 overflow-y-auto max-h-[80vh]">
                    <div className="flex items-center justify-between mb-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                        <div className="text-sm font-bold text-blue-900">Total Amount</div>
                        <div className="text-2xl font-black text-blue-600">PKR 1,000</div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Bank Details</h4>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Bank Name</p>
                                    <p className="text-sm font-black text-slate-900">Meezan Bank Limited</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Account Title</p>
                                    <p className="text-sm font-black text-slate-900">KhanHub Services</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Account Number</p>
                                    <p className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block select-all tracking-wider font-mono mt-1">
                                        02140101837493
                                    </p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Upload Screenshot</label>
                                <input
                                    type="file"
                                    required
                                    accept="image/*"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="w-full text-sm font-bold text-slate-600 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-all focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Notes</label>
                                <textarea
                                    rows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !file}
                                className="w-full py-5 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit for Approval →'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ThumbnailSelector({
    previewUrl,
    autoThumbnail,
    selectedThumbnail,
    setSelectedThumbnail,
    uploadedThumbnail,
    setUploadedThumbnail,
}: {
    previewUrl: string | null;
    autoThumbnail: string | null;
    selectedThumbnail: string | null;
    setSelectedThumbnail: (t: string | null) => void;
    uploadedThumbnail: File | null;
    setUploadedThumbnail: (f: File | null) => void;
}) {
    const [tab, setTab] = useState<'pick' | 'upload'>('pick');
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScrubbing, setIsScrubbing] = useState(false);

    useEffect(() => {
        if (videoRef.current && previewUrl) {
            videoRef.current.onloadedmetadata = () => {
                setDuration(videoRef.current?.duration || 0);
            };
        }
    }, [previewUrl]);

    const drawFrameToCanvas = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                canvasRef.current.width = videoRef.current.videoWidth || 1280;
                canvasRef.current.height = videoRef.current.videoHeight || 720;
                ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
    }, []);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
    };

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const onSeeked = () => {
            drawFrameToCanvas();
        };
        v.addEventListener('seeked', onSeeked);
        return () => v.removeEventListener('seeked', onSeeked);
    }, [drawFrameToCanvas]);


    const handleSetThumbnail = () => {
        if (canvasRef.current) {
            setSelectedThumbnail(canvasRef.current.toDataURL('image/jpeg', 0.85));
            setUploadedThumbnail(null); // Clear upload if picking frame
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedThumbnail(e.target.files[0]);
            setSelectedThumbnail(null); // Clear picked frame if uploading
        }
    };

    if (!previewUrl) return null;

    return (
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm animate-in fade-in zoom-in-95 duration-500">
            <h3 className="text-lg font-black text-slate-900 mb-4 italic uppercase tracking-tighter">Thumbnail</h3>

            <div className="flex gap-2 mb-6 p-1 bg-slate-200/50 rounded-xl">
                <button
                    onClick={() => setTab('pick')}
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${tab === 'pick' ? 'bg-white text-blue-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Pick a Frame
                </button>
                <button
                    onClick={() => setTab('upload')}
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${tab === 'upload' ? 'bg-white text-blue-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Upload Image
                </button>
            </div>

            {tab === 'pick' && (
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                            <video
                                ref={videoRef}
                                src={previewUrl}
                                className="hidden"
                                preload="metadata"
                            />
                            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-inner border-2 border-slate-200 relative group">
                                <canvas ref={canvasRef} className="w-full h-full object-cover" />
                                {!isScrubbing && !selectedThumbnail && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-[10px] font-black text-white tracking-widest uppercase bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur">Drag scrubber</p>
                                    </div>
                                )}
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={duration}
                                step={0.1}
                                value={currentTime}
                                onChange={handleSeek}
                                onMouseDown={() => setIsScrubbing(true)}
                                onTouchStart={() => setIsScrubbing(true)}
                                onMouseUp={() => setIsScrubbing(false)}
                                onTouchEnd={() => setIsScrubbing(false)}
                                className="w-full accent-blue-600"
                            />
                        </div>
                        <div className="md:w-48 flex flex-col justify-center gap-4">
                            <button
                                onClick={handleSetThumbnail}
                                disabled={!currentTime}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95 disabled:opacity-50"
                            >
                                Set as Thumbnail →
                            </button>
                            {selectedThumbnail && (
                                <div className="px-3 py-2 bg-green-50 text-green-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-green-100">
                                    <CheckCircle className="w-4 h-4" /> Thumbnail Set
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {tab === 'upload' && (
                <div className="space-y-4">
                    <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group">
                        <input
                            type="file"
                            accept="image/jpeg, image/png, image/webp"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3 group-hover:text-blue-500 transition-colors group-hover:scale-110" />
                        <p className="text-sm font-bold text-slate-600">Drop your thumbnail here or click to browse</p>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-2">JPEG, PNG, WebP (Max 2MB)</p>
                    </div>
                    {uploadedThumbnail && (
                        <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <div className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={URL.createObjectURL(uploadedThumbnail)} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-slate-100 shadow-sm" />
                                <div className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{uploadedThumbnail.name}</div>
                            </div>
                            <button onClick={() => setUploadedThumbnail(null)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
