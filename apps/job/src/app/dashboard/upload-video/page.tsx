'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { uploadToCloudinary } from '@/lib/services/cloudinaryUpload';
import { db } from '@/lib/firebase/firebase-config';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Video, CheckCircle, AlertCircle, X } from 'lucide-react';
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

/* ─── buildOverlayData ─────────────────────────────────────────── */
function buildOverlayData(formData: Record<string, any>, category: string, role: string) {
    const map: Record<string, Record<string, any>> = {
        jobs: {
            provider: {
                title: formData.jobTitle || '',
                badge: 'Job Seeker',
                field1: Array.isArray(formData.skills) ? formData.skills.join(' • ') : '',
                field2: formData.experienceLevel || '',
            },
            seeker: {
                title: formData.hiringFor || '',
                badge: 'Hiring',
                field1: Array.isArray(formData.requiredSkills) ? formData.requiredSkills.join(' • ') : '',
                field2: formData.salary ? `Salary: Rs. ${Number(formData.salary).toLocaleString()}/mo` : '',
            },
        },
        healthcare: {
            provider: {
                title: formData.specialization || '',
                badge: 'Doctor',
                field1: formData.specialization || '',
                field2: formData.experienceLevel || '',
            },
            seeker: {
                title: formData.doctorNeeded || '',
                badge: 'Seeking Doctor',
                field1: formData.doctorNeeded || '',
                field2: formData.locationPref || '',
            },
        },
        education: {
            provider: {
                title: formData.subject || '',
                badge: 'Teacher',
                field1: formData.subject || '',
                field2: formData.gradeLevel || '',
            },
            seeker: {
                title: formData.subjectNeeded || '',
                badge: 'Student',
                field1: formData.subjectNeeded || '',
                field2: formData.budget ? `Budget: Rs. ${Number(formData.budget).toLocaleString()}/mo` : '',
            },
        },
        marriage: {
            provider: {
                title: formData.profession || '',
                badge: 'Profile',
                field1: formData.ageRange || '',
                field2: formData.city || '',
            },
            seeker: {
                title: formData.lookingForProfession || '',
                badge: 'Looking',
                field1: formData.preferredAge || '',
                field2: formData.preferredCity || '',
            },
        },
        domestic: {
            provider: {
                title: formData.workType || '',
                badge: 'Helper',
                field1: formData.experienceLevel || '',
                field2: formData.expectedSalary ? `Rs. ${Number(formData.expectedSalary).toLocaleString()}/mo` : '',
            },
            seeker: {
                title: formData.helpNeeded || '',
                badge: 'Household',
                field1: formData.workHours || '',
                field2: formData.budget ? `Budget: Rs. ${Number(formData.budget).toLocaleString()}/mo` : '',
            },
        },
        legal: {
            provider: {
                title: formData.specialization || '',
                badge: 'Lawyer',
                field1: formData.court || '',
                field2: formData.experienceLevel || '',
            },
            seeker: {
                title: formData.issueType || '',
                badge: 'Client',
                field1: formData.issueType || '',
                field2: '',
            },
        },
        realestate: {
            provider: {
                title: formData.propSpecialization || '',
                badge: 'Agent',
                field1: formData.areaCity || '',
                field2: formData.experienceLevel || '',
            },
            seeker: {
                title: formData.lookingFor || '',
                badge: 'Buyer / Renter',
                field1: formData.budgetRange || '',
                field2: formData.preferredCity || '',
            },
        },
        it: {
            provider: {
                title: formData.roleTitle || '',
                badge: 'Freelancer',
                field1: Array.isArray(formData.skills) ? formData.skills.join(' • ') : '',
                field2: formData.experienceLevel || '',
            },
            seeker: {
                title: formData.lookingFor || '',
                badge: 'Hiring',
                field1: Array.isArray(formData.requiredSkills) ? formData.requiredSkills.join(' • ') : '',
                field2: formData.budget ? `Budget: Rs. ${Number(formData.budget).toLocaleString()}` : '',
            },
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
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 8, fontFamily: 'DM Sans' }}>
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
                            border: value === o ? '1.5px solid var(--accent)' : '1.5px solid #2a2a2a',
                            background: value === o ? 'rgba(255,0,105,0.12)' : '#111',
                            color: value === o ? 'var(--accent)' : '#888',
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
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 8, fontFamily: 'DM Sans' }}>
                {label}{required && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%', padding: '12px 14px', background: '#111', border: '1.5px solid #2a2a2a',
                    borderRadius: 10, color: '#fff', fontSize: 14, fontFamily: 'DM Sans', outline: 'none',
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
                <TextInput label="Job Title" placeholder='e.g. "Senior UI Designer"' value={formData.jobTitle || ''} onChange={set('jobTitle')} required />
                <PillSelector label="Experience Level" options={EXP_LEVELS} value={formData.experienceLevel || ''} onChange={set('experienceLevel')} required />
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 8, fontFamily: 'DM Sans' }}>
                        Top 3 Skills <span style={{ color: 'var(--accent)' }}>*</span>
                    </label>
                    <TagInput
                        tags={formData.skills || []}
                        onChange={(tags) => set('skills')(tags.slice(0, 3))}
                        placeholder="Add a skill..."
                    />
                </div>
            </>
        );
    }
    if (category === 'jobs' && role === 'seeker') {
        return (
            <>
                <TextInput label="Job Role You're Hiring For" placeholder='e.g. "Full Stack Developer"' value={formData.hiringFor || ''} onChange={set('hiringFor')} required />
                <PillSelector label="Required Experience" options={EXP_LEVELS} value={formData.experienceLevel || ''} onChange={set('experienceLevel')} required />
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 8, fontFamily: 'DM Sans' }}>
                        Top 3 Required Skills <span style={{ color: 'var(--accent)' }}>*</span>
                    </label>
                    <TagInput
                        tags={formData.requiredSkills || []}
                        onChange={(tags) => set('requiredSkills')(tags.slice(0, 3))}
                        placeholder="Add a skill..."
                    />
                </div>
                <TextInput label="Salary Offered (PKR/month)" placeholder='e.g. "150000"' value={formData.salary || ''} onChange={set('salary')} required type="number" />
                <PillSelector label="Your Title at Company" options={['HR Manager', 'Founder/CEO', 'Department Head', 'Recruiter']} value={formData.companyTitle || ''} onChange={set('companyTitle')} required />
            </>
        );
    }
    if (category === 'healthcare' && role === 'provider') {
        return (
            <>
                <TextInput label="Specialization" placeholder='e.g. "Cardiologist"' value={formData.specialization || ''} onChange={set('specialization')} required />
                <PillSelector label="Years of Experience" options={EXP_LEVELS} value={formData.experienceLevel || ''} onChange={set('experienceLevel')} required />
                <TextInput label="PMDC Number (optional)" placeholder="PMDC-XXXXX" value={formData.pmdcNumber || ''} onChange={set('pmdcNumber')} />
            </>
        );
    }
    if (category === 'healthcare' && role === 'seeker') {
        return (
            <>
                <TextInput label="Type of Doctor Needed" placeholder='e.g. "Cardiologist"' value={formData.doctorNeeded || ''} onChange={set('doctorNeeded')} required />
                <TextInput label="Location Preference" placeholder='e.g. "Karachi"' value={formData.locationPref || ''} onChange={set('locationPref')} required />
            </>
        );
    }
    if (category === 'education' && role === 'provider') {
        return (
            <>
                <TextInput label="Subject / Course" placeholder='e.g. "Mathematics"' value={formData.subject || ''} onChange={set('subject')} required />
                <PillSelector label="Grade Level / Audience" options={['School', 'College', 'University', 'Professional']} value={formData.gradeLevel || ''} onChange={set('gradeLevel')} required />
                <PillSelector label="Mode" options={['Online', 'In-Person', 'Both']} value={formData.mode || ''} onChange={set('mode')} required />
            </>
        );
    }
    if (category === 'education' && role === 'seeker') {
        return (
            <>
                <TextInput label="Subject Looking For" placeholder='e.g. "Physics"' value={formData.subjectNeeded || ''} onChange={set('subjectNeeded')} required />
                <TextInput label="Budget (PKR/month, optional)" placeholder='e.g. "5000"' value={formData.budget || ''} onChange={set('budget')} type="number" />
            </>
        );
    }
    if (category === 'marriage' && role === 'provider') {
        return (
            <>
                <TextInput label="Candidate's Profession" placeholder='e.g. "Doctor"' value={formData.profession || ''} onChange={set('profession')} required />
                <TextInput label="Age Range" placeholder='e.g. "25-30"' value={formData.ageRange || ''} onChange={set('ageRange')} required />
                <TextInput label="City" placeholder='e.g. "Karachi"' value={formData.city || ''} onChange={set('city')} required />
            </>
        );
    }
    if (category === 'marriage' && role === 'seeker') {
        return (
            <>
                <TextInput label="Looking for (Profession)" placeholder='e.g. "Engineer"' value={formData.lookingForProfession || ''} onChange={set('lookingForProfession')} required />
                <TextInput label="Preferred Age Range" placeholder='e.g. "25-30"' value={formData.preferredAge || ''} onChange={set('preferredAge')} required />
                <TextInput label="Preferred City" placeholder='e.g. "Lahore"' value={formData.preferredCity || ''} onChange={set('preferredCity')} required />
            </>
        );
    }
    if (category === 'domestic' && role === 'provider') {
        return (
            <>
                <PillSelector label="Type of Work" options={['Cook', 'Driver', 'Cleaner', 'Gardener', 'Nanny', 'Guard']} value={formData.workType || ''} onChange={set('workType')} required />
                <PillSelector label="Experience" options={EXP_LEVELS} value={formData.experienceLevel || ''} onChange={set('experienceLevel')} required />
                <TextInput label="Expected Salary (PKR/month)" placeholder='e.g. "15000"' value={formData.expectedSalary || ''} onChange={set('expectedSalary')} required type="number" />
            </>
        );
    }
    if (category === 'domestic' && role === 'seeker') {
        return (
            <>
                <PillSelector label="Help Needed" options={['Cook', 'Driver', 'Cleaner', 'Gardener', 'Nanny', 'Guard']} value={formData.helpNeeded || ''} onChange={set('helpNeeded')} required />
                <PillSelector label="Work Hours" options={['Full Time', 'Part Time', 'Live-In']} value={formData.workHours || ''} onChange={set('workHours')} required />
                <TextInput label="Budget (PKR/month)" placeholder='e.g. "20000"' value={formData.budget || ''} onChange={set('budget')} required type="number" />
            </>
        );
    }
    if (category === 'legal' && role === 'provider') {
        return (
            <>
                <TextInput label="Specialization" placeholder='e.g. "Criminal Law"' value={formData.specialization || ''} onChange={set('specialization')} required />
                <PillSelector label="Court" options={['District Court', 'High Court', 'Supreme Court']} value={formData.court || ''} onChange={set('court')} required />
                <PillSelector label="Years of Experience" options={EXP_LEVELS} value={formData.experienceLevel || ''} onChange={set('experienceLevel')} required />
            </>
        );
    }
    if (category === 'legal' && role === 'seeker') {
        return (
            <TextInput label="Legal Issue Type" placeholder='e.g. "Property Dispute"' value={formData.issueType || ''} onChange={set('issueType')} required />
        );
    }
    if (category === 'realestate' && role === 'provider') {
        return (
            <>
                <PillSelector label="Specialization" options={['Buy/Sell', 'Rental', 'Commercial', 'Land']} value={formData.propSpecialization || ''} onChange={set('propSpecialization')} required />
                <TextInput label="Area / City" placeholder='e.g. "DHA Karachi"' value={formData.areaCity || ''} onChange={set('areaCity')} required />
                <PillSelector label="Experience" options={EXP_LEVELS} value={formData.experienceLevel || ''} onChange={set('experienceLevel')} required />
            </>
        );
    }
    if (category === 'realestate' && role === 'seeker') {
        return (
            <>
                <PillSelector label="Looking For" options={['House', 'Apartment', 'Commercial', 'Land']} value={formData.lookingFor || ''} onChange={set('lookingFor')} required />
                <TextInput label="Budget Range" placeholder='e.g. "1-2 Crore"' value={formData.budgetRange || ''} onChange={set('budgetRange')} required />
                <TextInput label="Preferred City" placeholder='e.g. "Lahore"' value={formData.preferredCity || ''} onChange={set('preferredCity')} required />
            </>
        );
    }
    if (category === 'it' && role === 'provider') {
        return (
            <>
                <TextInput label="Role / Title" placeholder='e.g. "React Developer"' value={formData.roleTitle || ''} onChange={set('roleTitle')} required />
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 8, fontFamily: 'DM Sans' }}>
                        Top 3 Skills <span style={{ color: 'var(--accent)' }}>*</span>
                    </label>
                    <TagInput
                        tags={formData.skills || []}
                        onChange={(tags) => set('skills')(tags.slice(0, 3))}
                        placeholder="Add a skill..."
                    />
                </div>
                <PillSelector label="Experience" options={EXP_LEVELS} value={formData.experienceLevel || ''} onChange={set('experienceLevel')} required />
                <TextInput label="Hourly / Project Rate (PKR, optional)" placeholder='e.g. "5000"' value={formData.rate || ''} onChange={set('rate')} type="number" />
            </>
        );
    }
    if (category === 'it' && role === 'seeker') {
        return (
            <>
                <TextInput label="Looking For" placeholder='e.g. "Mobile App Developer"' value={formData.lookingFor || ''} onChange={set('lookingFor')} required />
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 8, fontFamily: 'DM Sans' }}>
                        Top 3 Required Skills <span style={{ color: 'var(--accent)' }}>*</span>
                    </label>
                    <TagInput
                        tags={formData.requiredSkills || []}
                        onChange={(tags) => set('requiredSkills')(tags.slice(0, 3))}
                        placeholder="Add a skill..."
                    />
                </div>
                <TextInput label="Budget (PKR, optional)" placeholder='e.g. "50000"' value={formData.budget || ''} onChange={set('budget')} type="number" />
            </>
        );
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
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState<number>(0);
    const [validationError, setValidationError] = useState<string | null>(null);

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [caption, setCaption] = useState('');

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    /* Auth guard */
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
    }, [authLoading, user, router]);

    if (authLoading || !user) {
        return (
            <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #222', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
        );
    }

    const userCategory = (user as any).category || 'jobs';
    const userRole = (user as any).role || 'provider';

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

            // 2. Build overlay data
            const overlayData = buildOverlayData(formData, userCategory, userRole);

            // 3. Write to Firestore 'videos' collection (schema admin page reads)
            const videoDocRef = await addDoc(collection(db, 'videos'), {
                // User info
                userId: user.uid,
                userEmail: user.email,
                userName: (user as any).displayName || (user as any).name || '',
                userPhoto: (user as any).photoURL || '',

                // Video
                cloudinaryUrl: result.secureUrl,
                cloudinaryPublicId: result.publicId,

                // Category
                category: userCategory,
                userRole: userRole,
                city: (user as any).city || '',

                // Overlay (shown on feed card)
                overlayData: {
                    title: overlayData.title,
                    badge: overlayData.badge,
                    field1: overlayData.field1,
                    field2: overlayData.field2,
                    location: (user as any).city || '',
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
        setFormData({});
        setCaption('');
        setUploadError(null);
        setUploadProgress(0);
    };

    /* ─── STYLES ────────────────────────────────────────────────── */
    const pageStyle: React.CSSProperties = {
        minHeight: '100dvh',
        background: '#000',
        paddingBottom: 80,
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid #111',
        position: 'sticky',
        top: 0,
        background: 'rgba(0,0,0,0.95)',
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
        fontFamily: 'Syne, sans-serif',
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
                    <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: '#fff' }}>Upload Complete</span>
                </div>
                <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                    <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
                    <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 26, color: '#fff', marginBottom: 10 }}>
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
                        <ArrowLeft size={20} color="#fff" />
                    </button>
                    <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: '#fff' }}>Upload Video</span>
                    <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#555' }}>1 of 2</span>
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
                            border: videoFile ? '2px solid var(--accent)' : '2px dashed #2a2a2a',
                            borderRadius: 20,
                            overflow: 'hidden',
                            cursor: videoFile ? 'default' : 'pointer',
                            background: '#0a0a0a',
                            marginBottom: 16,
                            minHeight: videoFile ? 'auto' : 220,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'border-color 0.2s',
                        }}
                    >
                        {!videoFile ? (
                            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                                <div style={{ fontSize: 48, marginBottom: 12 }}>📹</div>
                                <p style={{ color: '#fff', fontFamily: 'Syne', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                                    Tap to select your video
                                </p>
                                <p style={{ color: '#555', fontFamily: 'DM Sans', fontSize: 12 }}>
                                    MP4, MOV, WebM
                                </p>
                                <p style={{ color: '#555', fontFamily: 'DM Sans', fontSize: 12, marginTop: 4 }}>
                                    Max 80 seconds · Max 200 MB
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
                                background: '#111', border: '1.5px solid #2a2a2a',
                                borderRadius: 12, color: '#888', fontFamily: 'DM Sans',
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
                    <ArrowLeft size={20} color="#fff" />
                </button>
                <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: '#fff' }}>Video Details</span>
                <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#555' }}>2 of 2</span>
            </div>

            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 6, padding: '12px 20px' }}>
                {[1, 2].map(s => (
                    <div key={s} style={{ flex: 1, height: 3, borderRadius: 999, background: 'var(--accent)' }} />
                ))}
            </div>

            <div style={{ padding: '16px 20px' }}>
                {/* Mini preview */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, background: '#0a0a0a', borderRadius: 14, padding: '12px', border: '1px solid #1a1a1a' }}>
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
                        <p style={{ color: '#555', fontFamily: 'DM Sans', fontSize: 11, margin: 0 }}>
                            {formatDuration(videoDuration)} · {formatBytes(videoFile?.size || 0)}
                        </p>
                    </div>
                </div>

                {/* Section label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{ flex: 1, height: 1, background: '#1a1a1a' }} />
                    <span style={{ color: '#555', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Tell us about this video
                    </span>
                    <div style={{ flex: 1, height: 1, background: '#1a1a1a' }} />
                </div>

                {/* Conditional fields */}
                <ConditionalFields
                    category={userCategory}
                    role={userRole}
                    formData={formData}
                    onChange={(key, val) => setFormData(prev => ({ ...prev, [key]: val }))}
                />

                {/* Caption */}
                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 8, fontFamily: 'DM Sans' }}>
                        Caption <span style={{ color: '#444' }}>(optional)</span>
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
                            background: '#111', border: '1.5px solid #2a2a2a',
                            borderRadius: 10, color: '#fff', fontSize: 14,
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
