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
    MonitorPlay
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function PostJobPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    // Multi-step state
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

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

    // Reset recording timer
    useEffect(() => {
        if (isRecording && recordingTime >= MAX_DURATION) {
            stopRecording();
            setError("Maximum duration of 1 minute reached.");
        }
    }, [isRecording, recordingTime, stopRecording]);

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

    return (
        <div className="min-h-screen bg-[#F8FAFF] py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Post Video Job</h1>
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
                        <h2 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase mb-4">Job Posted!</h2>
                        <p className="text-slate-500 font-bold mb-8">Your video job posting is being processed. Returning to dashboard...</p>
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
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
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Briefcase className="w-4 h-4" /> Role Title
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Senior Full Stack Developer"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-bold text-lg"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Tag className="w-4 h-4" /> Skills (Press Enter to add)
                                        </label>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {formData.skills.map(skill => (
                                                <button
                                                    key={skill}
                                                    onClick={() => handleRemoveSkill(skill)}
                                                    className="px-4 py-2 bg-orange-100 text-orange-700 rounded-xl text-xs font-black uppercase tracking-tight hover:bg-red-100 hover:text-red-700 transition-colors flex items-center gap-2"
                                                >
                                                    {skill} <X className="w-3 h-3" />
                                                </button>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="e.g., React, Node.js, Firebase..."
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-bold"
                                            value={skillInput}
                                            onChange={e => setSkillInput(e.target.value)}
                                            onKeyDown={handleAddSkill}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Experience Range</label>
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
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Job Type</label>
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
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Detailed Description</label>
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
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <MapPin className="w-4 h-4" /> Job City
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
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <DollarSign className="w-4 h-4" /> Salary Range (PKR)
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
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={(user as any).company?.logo || user.photoURL} alt="Company logo" className="w-full h-full object-cover" />
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
                                    className="inline-flex items-center gap-3 px-10 py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] font-black italic uppercase tracking-tighter shadow-xl shadow-slate-900/10 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin" /> Processing...
                                        </>
                                    ) : (
                                        <>
                                            {step === 4 ? 'Confirm & Post' : 'Continue'}
                                            {step < 4 && <ArrowRight className="w-5 h-5" />}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
