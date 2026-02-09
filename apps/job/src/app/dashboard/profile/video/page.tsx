'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Camera, StopCircle, Play, RotateCcw, Upload, CheckCircle, Loader2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { uploadVideo } from '@/lib/firebase/storage';
import { updateUserProfile } from '@/lib/firebase/auth';
import { awardPointsForVideo } from '@/lib/services/pointsSystem';
import { Button } from '@/components/ui/button';

export default function IntroVideoPage() {
    const router = useRouter();
    const { user, profile } = useAuth();

    const [recording, setRecording] = useState(false);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(60);
    const [isCounting, setIsCounting] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setError('');
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Could not access camera/microphone. Please check permissions.');
        }
    };

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
            setIsCounting(false);
            stopCamera();
        }
    }, [recording, stopCamera]);

    useEffect(() => {
        if (isCounting && countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0 && recording) {
            stopRecording();
        }
    }, [isCounting, countdown, recording, stopRecording]);

    const startRecording = () => {
        if (!streamRef.current) return;

        chunksRef.current = [];
        const options = { mimeType: 'video/webm;codecs=vp9,opus' };

        try {
            const mediaRecorder = new MediaRecorder(streamRef.current, options);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                setVideoBlob(blob);
                setPreviewUrl(URL.createObjectURL(blob));
                stopCamera();
            };

            mediaRecorder.start();
            setRecording(true);
            setCountdown(60);
            setIsCounting(true);
        } catch (err) {
            console.error('Error starting recording:', err);
            setError('Failed to start recording.');
        }
    };

    const resetRecording = () => {
        setVideoBlob(null);
        setPreviewUrl(null);
        setCountdown(60);
        startCamera();
    };

    const handleUpload = async () => {
        if (!videoBlob || !user) return;

        setUploading(true);
        setError('');

        try {
            const videoFile = new File([videoBlob], 'intro-video.webm', { type: 'video/webm' });
            const uploadResult = await uploadVideo(videoFile, user.uid);

            await updateUserProfile(user.uid, {
                profile: {
                    ...profile?.profile,
                    videoUrl: uploadResult.url,
                },
            });

            await awardPointsForVideo(user.uid);

            setUploading(false);
            router.push('/dashboard');
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload video. Please try again.');
            setUploading(false);
        }
    };

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    return (
        <div className="min-h-screen bg-jobs-neutral py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-jobs-dark mb-2">Intro Video</h1>
                    <p className="text-jobs-dark/60">
                        Record a short intro (max 60s) to stand out to employers!
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="relative aspect-video bg-black flex items-center justify-center">
                        {!previewUrl ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <video
                                src={previewUrl}
                                controls
                                className="w-full h-full object-cover"
                            />
                        )}

                        {recording && (
                            <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full font-black flex items-center gap-2 animate-pulse">
                                <div className="h-3 w-3 rounded-full bg-white"></div>
                                REC 00:{countdown.toString().padStart(2, '0')}
                            </div>
                        )}
                    </div>

                    <div className="p-8">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-3 mb-6">
                                <AlertCircle className="h-5 w-5" />
                                {error}
                            </div>
                        )}

                        {!previewUrl ? (
                            <div className="flex flex-col items-center">
                                {!recording ? (
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        onClick={startRecording}
                                        className="w-full max-w-sm"
                                        leftIcon={<Camera className="h-5 w-5" />}
                                    >
                                        Start Recording
                                    </Button>
                                ) : (
                                    <Button
                                        variant="danger"
                                        size="lg"
                                        onClick={stopRecording}
                                        className="w-full max-w-sm"
                                        leftIcon={<StopCircle className="h-5 w-5" />}
                                    >
                                        Stop Recording
                                    </Button>
                                )}
                                <p className="mt-4 text-sm text-jobs-dark/50">
                                    Recording will automatically stop after 60 seconds
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="flex gap-4 w-full max-w-lg mb-6">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={resetRecording}
                                        leftIcon={<RotateCcw className="h-5 w-5" />}
                                    >
                                        Retake
                                    </Button>
                                    <Button
                                        variant="primary"
                                        className="flex-1"
                                        onClick={handleUpload}
                                        isLoading={uploading}
                                        disabled={uploading}
                                        leftIcon={<Upload className="h-5 w-5" />}
                                    >
                                        Save & Upload
                                    </Button>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 w-full text-center">
                                    <p className="text-sm text-yellow-800">
                                        You'll earn <strong>20 points</strong> for uploading your intro video!
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 bg-blue-50 p-8 rounded-3xl border border-blue-100">
                    <h3 className="text-xl font-black text-blue-900 mb-4">💡 Tips for a Great Intro</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ul className="space-y-3 text-sm text-blue-800">
                            <li className="flex items-start gap-2">
                                <span className="font-bold shrink-0">1.</span>
                                <span>Introduce yourself and your professional background.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold shrink-0">2.</span>
                                <span>Mention your key skills and areas of expertise.</span>
                            </li>
                        </ul>
                        <ul className="space-y-3 text-sm text-blue-800">
                            <li className="flex items-start gap-2">
                                <span className="font-bold shrink-0">3.</span>
                                <span>Be professional, but let your personality shine!</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold shrink-0">4.</span>
                                <span>Ensure you're in a quiet, well-lit environment.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
