'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { uploadToCloudinary } from '@/lib/services/cloudinaryUpload';
import { db } from '@/lib/firebase/firebase-config';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import {
    Loader2,
    Upload,
    Video,
    StopCircle,
    Play,
    X,
    CheckCircle,
    AlertCircle,
    Info,
    ChevronRight,
    Briefcase,
    MapPin,
    DollarSign,
    Building2,
    Plus,
    Tag,
    ArrowRight,
    ArrowLeft,
    MonitorPlay,
    ShieldCheck,
    Phone,
    Globe,
    Calendar,
    Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import TagInput from '@/components/ui/TagInput';
import Image from 'next/image';

export default function PostJobPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    // Multi-step state
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        skills: [] as string[],
        experienceRequired: '',
        type: 'Full-time' as any,
        location: '',
        salaryRange: '',
        hideSalary: false,
    });
    const [skillInput, setSkillInput] = useState('');

    // Video State
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const [recordingTime, setRecordingTime] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const MAX_DURATION = 60;

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            stopStream();
        }
    }, [mediaRecorder, isRecording, stopStream]);

    // 2. Profile Completion Check for Profile Gate
    useEffect(() => {
        if (!authLoading && user) {
            const missingFields = [];
            // Check flat schema first, then legacy profile
            // Check flat schema fields
            if (!user.yearEstablished) missingFields.push('Year Established');
            if (!user.website) missingFields.push('Company Website');
            if (!user.hrFullName && !user.name && !user.displayName) missingFields.push('HR/Admin Full Name');
            if (!user.hrPhone && !user.phone) missingFields.push('HR Mobile Number');

            setIsProfileIncomplete(missingFields.length > 0);
        }
    }, [user, authLoading]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            setError('Could not access camera/microphone.');
        }
    };

    const startRecording = () => {
        if (!streamRef.current) return;
        const recorder = new MediaRecorder(streamRef.current);
        setMediaRecorder(recorder);
        setRecordedChunks([]);
        setRecordingTime(0);
        recorder.ondataavailable = (e) => e.data.size > 0 && setRecordedChunks(p => [...p, e.data]);
        recorder.start();
        setIsRecording(true);
        timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    };



    useEffect(() => {
        if (recordedChunks.length > 0 && !isRecording) {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            setFile(new File([blob], "job-pitch.webm", { type: 'video/webm' }));
            setPreviewUrl(URL.createObjectURL(blob));
        }
    }, [recordedChunks, isRecording]);

    const handleAddSkill = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && skillInput.trim()) {
            e.preventDefault();
            if (!formData.skills.includes(skillInput.trim())) {
                setFormData(prev => ({ ...prev, skills: [...prev.skills, skillInput.trim()] }));
            }
            setSkillInput('');
        }
    };

    const handleRemoveSkill = (skill: string) => {
        setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
    };

    const nextStep = () => {
        if (step === 1 && (!formData.title || !formData.description || formData.skills.length === 0)) {
            setError('Please fill in all job details and add at least one skill.');
            return;
        }
        if (step === 2 && (!formData.location || !formData.salaryRange)) {
            setError('Please provide location and salary details.');
            return;
        }
        setError(null);
        setStep(p => p + 1);
    };

    const prevStep = () => {
        setError(null);
        setStep(p => p - 1);
    };

    const handleFinalSubmit = async () => {
        if (!file || !user) {
            setError('Please record or upload a video for this job.');
            return;
        }

        try {
            setSaving(true);
            setUploading(true);
            setError(null);

            // 1. Upload Video
            const uploadResult = await uploadToCloudinary(file, 'khanhub/job-postings', (p) => setUploadProgress(p.percentage));

            // 2. Prepare Data
            const jobData = {
                employerId: user.uid,
                title: formData.title,
                description: formData.description,
                skills: formData.skills,
                experienceRequired: formData.experienceRequired,
                type: formData.type,
                location: formData.location,
                salaryRange: formData.salaryRange,
                hideSalary: formData.hideSalary,
                companyName: (user as any).company?.name || user.displayName || 'Company',
                companyLogo: (user as any).company?.logo || user.photoURL || '',
                companyLocation: (user as any).company?.address || (user as any).profile?.location || 'Not Specified',
                companyPhone: (user as any).company?.phone || (user as any).profile?.phone || 'Not Specified',
                industry: (user as any).company?.industry || (user as any).industry || 'General',
                videoUrl: uploadResult.secureUrl,
                cloudinaryId: uploadResult.publicId,
                status: 'pending',
                admin_status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            // 3. Save to Firestore
            await addDoc(collection(db, 'jobPostings'), jobData);

            setSuccess(true);
            setTimeout(() => router.push('/employer/dashboard'), 2000);

        } catch (err: any) {
            setError(err.message || 'Failed to post job. Please try again.');
        } finally {
            setSaving(false);
            setUploading(false);
        }
    };

    if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
    if (!user || user.role !== 'employer') {
        router.push('/');
        return null;
    }

    if (isProfileIncomplete) {
        return <ProfileGate user={user} onComplete={() => setIsProfileIncomplete(false)} />;
    }

    return (
        <div className="min-h-screen bg-[#F8FAFF] py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase flex flex-col">
                            Post Video Job <span className="text-blue-600 text-lg normal-case mt-1" dir="rtl">ویڈیو جاب پوسٹ کریں</span>
                        </h1>
                        <p className="text-slate-500 font-bold">Step {step} of 4 • {step === 1 ? 'Details' : step === 2 ? 'Logistics' : step === 3 ? 'Review' : 'Video'}</p>
                    </div>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className={cn("w-12 h-2 rounded-full transition-all duration-500", s <= step ? "bg-orange-500" : "bg-slate-200")} />
                        ))}
                    </div>
                </div>

                {success ? (
                    <div className="bg-white rounded-[3rem] p-16 text-center shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-white shadow-xl">
                            <CheckCircle className="w-12 h-12 text-emerald-600" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase mb-4">
                            Job Posted! <span className="text-emerald-600 block text-xl normal-case" dir="rtl">جاب پوسٹ ہو گئی!</span>
                        </h2>
                        <p className="text-slate-500 font-bold mb-8">Your video job posting is being processed. Returning to dashboard...</p>
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                    </div>
                ) : (
                    <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                        {error && (
                            <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-4 text-red-600 font-bold">
                                <AlertCircle className="w-6 h-6 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="p-8 md:p-12">
                            {/* Step 1: Job Details */}
                            {step === 1 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> Role Title</div>
                                            <span className="text-[10px] font-medium" dir="rtl">عہدے کا نام</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Senior Full Stack Developer"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-bold text-lg"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </div>

                                    <TagInput
                                        label="Required Skills"
                                        urduLabel="مہارتیں"
                                        tags={formData.skills}
                                        onChange={(tags) => setFormData(prev => ({ ...prev, skills: tags }))}
                                        placeholder="e.g. React, Node.js, Firebase..."
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                                Experience Range
                                                <span className="text-[10px] font-medium" dir="rtl">تجربہ</span>
                                            </label>
                                            <select
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none"
                                                value={formData.experienceRequired}
                                                onChange={e => setFormData({ ...formData, experienceRequired: e.target.value })}
                                            >
                                                <option value="">Select Range</option>
                                                <option value="Fresher / 0-1 Year">Fresher / 0-1 Year</option>
                                                <option value="1-3 Years">1-3 Years</option>
                                                <option value="3-5 Years">3-5 Years</option>
                                                <option value="5-10 Years">5-10 Years</option>
                                                <option value="10+ Years">10+ Years</option>
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                                Job Type
                                                <span className="text-[10px] font-medium" dir="rtl">کام کی قسم</span>
                                            </label>
                                            <select
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none"
                                                value={formData.type}
                                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                            >
                                                <option value="Full-time">Full-time</option>
                                                <option value="Part-time">Part-time</option>
                                                <option value="Contract">Contract</option>
                                                <option value="Freelance">Freelance</option>
                                                <option value="Internship">Internship</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                            Detailed Description
                                            <span className="text-[10px] font-medium" dir="rtl">تفصیلات</span>
                                        </label>
                                        <textarea
                                            rows={6}
                                            placeholder="Tell candidates what they'll be doing..."
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none font-bold resize-none"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Logistics & Compensation */}
                            {step === 2 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Job City</div>
                                            <span className="text-[10px] font-medium" dir="rtl">شہر</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Karachi, Lahore, Islamabad"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                                            value={formData.location}
                                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> Salary Range (PKR)</div>
                                            <span className="text-[10px] font-medium" dir="rtl">تنخواہ</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., 50,000 - 80,000"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                                            value={formData.salaryRange}
                                            onChange={e => setFormData({ ...formData, salaryRange: e.target.value })}
                                        />
                                        <div className="flex items-center gap-3 pt-2">
                                            <input
                                                type="checkbox"
                                                id="hideSalary"
                                                className="w-5 h-5 rounded-lg border-slate-300 text-orange-500 focus:ring-orange-500"
                                                checked={formData.hideSalary}
                                                onChange={e => setFormData({ ...formData, hideSalary: e.target.checked })}
                                            />
                                            <label htmlFor="hideSalary" className="text-xs font-black uppercase text-slate-500 tracking-wider cursor-pointer select-none">Hide Salary from candidates</label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Company Preview */}
                            {step === 3 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Posting Identity</h3>
                                        <div className="flex items-center gap-6">
                                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm">
                                                {(user as any).company?.logo || user.photoURL ? (
                                                    <Image
                                                        src={(user as any).company?.logo || user.photoURL}
                                                        alt="Company logo"
                                                        width={80}
                                                        height={80}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Building2 className="w-8 h-8 text-slate-300" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black text-slate-900 italic tracking-tight uppercase">{(user as any).company?.name || user.displayName || 'Company'}</h4>
                                                <div className="flex flex-col gap-1 mt-1">
                                                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                                                        {(user as any).company?.industry || (user as any).industry || 'Industry Not Set'}
                                                    </p>
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" /> {(user as any).company?.address || (user as any).profile?.location || 'Location Not Set'}
                                                    </p>
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                                        <Info className="w-3 h-3" /> {(user as any).company?.phone || (user as any).profile?.phone || 'Phone Not Set'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="mt-8 text-slate-500 text-sm font-bold leading-relaxed">
                                            This information is pulled from your company profile. If you need to change it, please update your profile first.
                                        </p>
                                    </div>

                                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-[2rem] space-y-4">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Quick Review</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-black uppercase">Role</p>
                                                <p className="font-bold text-slate-800">{formData.title}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-black uppercase">Type</p>
                                                <p className="font-bold text-slate-800">{formData.type}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-black uppercase">Location</p>
                                                <p className="font-bold text-slate-800">{formData.location}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-black uppercase">Salary</p>
                                                <p className="font-bold text-slate-800">{formData.hideSalary ? 'Hidden' : formData.salaryRange}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Video Upload/Record */}
                            {step === 4 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                    {!file ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[400px]">
                                            {/* Record Option */}
                                            <div
                                                className="group relative bg-slate-900 rounded-[2rem] overflow-hidden shadow-xl flex flex-col items-center justify-center p-8 text-center"
                                            >
                                                <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-40" />
                                                <div className="relative z-10 flex flex-col items-center">
                                                    {!streamRef.current ? (
                                                        <button
                                                            onClick={startCamera}
                                                            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all text-slate-900"
                                                        >
                                                            <MonitorPlay className="w-8 h-8" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={isRecording ? stopRecording : startRecording}
                                                            className={cn(
                                                                "w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all",
                                                                isRecording ? "bg-white text-red-600 animate-pulse" : "bg-red-600 text-white hover:scale-110 active:scale-95"
                                                            )}
                                                        >
                                                            {isRecording ? <StopCircle className="w-10 h-10" /> : <div className="w-8 h-8 bg-white rounded-full shadow-lg" />}
                                                        </button>
                                                    )}
                                                    <h4 className="mt-4 text-white font-black italic uppercase tracking-tighter">
                                                        {isRecording ? `Recording ${recordingTime}s` : 'Record Intro'}
                                                    </h4>
                                                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-2">Max 60 Seconds</p>
                                                </div>
                                            </div>

                                            {/* Upload Option */}
                                            <div className="group relative border-4 border-dashed border-slate-100 rounded-[2rem] bg-slate-50 flex flex-col items-center justify-center p-8 text-center hover:bg-orange-50/50 hover:border-orange-200 transition-all cursor-pointer">
                                                <input
                                                    type="file"
                                                    accept="video/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    onChange={e => {
                                                        const f = e.target.files?.[0];
                                                        if (f) {
                                                            setFile(f);
                                                            setPreviewUrl(URL.createObjectURL(f));
                                                        }
                                                    }}
                                                />
                                                <div className="w-20 h-20 bg-white rounded-full shadow-xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform mb-4">
                                                    <Upload className="w-8 h-8" />
                                                </div>
                                                <h4 className="text-slate-900 font-black italic uppercase tracking-tighter">Upload Intro</h4>
                                                <p className="text-slate-400 text-[10px] font-bold uppercase mt-2 tracking-widest">MP4, WebM Max 100MB</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in zoom-in-95 duration-500">
                                            <div className="relative aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white group">
                                                <video src={previewUrl!} controls className="w-full h-full" />
                                                <button
                                                    onClick={() => { setFile(null); setPreviewUrl(null); }}
                                                    className="absolute top-4 right-4 w-10 h-10 bg-red-500 text-white rounded-xl shadow-lg flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>

                                            {uploading && (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optimizing for Cloud</span>
                                                        <span className="text-sm font-black text-orange-600 italic">{uploadProgress}%</span>
                                                    </div>
                                                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-orange-500 transition-all duration-300 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                                                            style={{ width: `${uploadProgress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
                                        <Info className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                                        <p className="text-blue-700 text-sm font-bold leading-relaxed">
                                            Adding a video introduction makes your job posting <span className="text-blue-900 font-black italic">8x more likely</span> to get applications.
                                            Briefly explain the role and company culture!
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Footer Buttons */}
                            <div className="mt-12 flex items-center justify-between pt-8 border-t border-slate-100">
                                {step > 1 ? (
                                    <button
                                        onClick={prevStep}
                                        className="inline-flex items-center gap-2 px-8 py-4 text-slate-400 font-black uppercase tracking-widest hover:text-slate-900 transition-all"
                                    >
                                        <ArrowLeft className="w-5 h-5" /> Back
                                    </button>
                                ) : <div />}

                                <button
                                    onClick={step === 4 ? handleFinalSubmit : nextStep}
                                    disabled={saving}
                                    className="flex-1 py-6 bg-blue-600 text-white rounded-[2rem] font-black italic uppercase tracking-tighter text-xl shadow-2xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4 group"
                                >
                                    <div className="flex flex-col items-center">
                                        <span>{saving ? 'Processing...' : (step === 4 ? 'Confirm & Post' : 'Continue')}</span>
                                        <span className="text-xs font-medium opacity-80" dir="rtl">{step === 4 ? 'پوسٹ مکمل کریں' : 'جاری رکھیں'}</span>
                                    </div>
                                    {!saving && <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Company Profile Gate (Prompt 5)
function ProfileGate({ user, onComplete }: { user: any, onComplete: () => void }) {
    const [formData, setFormData] = useState({
        yearEstablished: user?.yearEstablished || '',
        website: user?.website || '',
        hrFullName: user?.hrName || user?.hrFullName || '',
        hrPhone: user?.phone || user?.hrPhone || '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checklist = [
        { id: 'yearEstablished', label: 'Year Established', complete: !!formData.yearEstablished },
        { id: 'website', label: 'Company Website', complete: !!formData.website.trim() },
        { id: 'hrFullName', label: 'HR Full Name', complete: !!formData.hrFullName.trim() },
        { id: 'hrPhone', label: 'HR Phone', complete: !!formData.hrPhone.trim() }
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
            const { updateProfile: firebaseUpdateProfile } = await import('firebase/auth');
            const { auth } = await import('@/lib/firebase/firebase-config');

            // Update Firestore Profile
            await updateUserProfile(user.uid, {
                yearEstablished: formData.yearEstablished,
                website: formData.website.trim(),
                hrName: formData.hrFullName.trim(),
                hrFullName: formData.hrFullName.trim(),
                hrPhone: formData.hrPhone.trim(),
                phone: formData.hrPhone.trim(),
                updatedAt: new Date()
            } as any);

            // Update Firebase Auth displayName (for navbar and greeting consistency)
            if (auth.currentUser) {
                await firebaseUpdateProfile(auth.currentUser, {
                    displayName: formData.hrFullName.trim()
                });
            }

            onComplete();
        } catch (err: any) {
            console.error('Employer ProfileGate submit error:', err);
            setError(err.message || 'Failed to update company profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center animate-in fade-in duration-700">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="p-8 md:p-10">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">Company Setup</h2>
                            <div className="text-right">
                                <span className="text-blue-600 font-black text-xl italic">{Math.round(progress)}%</span>
                                <div className="w-24 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                    <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 rounded-2xl p-6 mb-8 border border-blue-100">
                            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Verification Details</h3>
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

                        {error && <p className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold">{error}</p>}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Year Established</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                        <input
                                            type="number"
                                            required
                                            min="1900"
                                            max={new Date().getFullYear()}
                                            placeholder="e.g. 2015"
                                            className="w-full pl-12 pr-6 py-3 bg-slate-50 border-2 border-slate-50 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                                            value={formData.yearEstablished}
                                            onChange={e => setFormData({ ...formData, yearEstablished: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Website</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                        <input
                                            type="url"
                                            required
                                            placeholder="https://example.com"
                                            className="w-full pl-12 pr-6 py-3 bg-slate-50 border-2 border-slate-50 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                                            value={formData.website}
                                            onChange={e => setFormData({ ...formData, website: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">HR/Contact Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-50 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                                        value={formData.hrFullName}
                                        onChange={e => setFormData({ ...formData, hrFullName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">HR Mobile Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                        <input
                                            type="tel"
                                            required
                                            placeholder="03XXXXXXXXX"
                                            className="w-full pl-12 pr-6 py-3 bg-slate-50 border-2 border-slate-50 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                                            value={formData.hrPhone}
                                            onChange={e => setFormData({ ...formData, hrPhone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving || !isReady}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Save & Start Posting <ArrowRight className="w-5 h-5" /></>}
                            </button>
                        </form>
                    </div>

                    <div className="bg-blue-50 p-8 border-t border-blue-100">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Company Verification</h3>
                                <p className="text-[11px] text-blue-800 font-bold leading-relaxed uppercase tracking-wide">
                                    Providing accurate company details helps us build trust with candidates and ensures your jobs are seen by the right people.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
