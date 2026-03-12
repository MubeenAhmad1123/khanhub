'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { uploadToCloudinary } from '@/lib/services/cloudinaryUpload';
import { db } from '@/lib/firebase/firebase-config';
import { collection, addDoc, serverTimestamp, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, Video, CheckCircle, AlertCircle, X, Camera, Circle, RefreshCw, Loader2 } from 'lucide-react';
import TagInput from '@/components/ui/TagInput';

/* ─── helpers ─────────────────────────────────────────────────── */
const validateVideo = (file: File, duration: number): string | null => {
    const valid = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!valid.includes(file.type)) return 'Please upload MP4, MOV, or WebM format';
    if (file.size > 200 * 1024 * 1024) return 'Video must be under 200 MB';
    if (duration > 80) return 'Video must be 80 seconds or less';
    return null;
};

const getVideoDuration = (file: File): Promise<number> =>
    new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            resolve(video.duration);
        };
        video.src = URL.createObjectURL(file);
    });

const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
};

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const generateVideoFrames = async (file: File): Promise<string[]> => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;

    await new Promise(resolve => { video.onloadeddata = resolve; });

    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 356;  // 9:16 aspect ratio
    const ctx = canvas.getContext('2d')!;

    const frames: string[] = [];
    const times = [1, video.duration * 0.3, video.duration * 0.6];

    for (const time of times) {
        if (!isFinite(time)) continue;
        video.currentTime = time;
        await new Promise(resolve => { video.onseeked = resolve; });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.8));
    }

    window.URL.revokeObjectURL(video.src);
    return frames;
};

const getCloudinaryThumb = (videoUrl: string): string => {
    if (!videoUrl) return '';
    if (!videoUrl.includes('cloudinary.com')) return videoUrl;
    return videoUrl
        .replace('/video/upload/', '/video/upload/so_0,w_400,h_711,c_fill,q_80/')
        .replace('.mp4', '.jpg')
        .replace('.webm', '.jpg')
        .replace('.mov', '.jpg');
};

/* ─── buildOverlayData ─────────────────────────────────────────── */
function buildOverlayData(formData: Record<string, any>, category: string, role: string) {
    const map: Record<string, Record<string, any>> = {
        jobs: {
            worker: { title: formData.specialization || '', badge: 'Job Seeker', field1: formData.specialization || '', field2: formData.experienceLevel || '' },
            hiring: { title: formData.companyName || '', badge: 'Employer', field1: formData.city || '', field2: formData.phone || '' },
        },
        healthcare: {
            doctor: { title: formData.specialization || '', badge: 'Healthcare', field1: formData.specialization || '', field2: formData.city || '' },
            patient: { title: 'Seeking Care', badge: 'Patient', field1: formData.city || '', field2: '' },
        },
        education: {
            teacher: { title: formData.subject || '', badge: 'Teacher', field1: formData.subject || '', field2: formData.experienceLevel || '' },
            student: { title: 'Student Profile', badge: 'Student', field1: formData.city || '', field2: '' },
        },
        marriage: {
            groom: { title: `Groom Profile`, badge: 'Groom', field1: `${formData.age || ''} Years`, field2: formData.city || '' },
            bride: { title: `Bride Profile`, badge: 'Bride', field1: `${formData.age || ''} Years`, field2: formData.city || '' },
        },
        legal: {
            lawyer: { title: 'Legal Professional', badge: 'Lawyer', field1: formData.specialization || '', field2: formData.city || '' },
            client: { title: 'Seeking Advice', badge: 'Client', field1: formData.city || '', field2: '' },
        },
        realestate: {
            agent: { title: formData.companyName || '', badge: 'Agent', field1: formData.city || '', field2: 'Property Expert' },
            buyer: { title: 'Looking for Property', badge: 'Buyer', field1: formData.city || '', field2: '' },
        },
        transport: {
            seller: { title: 'Transport Service', badge: 'Driver', field1: formData.city || '', field2: '' },
            buyer: { title: 'Passenger / Seeker', badge: 'Passenger', field1: formData.city || '', field2: '' },
        },
        travel: {
            agency: { title: formData.companyName || '', badge: 'Travel Agency', field1: formData.city || '', field2: '' },
            traveler: { title: 'Looking for Tour', badge: 'Traveler', field1: formData.city || '', field2: '' },
        },
        agriculture: {
            farmer: { title: 'Agri Supplier', badge: 'Farmer', field1: formData.city || '', field2: '' },
            buyer: { title: 'Looking for Agri Products', badge: 'Buyer', field1: formData.city || '', field2: '' },
        },
        sellbuy: {
            seller: { title: 'Item for Sale', badge: 'Seller', field1: formData.city || '', field2: '' },
            buyer: { title: 'Looking to Buy', badge: 'Buyer', field1: formData.city || '', field2: '' },
        },
    };
    return map[category]?.[role] || { title: '', badge: '', field1: '', field2: '' };
}

