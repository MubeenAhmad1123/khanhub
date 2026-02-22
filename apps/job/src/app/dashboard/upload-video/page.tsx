'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { uploadVideoToCloudinary } from '@/lib/services/cloudinary';
import { db } from '@/lib/firebase/firebase-config';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Loader2, Upload, Video, StopCircle, Play, X, CheckCircle, AlertCircle, ArrowRight, LockKeyhole, CreditCard } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function UploadVideoPage() {
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

    // Profile Completion Check
    const requiredFields = {
        name: user?.displayName,
        phone: (user as any)?.phone || user?.profile?.phone,
        location: (user as any)?.location || user?.profile?.location,
        industry: user?.industry || (user?.profile as any)?.industry,
        subcategory: (user as any)?.subcategory || user?.profile?.preferredSubcategory,
        role: (user as any)?.role_in_category || user?.profile?.preferredJobTitle
    };

    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1));

    const isProfileIncomplete = missingFields.length > 0;

    // Payment Gate Check
    // A user is considered paid if paymentApproved === true OR paymentStatus === 'approved'
    const hasPaid = !!(user?.paymentApproved || (user as any)?.paymentStatus === 'approved');

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const [recordingTime, setRecordingTime] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Auth & Permission Check
    useEffect(() => {
        if (!authLoading && user) {
            if (!user.video_upload_enabled) {
                router.push('/dashboard/video-payment');
            }
        }
    }, [user, authLoading, router]);

    // Cleanup stream on unmount
    useEffect(() => {
        return () => {
            stopStream();
        };
    }, []);

    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setError(null);
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Could not access camera/microphone. Please check permissions.');
        }
    };

    const startRecording = () => {
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
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            stopStream();
        }
    };

    // Handle File Selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];

            // Validate
            if (selectedFile.size > 100 * 1024 * 1024) { // 100MB
                setError('File size too large. Max 100MB allowed.');
                return;
            }
            if (!selectedFile.type.startsWith('video/')) {
                setError('Invalid file type. Please upload a video.');
                return;
            }

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

            // 1. Upload to Cloudinary
            const result = await uploadVideoToCloudinary(file, (progress) => {
                setUploadProgress(progress.percentage);
            });

            // 2. Create Video Document
            const videoData = {
                userId: user.uid,
                userEmail: user.email,
                cloudinaryId: result.public_id,
                cloudinaryUrl: result.secure_url,
                status: 'pending', // Pending admin approval
                transcriptionStatus: 'pending',
                aiModerationStatus: 'pending',
                title: 'Introduction Video',
                description: 'User introduction video',
                duration: result.duration || 0,
                format: result.format,
                size: result.bytes,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const videoRef = await addDoc(collection(db, 'videos'), videoData);

            // 3. Update User Profile
            await updateDoc(doc(db, 'users', user.uid), {
                profile_status: 'video_submitted', // Or 'video_processing'
                'profile.videoResume': result.secure_url, // Update profile field if exists
                updatedAt: serverTimestamp(),
            });

            // 4. Trigger Transcription (Optional - can be done via Cloud Functions trigger or API call)
            // For now, we'll assume a background process or API call will handle it.
            // But per plan, we need an API route. We will call it here.
            try {
                await fetch('/api/videos/transcribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoId: videoRef.id, videoUrl: result.secure_url }),
                });
            } catch (apiError) {
                console.error('Transcription trigger failed:', apiError);
                // Don't fail the upload if transcription trigger fails, just log it.
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard/profile');
            }, 2000);

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
        if (activeTab === 'record') {
            startCamera();
        }
    };

    if (authLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>;

    if (!user) {
        router.push('/auth/login');
        return null;
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-[#F8FAFF] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black text-slate-900 mb-2 italic uppercase tracking-tighter">Upload Your Introduction</h1>
                    <p className="text-slate-600 font-bold">Introduce yourself to employers in high definition</p>

                    {/* Guidelines Section */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                            <span className="text-xl mb-2">⏱️</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</span>
                            <span className="text-xs font-bold text-slate-700">Max 2 Minutes</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                            <span className="text-xl mb-2">📁</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Size Limit</span>
                            <span className="text-xs font-bold text-slate-700">Under 100MB</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                            <span className="text-xl mb-2">☁️</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Storage</span>
                            <span className="text-xs font-bold text-slate-700">Cloudinary Secure</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-100">
                        <button
                            onClick={() => { setActiveTab('upload'); reset(); stopStream(); }}
                            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'upload'
                                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            <Upload className="w-4 h-4" />
                            Upload Video
                        </button>
                        <button
                            onClick={() => { setActiveTab('record'); reset(); }}
                            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'record'
                                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            <Video className="w-4 h-4" />
                            Record Video
                        </button>
                    </div>

                    <div className="p-8">
                        {/* ====== GATE 1: PAYMENT CHECK ====== */}
                        {!hasPaid ? (
                            <div className="text-center py-12 space-y-8 animate-in fade-in zoom-in duration-500">
                                <div className="w-24 h-24 bg-red-50 rounded-[40px] flex items-center justify-center mx-auto border-4 border-red-100 shadow-xl shadow-red-200/20">
                                    <LockKeyhole className="w-12 h-12 text-red-500" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Registration Fee Required</h3>
                                    <p className="text-slate-500 font-bold max-w-sm mx-auto">
                                        Your account needs to be activated before you can upload or record a video profile.
                                    </p>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 max-w-sm mx-auto text-left">
                                    <div className="flex gap-3 text-amber-800">
                                        <CreditCard className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-black mb-1">One-Time Activation Fee</p>
                                            <p className="font-bold text-2xl text-amber-900 mt-2">PKR 1,000</p>
                                            <p className="text-xs opacity-80 mt-1">Paid once. Unlocks full platform access including video upload.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Link
                                        href="/auth/verify-payment"
                                        className="inline-flex items-center gap-2 px-10 py-5 bg-[#F97316] hover:opacity-90 text-white font-black italic rounded-[30px] transition-all shadow-xl shadow-orange-500/20 active:scale-95 uppercase tracking-tighter"
                                    >
                                        <CreditCard className="w-5 h-5" />
                                        Pay Registration Fee
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                    <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                                        Payment is reviewed by our team within 24 hours
                                    </p>
                                </div>
                            </div>
                        ) : isProfileIncomplete ? (
                            <div className="text-center py-12 space-y-8 animate-in fade-in zoom-in duration-500">
                                <div className="w-24 h-24 bg-amber-50 rounded-[40px] flex items-center justify-center mx-auto border-4 border-amber-100 shadow-xl shadow-amber-200/20">
                                    <AlertCircle className="w-12 h-12 text-amber-500" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Profile Incomplete</h3>
                                    <p className="text-slate-500 font-bold max-w-sm mx-auto">Please complete these required fields before uploading your video profile:</p>
                                </div>

                                <div className="flex flex-wrap justify-center gap-3">
                                    {missingFields.map(field => (
                                        <div key={field} className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2">
                                            <div className="w-2 h-2 bg-amber-500 rounded-full" />
                                            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{field}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-4">
                                    <Link
                                        href="/dashboard/profile"
                                        className="inline-flex items-center gap-2 px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white font-black italic rounded-[30px] transition-all shadow-xl shadow-blue-500/20 active:scale-95 uppercase tracking-tighter"
                                    >
                                        Complete Profile Now
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                    <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">All basic details are mandatory for verification</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm">
                                        <AlertCircle className="w-5 h-5" />
                                        {error}
                                    </div>
                                )}

                                {success ? (
                                    <div className="text-center py-12">
                                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle className="w-10 h-10 text-green-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">Video Uploaded Successfully!</h3>
                                        <p className="text-slate-600">Your video is being processed and reviewed.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Upload View */}
                                        {activeTab === 'upload' && !file && (
                                            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:bg-slate-50 transition-colors relative cursor-pointer group">
                                                <input
                                                    type="file"
                                                    accept="video/*"
                                                    onChange={handleFileChange}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 group-hover:scale-110 transition-transform">
                                                    <Upload className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 mb-1">Click to upload or drag and drop</h3>
                                                <p className="text-sm text-slate-500">MP4, WebM or MOV (max 100MB)</p>
                                            </div>
                                        )}

                                        {/* Record View */}
                                        {activeTab === 'record' && !file && (
                                            <div className="space-y-6 text-center">
                                                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mx-auto max-w-2xl">
                                                    {/* Camera Preview */}
                                                    <video
                                                        ref={videoRef}
                                                        autoPlay
                                                        muted
                                                        className="w-full h-full object-cover"
                                                    />

                                                    {!streamRef.current && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
                                                            <button
                                                                onClick={startCamera}
                                                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-full font-bold flex items-center gap-2 transition-colors"
                                                            >
                                                                <Video className="w-5 h-5" />
                                                                Start Camera
                                                            </button>
                                                        </div>
                                                    )}

                                                    {isRecording && (
                                                        <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-mono animate-pulse flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-white rounded-full" />
                                                            REC {formatTime(recordingTime)}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex justify-center gap-4">
                                                    {streamRef.current && !isRecording && (
                                                        <button
                                                            onClick={startRecording}
                                                            className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
                                                        >
                                                            <div className="w-6 h-6 bg-white rounded-full" />
                                                        </button>
                                                    )}
                                                    {isRecording && (
                                                        <button
                                                            onClick={stopRecording}
                                                            className="w-16 h-16 bg-white border-4 border-red-600 rounded-full flex items-center justify-center text-red-600 shadow-lg transition-transform hover:scale-110"
                                                        >
                                                            <div className="w-6 h-6 bg-red-600 rounded-sm" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Preview & Submit */}
                                        {file && (
                                            <div className="max-w-2xl mx-auto">
                                                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-6 group">
                                                    <video
                                                        src={previewUrl!}
                                                        controls
                                                        className="w-full h-full"
                                                    />
                                                    <button
                                                        onClick={reset}
                                                        className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between text-sm text-slate-600">
                                                        <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                                                        <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                                    </div>

                                                    <button
                                                        onClick={handleUpload}
                                                        disabled={uploading}
                                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                                    >
                                                        {uploading ? (
                                                            <>
                                                                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                                                Uploading {uploadProgress}%
                                                            </>
                                                        ) : (
                                                            'Submit Video'
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
