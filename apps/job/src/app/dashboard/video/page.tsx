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

export default function VideoUploadPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    // State
    const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Profile Completion Check State
    const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

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
            if (!snap.empty) {
                const data = snap.docs[0].data();
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
    }, [user?.uid]);

    // 2. Profile Completion Check for Video Gate (Prompt 5)
    useEffect(() => {
        if (!authLoading && user) {
            const missingFields = [];
            if (!user.profile?.fullName && !user.displayName) missingFields.push('fullName');
            if (!user.profile?.phone) missingFields.push('phone');
            if ((user.profile?.bio?.length || 0) < 50) missingFields.push('bio');
            if ((user.profile?.skills?.length || 0) < 3) missingFields.push('skills');

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

            // Duration check would be async, but for now we trust the user or check after upload
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            setError(null);
        }
    };

    // Handle Recorded Video Process
    useEffect(() => {
        if (recordedChunks.length > 0 && !isRecording) {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const recordedFile = new File([blob], "recorded-video.webm", { type: 'video/webm' });
            setFile(recordedFile);
            setPreviewUrl(URL.createObjectURL(blob));
        }
    }, [recordedChunks, isRecording]);


    const handleUpload = async () => {

        if (!file || !user) return;

        try {
            setUploading(true);
            setError(null);

            // 0. Double-Check Monthly Limit (Strictness)
            if (!canUpload) {
                throw new Error(`Strict Limit: You must wait ${cooldownRemaining} more days before replacing your video.`);
            }

            // 1. Upload to Cloudinary using the standardized service
            const result = await uploadToCloudinary(
                file,
                'khanhub/videos',
                (progress) => {
                    setUploadProgress(progress.percentage);
                }
            );

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
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const videoRef = await addDoc(collection(db, 'videos'), videoData);

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

    // Profile Gate (Prompt 5)
    if (isProfileIncomplete) {
        return <ProfileGate user={user} onComplete={() => setIsProfileIncomplete(false)} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto italic">
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

                {/* Current Video Display (If exists) */}
                {user.profile?.videoResume && !success && (
                    <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm overflow-hidden relative">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="w-full md:w-72 aspect-video bg-black rounded-2xl overflow-hidden shadow-lg border-2 border-slate-50 relative group">
                                    <video
                                        src={user.profile.videoResume}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play className="w-10 h-10 text-white fill-white" />
                                    </div>
                                    <a
                                        href={user.profile.videoResume}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute inset-0 z-10"
                                    />
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
                                            onClick={() => window.open(user.profile.videoResume, '_blank')}
                                            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-white" /> Watch Full
                                        </button>
                                        {!canUpload && cooldownRemaining !== null && (
                                            <span className="text-orange-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5" /> Next update in {cooldownRemaining} days
                                            </span>
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
                                    disabled={!canUpload}
                                    className={`flex-1 py-4 rounded-3xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'upload'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                        } ${!canUpload ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Upload
                                </button>
                                <button
                                    onClick={() => { setActiveTab('record'); reset(); }}
                                    disabled={!canUpload}
                                    className={`flex-1 py-4 rounded-3xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'record'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                        } ${!canUpload ? 'opacity-50 cursor-not-allowed' : ''}`}
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

                                {!canUpload && cooldownRemaining !== null && (
                                    <div className="mb-6 p-6 bg-orange-50 text-orange-700 rounded-3xl border border-orange-100 flex flex-col items-center text-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-orange-500">
                                            <Clock className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black uppercase tracking-tighter italic">Monthly Limit Reached</h4>
                                            <p className="text-sm font-bold opacity-80">
                                                You can only upload one video per month.
                                                Please wait <span className="text-orange-950 px-2 py-0.5 bg-orange-200/50 rounded-lg">{cooldownRemaining} days</span> before your next update.
                                            </p>
                                        </div>
                                        <Link href="/dashboard" className="text-xs font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 underline underline-offset-4">
                                            Back to Dashboard
                                        </Link>
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
                                                    onClick={handleUpload}
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
        fullName: user?.profile?.fullName || user?.displayName || '',
        phone: user?.profile?.phone || '',
        bio: user?.profile?.bio || '',
        skills: user?.profile?.skills?.join(', ') || ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checklist = [
        { id: 'fullName', label: 'Full Name', complete: !!formData.fullName.trim() },
        { id: 'phone', label: 'Phone Number', complete: !!formData.phone.trim() },
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

            const { updateUserProfile } = await import('@/lib/firebase/auth');
            await updateUserProfile(user.uid, {
                profile: {
                    ...user.profile,
                    fullName: formData.fullName.trim(),
                    phone: formData.phone.trim(),
                    bio: formData.bio.trim(),
                    skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean)
                }
            } as any);

            onComplete();
        } catch (err: any) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center animate-in fade-in duration-700">
            <div className="max-w-xl w-full">
                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="p-8 md:p-10">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">Profile Check</h2>
                            <div className="text-right">
                                <span className="text-blue-600 font-black text-xl italic">{Math.round(progress)}%</span>
                                <div className="w-24 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                    <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 rounded-2xl p-6 mb-8 border border-blue-100">
                            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Required for Video Upload</h3>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        placeholder="+92 XXX XXXXXXX"
                                    />
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
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 disabled:opacity-30 disabled:grayscale hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Continue'}
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