/* ─── PillSelector ─────────────────────────────────────────────── */
function PillSelector({
    label, options, value, onChange, required,
}: { label: string; options: string[]; value: string; onChange: (v: string) => void; required?: boolean }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444444', marginBottom: 8, fontFamily: 'DM Sans' }}>
                {label}{required && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>*</span>}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {options.map((o) => (
                    <button
                        key={o}
                        type="button"
                        onClick={() => onChange(o)}
                        style={{
                            padding: '7px 14px', borderRadius: 999, fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600, cursor: 'pointer',
                            border: value === o ? '1.5px solid var(--accent)' : '1.5px solid #E5E5E5',
                            background: value === o ? 'rgba(255,0,105,0.12)' : '#F8F8F8',
                            color: value === o ? 'var(--accent)' : '#888888',
                            transition: 'all 0.15s',
                        }}
                    >
                        {o}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ─── TextInput ─────────────────────────────────────────────────── */
function TextInput({ label, placeholder, value, onChange, required, type = 'text' }: {
    label: string; placeholder: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string;
}) {
    return (
        <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444444', marginBottom: 8, fontFamily: 'DM Sans' }}>
                {label}{required && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%', padding: '12px 14px', background: '#F8F8F8', border: '1.5px solid #E5E5E5',
                    borderRadius: 10, color: '#0A0A0A', fontSize: 14, fontFamily: 'DM Sans', outline: 'none',
                    boxSizing: 'border-box',
                }}
            />
        </div>
    );
}

/* ─── EXPERIENCE LEVELS (shared) ────────────────────────────────── */
const EXP_LEVELS = ['Fresher', '1-2 yrs', '3-5 yrs', '5-10 yrs', '10+ yrs'];

/* ─── ConditionalFields ─────────────────────────────────────────── */
function ConditionalFields({
    category, role, formData, onChange,
}: {
    category: string; role: string; formData: Record<string, any>; onChange: (key: string, val: any) => void;
}) {
    const set = (key: string) => (val: any) => onChange(key, val);

    if (category === 'jobs' && role === 'provider') {
        return (
            <>
                <TextInput label="Skill / Type of Work" placeholder='e.g. "Electrician"' value={formData.specialization || ''} onChange={set('specialization')} required />
                <PillSelector label="Experience Level" options={EXP_LEVELS} value={formData.experienceLevel || ''} onChange={set('experienceLevel')} required />
            </>
        );
    }
    if (category === 'healthcare' && role === 'provider') {
        return <TextInput label="Specialization" placeholder='e.g. "Dentist"' value={formData.specialization || ''} onChange={set('specialization')} required />;
    }
    if (category === 'education' && role === 'provider') {
        return (
            <>
                <TextInput label="Subject / Field" placeholder='e.g. "Physics"' value={formData.subject || ''} onChange={set('subject')} required />
                <PillSelector label="Experience Level" options={EXP_LEVELS} value={formData.experienceLevel || ''} onChange={set('experienceLevel')} required />
            </>
        );
    }
    if (category === 'marriage') {
        const label = role === 'provider' ? "Groom's Profession" : "Bride's Profession";
        return (
            <>
                <TextInput label={label} placeholder='e.g. "Engineer"' value={formData.specialization || ''} onChange={set('specialization')} required />
                <TextInput label="Age" placeholder='e.g. "28"' value={formData.age || ''} onChange={set('age')} required type="number" />
                <TextInput label="City" placeholder='e.g. "Lahore"' value={formData.city || ''} onChange={set('city')} required />
            </>
        );
    }
    if (category === 'legal' && role === 'provider') {
        return <TextInput label="Legal Specialization" placeholder='e.g. "Criminal Lawyer"' value={formData.specialization || ''} onChange={set('specialization')} required />;
    }
    if (category === 'realestate' || category === 'property') {
        return (
            <>
                <TextInput label="Area / City" placeholder='e.g. "DHA Phase 6"' value={formData.city || ''} onChange={set('city')} required />
                <TextInput label="Description" placeholder='e.g. "Beautiful 500yd House"' value={formData.companyName || ''} onChange={set('companyName')} required />
            </>
        );
    }
    if (category === 'transport' || category === 'automobiles') {
        return (
            <>
                <TextInput label="Vehicle / Service Name" placeholder='e.g. "Honda Civic 2022"' value={formData.companyName || ''} onChange={set('companyName')} required />
                <TextInput label="City" placeholder='e.g. "Rawalpindi"' value={formData.city || ''} onChange={set('city')} required />
            </>
        );
    }
    if (category === 'travel' && role === 'provider') {
        return <TextInput label="Travel Service / Package" placeholder='e.g. "Dubai Tour Package"' value={formData.companyName || ''} onChange={set('companyName')} required />;
    }
    if (category === 'agriculture' && role === 'provider') {
        return <TextInput label="Products Offered" placeholder='e.g. "Organic Wheat"' value={formData.companyName || ''} onChange={set('companyName')} required />;
    }
    if (category === 'sellbuy' || category === 'buysell') {
        return (
            <>
                <TextInput label="Item Name" placeholder='e.g. "iPhone 15 Pro Max"' value={formData.companyName || ''} onChange={set('companyName')} required />
                <TextInput label="City" placeholder='e.g. "Karachi"' value={formData.city || ''} onChange={set('city')} required />
            </>
        );
    }
    if (role === 'seeker') {
        return <TextInput label="City" placeholder='e.g. "Karachi"' value={formData.city || ''} onChange={set('city')} required />;
    }
    // Fallback
    return (
        <TextInput label="Describe Your Video" placeholder="Tell us what this video is about..." value={formData.description || ''} onChange={set('description')} />
    );
}

/* ─── MAIN PAGE ─────────────────────────────────────────────────── */
export default function UploadVideoPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [step, setStep] = useState<1 | 2 | 'success'>(1);
    const [firestoreProfile, setFirestoreProfile] = useState<any>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState<number>(0);
    const [validationError, setValidationError] = useState<string | null>(null);

    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [videoFrames, setVideoFrames] = useState<string[]>([]);
    const [selectedFrame, setSelectedFrame] = useState<number | null>(null);

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [caption, setCaption] = useState('');

    // Profile completeness fields
    const [profileCity, setProfileCity] = useState('');
    const [profilePhone, setProfilePhone] = useState('');
    // Video topic
    const [videoTopic, setVideoTopic] = useState('');

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ─── RECORDING STATES ─── */
    const [isRecording, setIsRecording] = useState(false);
    const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraMode, setCameraMode] = useState<'user' | 'environment'>('user');
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const recordingChunks = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const startCamera = async (mode: 'user' | 'environment' = 'user') => {
        try {
            const constraints = {
                video: {
                    facingMode: mode,
                    width: { ideal: 1080 },
                    height: { ideal: 1920 },
                    aspectRatio: 9 / 16
                },
                audio: true
            };
            const s = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(s);
            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = s;
                videoPreviewRef.current.play();
            }
            setIsCameraActive(true);
            setCameraMode(mode);
        } catch (err) {
            console.error('Camera access error:', err);
            setValidationError('Unable to access camera. Please check permissions.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraActive(false);
        setIsRecording(false);
        setRecordingTime(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };

    const startRecording = () => {
        if (!stream) return;
        recordingChunks.current = [];
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordingChunks.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordingChunks.current, { type: 'video/webm' });
            const file = new File([blob], `recorded-video-${Date.now()}.webm`, { type: 'video/webm' });
            handleFileSelect(file);
            stopCamera();
        };

        mediaRecorder.start();
        setRecorder(mediaRecorder);
        setIsRecording(true);
        setRecordingTime(0);

        timerIntervalRef.current = setInterval(() => {
            setRecordingTime(prev => {
                if (prev >= 80) { // Limit to 80s
                    mediaRecorder.stop();
                    return 80;
                }
                return prev + 1;
            });
        }, 1000);
    };

    const stopRecording = () => {
        if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
        }
    };

    const switchCamera = () => {
        const nextMode = cameraMode === 'user' ? 'environment' : 'user';
        stopCamera();
        startCamera(nextMode);
    };

    /* Auth guard */
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
    }, [authLoading, user, router]);

    /* Load Firestore profile — Firebase Auth object does NOT have role/category/uiRole */
    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            if (snap.exists()) setFirestoreProfile(snap.data());
        }, (error) => {
            console.warn('[UploadVideo Profile] Snapshot error:', error.message);
        });
        return () => unsub();
    }, [user]);

    if (authLoading || !user || !firestoreProfile) {
        return (
            <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #222', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
        );
    }

    const userCategory = firestoreProfile.category || 'jobs';

    // Read uiRole from Firestore profile (NOT from Firebase Auth user object)
    // uiRole is 'provider' or 'seeker' — saved during onboarding
    let userRole: 'provider' | 'seeker' = firestoreProfile.uiRole;

    if (!userRole) {
        // Fallback: derive from specific role key saved in Firestore
        const roleKey = firestoreProfile.role || '';
        const providerKeys = ['worker', 'groom', 'agent', 'seller', 'teacher'];
        const seekerKeys = ['hiring', 'bride', 'buyer', 'student'];
        if (providerKeys.includes(roleKey)) {
            userRole = 'provider';
        } else if (seekerKeys.includes(roleKey)) {
            userRole = 'seeker';
        } else {
            userRole = 'provider'; // safe default
        }
    }

    /* ─── File selection ──────────────────────────────────────── */
    const handleFileSelect = async (file: File) => {
        setValidationError(null);
        // Basic type check first
        const valid = ['video/mp4', 'video/webm', 'video/quicktime'];
        if (!valid.includes(file.type)) {
            setValidationError('Please upload MP4, MOV, or WebM format');
            return;
        }
        if (file.size > 200 * 1024 * 1024) {
            setValidationError('Video must be under 200 MB');
            return;
        }
        const duration = await getVideoDuration(file);
        const err = validateVideo(file, duration);
        if (err) {
            setValidationError(err);
            return;
        }
        setVideoDuration(duration);
        setVideoFile(file);
        setPreviewUrl(URL.createObjectURL(file));

        generateVideoFrames(file).then(frames => {
            setVideoFrames(frames);
            setSelectedFrame(0);
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
    };

    /* ─── Upload ──────────────────────────────────────────────── */
    const handleUpload = async () => {
        if (!videoFile || !user) return;
        setUploading(true);
        setUploadProgress(0);
        setUploadError(null);

        try {
            // 1. Upload to Cloudinary
            const result = await uploadToCloudinary(
                videoFile,
                'jobreel_videos',
                (progress) => setUploadProgress(progress.percentage)
            );

            // 2. Thumbnail Processing
            let thumbnailUrl = '';
            if (thumbnailFile) {
                const thumbResult = await uploadToCloudinary(thumbnailFile, 'jobreel_thumbnails', () => { });
                thumbnailUrl = thumbResult.secureUrl;
            } else if (selectedFrame !== null && videoFrames[selectedFrame]) {
                const blob = await fetch(videoFrames[selectedFrame]).then(r => r.blob());
                const frameFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
                const thumbResult = await uploadToCloudinary(frameFile, 'jobreel_thumbnails', () => { });
                thumbnailUrl = thumbResult.secureUrl;
            } else {
                thumbnailUrl = getCloudinaryThumb(result.secureUrl);
            }

            // 3. Build overlay data
            const overlayData = buildOverlayData(formData, userCategory, userRole);

            // 3b. Save profile fields if filled in (city / phone)
            const profileUpdates: Record<string, any> = {};
            if (profileCity && !firestoreProfile?.city) profileUpdates.city = profileCity;
            if (profilePhone && !firestoreProfile?.phone) profileUpdates.phone = profilePhone;
            if (Object.keys(profileUpdates).length > 0) {
                await updateDoc(doc(db, 'users', user.uid), profileUpdates);
            }

            // 4. Write to Firestore 'videos' collection (schema admin page reads)
            const effectiveCity = profileCity || firestoreProfile?.city || (user as any).city || '';
            const effectivePhone = profilePhone || firestoreProfile?.phone || '';
            const videoDocRef = await addDoc(collection(db, 'videos'), {
                // User info
                userId: user.uid,
                userEmail: user.email,
                userName: (user as any).displayName || (user as any).name || '',
                userPhoto: (user as any).photoURL || '',

                // Video
                cloudinaryUrl: result.secureUrl,
                cloudinaryPublicId: result.publicId,
                thumbnailUrl,

                // Category
                category: userCategory,
                userRole: userRole,
                city: effectiveCity,
                phone: effectivePhone,
                videoTopic,

                // Overlay (shown on feed card)
                overlayData: {
                    title: overlayData.title,
                    badge: overlayData.badge,
                    field1: overlayData.field1,
                    field2: overlayData.field2,
                    location: effectiveCity || formData.city || formData.companyLocation || '',
                    userPhoto: (user as any).photoURL || '',
                    userName: (user as any).displayName || (user as any).name || '',
                },

                // All form fields flat
                ...formData,
                caption,

                // Admin fields (MUST match what admin page reads)
                admin_status: 'pending',
                is_live: false,
                transcriptionStatus: 'pending',

                // Stats
                views: 0,
                likes: 0,
                saves: 0,
                shares: 0,
                likedBy: [],

                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // 4. Update user profile_status
            await updateDoc(doc(db, 'users', user.uid), {
                profile_status: 'video_submitted',
                lastVideoUploadAt: serverTimestamp(),
            });

            // 5. Admin notification
            await addDoc(collection(db, 'adminNotifications'), {
                type: 'new_video',
                title: 'New Video Submitted',
                message: `${(user as any).displayName || (user as any).name || 'A user'} submitted a video for review — ${userCategory}/${userRole}`,
                read: false,
                is_read: false,
                targetId: videoDocRef.id,
                targetType: 'video',
                createdAt: serverTimestamp(),
            });

            setStep('success');
        } catch (err: any) {
            console.error('Upload failed:', err);
            setUploadError(err.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const resetUpload = () => {
        setStep(1);
        setVideoFile(null);
        setPreviewUrl(null);
        setVideoDuration(0);
        setValidationError(null);
        setThumbnailFile(null);
        setVideoFrames([]);
        setSelectedFrame(null);
        setFormData({});
        setCaption('');
        setUploadError(null);
        setUploadProgress(0);
        setVideoTopic('');
        setProfileCity('');
        setProfilePhone('');
    };

    /* ─── STYLES ────────────────────────────────────────────────── */
    const pageStyle: React.CSSProperties = {
        minHeight: '100dvh',
        background: '#FFFFFF',
        paddingBottom: 80,
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid #E5E5E5',
        position: 'sticky',
        top: 0,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        zIndex: 50,
    };

    const accentBtn: React.CSSProperties = {
        width: '100%',
        padding: '15px',
        background: 'linear-gradient(135deg, var(--accent), #7638FA)',
        color: '#fff',
        border: 'none',
        borderRadius: 14,
        fontFamily: 'Poppins, sans-serif',
        fontWeight: 700,
        fontSize: 16,
        cursor: 'pointer',
        marginTop: 8,
        opacity: uploading ? 0.7 : 1,
    };

    /* ─── SUCCESS SCREEN ─────────────────────────────────────────── */
    if (step === 'success') {
        return (
            <div style={pageStyle}>
                <div style={headerStyle}>
                    <span style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 16, color: '#0A0A0A' }}>Upload Complete</span>
                </div>
                <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                    <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
                    <h2 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 26, color: '#0A0A0A', marginBottom: 10 }}>
                        Video Uploaded!
                    </h2>
                    <p style={{ color: '#888', fontFamily: 'DM Sans', fontSize: 14, marginBottom: 40, lineHeight: 1.7, maxWidth: 320, margin: '0 auto 40px' }}>
                        Your video is under review. Once approved by our team, it will appear in the feed. Usually takes 2–4 hours.
                    </p>
                    <div style={{ padding: '0 24px', maxWidth: 420, margin: '0 auto' }}>
                        <button onClick={() => router.push('/feed')} style={accentBtn}>
                            Back to Feed
                        </button>
                        <button
                            onClick={resetUpload}
                            style={{
                                width: '100%', padding: '14px', marginTop: 12,
                                background: 'transparent', color: '#666',
                                border: '1px solid #1A1A1A', borderRadius: 14,
                                fontFamily: 'DM Sans', fontSize: 14, cursor: 'pointer',
                            }}
                        >
                            Upload Another Video
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ─── STEP 1 ────────────────────────────────────────────────── */
    if (step === 1) {
        return (
            <div style={pageStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
                        <ArrowLeft size={20} color="#0A0A0A" />
                    </button>
                    <span style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 15, color: '#0A0A0A' }}>Upload Video</span>
                    <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#888888' }}>1 of 2</span>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: 6, padding: '12px 20px' }}>
                    {[1, 2].map(s => (
                        <div key={s} style={{ flex: 1, height: 3, borderRadius: 999, background: s <= 1 ? 'var(--accent)' : '#1a1a1a' }} />
                    ))}
                </div>

                <div style={{ padding: '16px 20px' }}>
                    {/* Drop Zone */}
                    <div
                        onClick={() => !videoFile && fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        style={{
                            border: videoFile ? '2px solid var(--accent)' : '2px dashed #CCCCCC',
                            borderRadius: 20,
                            overflow: 'hidden',
                            cursor: videoFile ? 'default' : 'pointer',
                            background: '#F8F8F8',
                            marginBottom: 16,
                            minHeight: videoFile ? 'auto' : 220,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'border-color 0.2s',
                        }}
                    >
                        {!videoFile ? (
                            <div style={{ textAlign: 'center', padding: '24px' }}>
                                <div style={{ fontSize: 40, marginBottom: 8 }}>📹</div>
                                <p style={{ color: '#0A0A0A', fontFamily: 'Poppins', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                                    Tap to select your video
                                </p>
                                <p style={{ color: '#888888', fontFamily: 'DM Sans', fontSize: 12 }}>
                                    MP4, MOV, WebM · Max 80s · Max 200MB
                                </p>
                            </div>
                        ) : (
                            <video
                                src={previewUrl!}
                                controls
                                playsInline
                                style={{ width: '100%', maxHeight: 480, objectFit: 'contain', display: 'block' }}
                            />
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        style={{ display: 'none' }}
                        onChange={handleInputChange}
                    />

                    {!videoFile && (
                        <div
                            onClick={() => startCamera()}
                            style={{
                                marginTop: 12, height: 74, border: '1.5px solid #E5E5E5', borderRadius: 20, display: 'flex',
                                alignItems: 'center', gap: 14, padding: '0 16px', cursor: 'pointer', background: '#FFFFFF',
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ padding: 10, background: 'rgba(0,100,255,0.08)', borderRadius: 12 }}>
                                <Camera size={22} color="#0064FF" />
                            </div>
                            <div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: 'DM Sans' }}>Record from Camera</p>
                                <p style={{ fontSize: 11, color: '#888888', fontFamily: 'DM Sans' }}>Shoot a video up to 80s</p>
                            </div>
                        </div>
                    )}

                    {/* Validation error */}
                    {validationError && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)',
                            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                        }}>
                            <AlertCircle size={16} color="#ff5555" />
                            <span style={{ color: '#ff5555', fontFamily: 'DM Sans', fontSize: 13 }}>{validationError}</span>
                        </div>
                    )}

                    {/* File info after selection */}
                    {videoFile && !validationError && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.2)',
                            borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                        }}>
                            <CheckCircle size={18} color="#00C864" />
                            <div>
                                <p style={{ color: '#fff', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, margin: 0 }}>
                                    {videoFile.name}
                                </p>
                                <p style={{ color: '#666', fontFamily: 'DM Sans', fontSize: 11, margin: '2px 0 0' }}>
                                    Duration: {formatDuration(videoDuration)} · Size: {formatBytes(videoFile.size)}
                                </p>
                            </div>
                            <button
                                onClick={() => { setVideoFile(null); setPreviewUrl(null); setValidationError(null); }}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                            >
                                <X size={16} color="#555" />
                            </button>
                        </div>
                    )}

                    {/* Change video button */}
                    {videoFile && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: '100%', padding: '11px',
                                background: '#F8F8F8', border: '1.5px solid #E5E5E5',
                                borderRadius: 12, color: '#444444', fontFamily: 'DM Sans',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 10,
                            }}
                        >
                            Change Video
                        </button>
                    )}

                    {/* Continue */}
                    {videoFile && !validationError && (
                        <button onClick={() => setStep(2)} style={accentBtn}>
                            Continue →
                        </button>
                    )}

                    {/* Community rules */}
                    <div style={{
                        marginTop: 24,
                        background: '#0a0a0a',
                        border: '1px solid #1a1a1a',
                        borderRadius: 14,
                        padding: '16px 18px',
                    }}>
                        <p style={{ color: '#666', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                            ⚠️ Community Rules
                        </p>
                        {[
                            'No phone numbers or emails in video',
                            'No personal documents shown',
                            'Job-related content only',
                            'Violation = account ban',
                        ].map((rule) => (
                            <p key={rule} style={{ color: '#555', fontFamily: 'DM Sans', fontSize: 12, marginBottom: 5 }}>
                                • {rule}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    /* ─── STEP 2 ────────────────────────────────────────────────── */
    return (
        <div style={pageStyle}>
            {/* Header */}
            <div style={headerStyle}>
                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
                    <ArrowLeft size={20} color="#0A0A0A" />
                </button>
                <span style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 15, color: '#0A0A0A' }}>Video Details</span>
                <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#888888' }}>2 of 2</span>
            </div>

            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 6, padding: '12px 20px' }}>
                {[1, 2].map(s => (
                    <div key={s} style={{ flex: 1, height: 3, borderRadius: 999, background: 'var(--accent)' }} />
                ))}
            </div>

            <div style={{ padding: '16px 20px' }}>
                {/* Mini preview */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, background: '#F8F8F8', borderRadius: 14, padding: '12px', border: '1px solid #E5E5E5' }}>
                    <video
                        src={previewUrl!}
                        style={{ width: 60, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0, background: '#000' }}
                        muted
                        playsInline
                    />
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <CheckCircle size={14} color="#00C864" />
                            <span style={{ color: '#00C864', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700 }}>Your video is ready ✓</span>
                        </div>
                        <p style={{ color: '#888888', fontFamily: 'DM Sans', fontSize: 11, margin: 0 }}>
                            {formatDuration(videoDuration)} · {formatBytes(videoFile?.size || 0)}
                        </p>
                    </div>
                </div>

                {/* Thumbnail selector — after video selected */}
                <div style={{ marginBottom: 24 }}>
                    <div style={{ color: '#444444', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans', marginBottom: 8 }}>
                        Cover Image (optional)
                    </div>

                    {!thumbnailFile ? (
                        <div style={{
                            display: 'flex', gap: 12, alignItems: 'center', overflowX: 'auto', paddingBottom: 8
                        }}>
                            {/* Auto-generated frames from video */}
                            {videoFrames.map((frame, i) => (
                                <div
                                    key={i}
                                    onClick={() => setSelectedFrame(i)}
                                    style={{
                                        width: 56, height: 80, borderRadius: 8, overflow: 'hidden',
                                        border: selectedFrame === i ? '2px solid var(--accent)' : '2px solid #E5E5E5',
                                        background: '#F8F8F8', cursor: 'pointer', flexShrink: 0,
                                    }}
                                >
                                    <img src={frame} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ))}

                            {/* Custom upload option */}
                            <label style={{
                                width: 56, height: 80, borderRadius: 8,
                                border: '2px dashed #CCCCCC', background: '#F8F8F8',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyItems: 'center',
                                cursor: 'pointer', color: '#888', fontSize: 10,
                                fontFamily: 'DM Sans', gap: 4, flexShrink: 0,
                                transition: 'all 0.2s', padding: 4, textAlign: 'center'
                            }}>
                                <input type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) setThumbnailFile(e.target.files[0]);
                                    }} />
                                <span style={{ fontSize: 18 }}>📷</span>
                                Custom
                            </label>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F8F8F8', padding: 8, borderRadius: 12, border: '1px solid #E5E5E5' }}>
                            <img src={URL.createObjectURL(thumbnailFile)}
                                style={{ width: 56, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                            <button onClick={() => setThumbnailFile(null)}
                                style={{ color: '#FF0069', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '8px 16px' }}>
                                Remove Custom Cover
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Profile Completeness Gate ── */}
                {(!firestoreProfile?.city || !firestoreProfile?.phone) && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(255,0,105,0.06), rgba(118,56,250,0.06))',
                        border: '1.5px solid rgba(255,0,105,0.18)',
                        borderRadius: 16, padding: '16px 18px', marginBottom: 24,
                    }}>
                        <p style={{
                            fontFamily: 'Poppins', fontWeight: 700, fontSize: 13,
                            color: '#0A0A0A', marginBottom: 14,
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <span>✅</span> Complete Your Profile First
                        </p>
                        {!firestoreProfile?.city && (
                            <TextInput
                                label="Your City"
                                placeholder='e.g. "Lahore"'
                                value={profileCity}
                                onChange={setProfileCity}
                                required
                            />
                        )}
                        {!firestoreProfile?.phone && (
                            <TextInput
                                label="Phone / WhatsApp Number"
                                placeholder='e.g. "+923001234567"'
                                value={profilePhone}
                                onChange={setProfilePhone}
                                required
                                type="tel"
                            />
                        )}
                    </div>
                )}

                {/* Section label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
                    <span style={{ color: '#888888', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Tell us about this video
                    </span>
                    <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
                </div>

                {/* Video Topic */}
                <PillSelector
                    label="What is this video about?"
                    required
                    options={
                        userCategory === 'jobs'
                            ? ['Job Offer', 'Portfolio / Skills', 'Company Tour', 'Testimonial', 'Other']
                            : userCategory === 'healthcare'
                                ? ['Service Introduction', 'Patient Story', 'Clinic Tour', 'Health Tips', 'Other']
                                : userCategory === 'education'
                                    ? ['Course Preview', 'Student Success', 'Teaching Demo', 'Institute Tour', 'Other']
                                    : userCategory === 'marriage'
                                        ? ['Self Introduction', 'Family Message', 'Lifestyle', 'Other']
                                        : userCategory === 'realestate'
                                            ? ['Property Tour', 'Price Offer', 'Area Overview', 'Other']
                                            : userCategory === 'transport'
                                                ? ['Service Demo', 'Fleet Showcase', 'Route Info', 'Other']
                                                : userCategory === 'travel'
                                                    ? ['Package Tour', 'Destination Showcase', 'Travel Tips', 'Other']
                                                    : userCategory === 'agriculture'
                                                        ? ['Product Showcase', 'Farm Tour', 'Pricing', 'Other']
                                                        : userCategory === 'sellbuy'
                                                            ? ['Item for Sale', 'Unboxing', 'Price Negotiable', 'Other']
                                                            : ['About My Service', 'Promotion', 'Introduction', 'Other']
                    }
                    value={videoTopic}
                    onChange={setVideoTopic}
                />

                {/* Conditional fields */}
                <ConditionalFields
                    category={userCategory}
                    role={userRole}
                    formData={formData}
                    onChange={(key, val) => setFormData(prev => ({ ...prev, [key]: val }))}
                />

                {/* Caption */}
                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444444', marginBottom: 8, fontFamily: 'DM Sans' }}>
                        Caption <span style={{ color: '#888888' }}>(optional)</span>
                    </label>
                    <textarea
                        value={caption}
                        onChange={(e) => {
                            if (e.target.value.length <= 150) setCaption(e.target.value);
                        }}
                        placeholder="Say something about your video..."
                        rows={3}
                        style={{
                            width: '100%', padding: '12px 14px',
                            background: '#F8F8F8', border: '1.5px solid #E5E5E5',
                            borderRadius: 10, color: '#0A0A0A', fontSize: 14,
                            fontFamily: 'DM Sans', outline: 'none', resize: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                    <div style={{ textAlign: 'right', color: '#444', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                        {caption.length}/150
                    </div>
                </div>

                {/* Upload error */}
                {uploadError && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)',
                        borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                    }}>
                        <AlertCircle size={16} color="#ff5555" />
                        <span style={{ color: '#ff5555', fontFamily: 'DM Sans', fontSize: 13 }}>{uploadError}</span>
                    </div>
                )}

                {/* Progress bar */}
                {uploading && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: '#aaa', fontSize: 13, fontFamily: 'DM Sans' }}>Uploading video...</span>
                            <span style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
                                {uploadProgress}%
                            </span>
                        </div>
                        <div style={{ background: '#1A1A1A', borderRadius: 999, height: 4 }}>
                            <div style={{
                                width: `${uploadProgress}%`, height: '100%',
                                background: 'linear-gradient(90deg, var(--accent), #7638FA)',
                                borderRadius: 999, transition: 'width 0.3s ease',
                            }} />
                        </div>
                    </div>
                )}

                {/* Upload button */}
                <button
                    onClick={handleUpload}
                    disabled={uploading}
                    style={{ ...accentBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                >
                    {uploading ? (
                        <>
                            <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Video size={18} />
                            Upload Video →
                        </>
                    )}
                </button>

                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    input[type="number"] { -moz-appearance: textfield; }
                    input[type="number"]::-webkit-inner-spin-button,
                    input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }
                `}</style>
            </div>
        </div>
    );
}