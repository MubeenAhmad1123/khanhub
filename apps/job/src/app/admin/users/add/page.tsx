'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/firebase-config';
import { serverTimestamp, setDoc, doc, writeBatch, collection, addDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { uploadToCloudinary, uploadCompanyLogo } from '@/lib/services/cloudinaryUpload';
import { writeActivityLog } from '@/hooks/useActivityLog';
import { calculateProfileStrength } from '@/lib/services/pointsSystem';
import {
    UserPlus,
    ArrowLeft,
    Video,
    Building2,
    User as UserIcon,
    Upload,
    CheckCircle2,
    Loader2,
    X,
    ArrowRight,
    Globe,
    Target,
    Briefcase,
    Plus,
    Building,
    Check,
    ChevronRight,
    Sparkles,
    TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { INDUSTRIES, getSubcategories, getRoles } from '@/lib/constants/categories';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import * as XLSX from 'xlsx';

export default function AddUserPage() {
    const { user: adminUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [role, setRole] = useState<'job_seeker' | 'employer'>('job_seeker');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

    // Bulk State
    const [bulkData, setBulkData] = useState<any[]>([]);
    const [importing, setImporting] = useState(false);

    // Form State (Combined)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        location: '',
        industry: '',
        subcategory: '',
        role_in_category: '',
        // Job Seeker Specific
        primarySkill: '',
        experience: '',
        skills: '',
        // Employer Specific
        companyName: '',
        website: '',
        size: '',
        address: '',
        tagline: '',
        description: '',
        foundedYear: '',
        contactPerson: '',
        logo: '',
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState('');

    // Video + Thumbnail + Context State
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
    const [uploadedThumbnail, setUploadedThumbnail] = useState<File | null>(null);
    const [videoContext, setVideoContext] = useState<any>({
        targetJobTitle: '',
        seekerExperience: '',
        hiringFor: '',
        expectedExperience: '',
        jobType: '',
        salaryMin: '',
        salaryMax: '',
        hideSalary: false,
    });

    const totalSteps = role === 'job_seeker' ? 6 : 5;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setVideoFile(file);
        const url = URL.createObjectURL(file);
        setVideoPreview(url);
        setSelectedThumbnail(null);
        setUploadedThumbnail(null);
    };

    const handleClearVideo = () => {
        if (videoPreview) URL.revokeObjectURL(videoPreview);
        setVideoFile(null);
        setVideoPreview(null);
        setSelectedThumbnail(null);
        setUploadedThumbnail(null);
    };

    const nextStep = () => {
        // Basic validation for current step
        if (step === 1) {
            if (!formData.name || !formData.email) {
                toast('Name and Email are required', 'error');
                return;
            }
        }
        setStep(prev => Math.min(prev + 1, totalSteps));
    };

    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setLoading(true);
            setUploadProgress(0);

            // 1. Handle Employer Logo
            let finalLogoUrl = '';
            if (role === 'employer' && logoFile) {
                const result = await uploadCompanyLogo(logoFile, `admin_${Date.now()}`);
                finalLogoUrl = result.secureUrl;
            }

            // 2. Upload video to Cloudinary (if provided)
            let finalVideoUrl = '';
            if (videoFile) {
                const videoResult = await uploadToCloudinary(
                    videoFile,
                    `khanhub/admin_uploads/${Date.now()}`,
                    (p) => setUploadProgress(p.percentage),
                    'video'
                );
                finalVideoUrl = videoResult.secureUrl;
            }

            // 3. Upload thumbnail to Cloudinary
            let finalThumbnailUrl = '';
            if (uploadedThumbnail) {
                const thumbResult = await uploadToCloudinary(
                    uploadedThumbnail,
                    `khanhub/thumbnails/${Date.now()}`,
                    () => { }
                );
                finalThumbnailUrl = thumbResult.secureUrl;
            } else if (selectedThumbnail) {
                // Convert base64 canvas capture to blob then upload
                const res = await fetch(selectedThumbnail);
                const blob = await res.blob();
                const thumbFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
                const thumbResult = await uploadToCloudinary(
                    thumbFile,
                    `khanhub/thumbnails/${Date.now()}`,
                    () => { }
                );
                finalThumbnailUrl = thumbResult.secureUrl;
            }

            // 4. Prepare user data
            const userId = `manual_${Date.now()}`;

            const userData: any = {
                uid: userId,
                name: formData.name,
                displayName: role === 'employer' ? (formData.contactPerson || formData.name) : formData.name,
                email: formData.email.toLowerCase(),
                phone: formData.phone,
                location: formData.location,
                industry: formData.industry,
                subcategory: formData.subcategory,
                role_in_category: formData.role_in_category,
                role: role,
                profile_status: 'active',
                paymentStatus: 'approved',
                isPremium: true,
                video_upload_enabled: true,
                isBanned: false,
                onboardingCompleted: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: adminUser?.uid || 'admin',
            };

            if (role === 'job_seeker') {
                const skillsList = formData.skills.split(',').map(s => s.trim()).filter(s => s);
                userData.profile = {
                    fullName: formData.name,
                    phone: formData.phone,
                    location: formData.location,
                    industry: formData.industry,
                    preferredSubcategory: formData.subcategory,
                    preferredJobTitle: formData.role_in_category || formData.primarySkill,
                    yearsOfExperience: parseInt(formData.experience) || 0,
                    skills: skillsList,
                    onboardingCompleted: true,
                    profileStrength: calculateProfileStrength({
                        profile: {
                            skills: skillsList,
                            yearsOfExperience: parseInt(formData.experience) || 0,
                        } as any
                    }),
                    completedSections: {
                        basicInfo: true,
                        skills: true,
                        cv: false,
                        video: !!finalVideoUrl,
                        experience: true,
                        education: false,
                        certifications: false,
                    }
                };
            } else {
                userData.company = {
                    name: formData.companyName || formData.name || '',
                    website: formData.website || '',
                    size: formData.size || '',
                    industry: formData.industry || '',
                    subcategory: formData.subcategory || '',
                    location: formData.location || '',
                    address: formData.address || '',
                    tagline: formData.tagline || '',
                    description: formData.description || '',
                    ...(formData.foundedYear ? { foundedYear: parseInt(formData.foundedYear) } : {}),
                    logo: finalLogoUrl || '',
                };
            }

            // 5. Save user doc
            const finalUserData = {
                ...userData,
                profile_status: 'active',
                video_upload_enabled: true,
                updatedAt: serverTimestamp()
            };
            await setDoc(doc(db, 'users', userId), finalUserData, { merge: true });

            // 6. Write video doc to videos collection (if video was uploaded)
            if (finalVideoUrl) {
                const videoDoc: any = {
                    userId,
                    userRole: role,
                    role: role,     // Standardizing on 'role'
                    userName: formData.name,
                    userEmail: formData.email.toLowerCase(),
                    videoUrl: finalVideoUrl,
                    thumbnailUrl: finalThumbnailUrl || '',
                    admin_status: 'approved', // Query field
                    status: 'approved',       // Legacy field
                    is_live: true,            // Visibility field
                    uploadedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    createdBy: adminUser?.uid || 'admin',
                };

                if (role === 'job_seeker') {
                    videoDoc.targetJobTitle = videoContext.targetJobTitle || '';
                    videoDoc.seekerExperience = videoContext.seekerExperience || '';
                } else {
                    videoDoc.hiringFor = videoContext.hiringFor || '';
                    videoDoc.expectedExperience = videoContext.expectedExperience || '';
                    videoDoc.jobType = videoContext.jobType || '';
                    videoDoc.salaryMin = videoContext.salaryMin || '';
                    videoDoc.salaryMax = videoContext.salaryMax || '';
                    videoDoc.hideSalary = videoContext.hideSalary || false;
                }

                await addDoc(collection(db, 'videos'), videoDoc);
            }

            // 7. Log activity
            await writeActivityLog({
                admin_id: adminUser?.uid || 'admin',
                action_type: 'user_created',
                target_id: userId,
                target_type: 'user',
                note: `Admin manually created ${role}: ${formData.email}`
            });

            toast(`${role === 'job_seeker' ? 'Candidate' : 'Company'} deployed successfully!`, 'success');
            router.push('/admin/users');
        } catch (err: any) {
            console.error('Submit error:', err);
            toast(err.message || 'Failed to deploy user', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            setBulkData(data);
            toast(`Parsed ${data.length} records from Excel`, 'success');
        };
        reader.readAsBinaryString(file);
    };

    const handleBulkImport = async () => {
        if (bulkData.length === 0 || !adminUser) return;

        try {
            setImporting(true);
            const batch = writeBatch(db);
            let count = 0;

            for (const row of bulkData) {
                const userId = `bulk_${Date.now()}_${count}`;
                const userRef = doc(db, 'users', userId);

                const newUser = {
                    uid: userId,
                    name: row['Full Name'] || row['Name'] || '',
                    displayName: row['Full Name'] || row['Name'] || '',
                    email: (row['Email'] || '').toLowerCase(),
                    phone: row['Phone'] || '',
                    location: row['City'] || row['Location'] || '',
                    industry: row['Industry'] || '',
                    subcategory: row['Subcategory'] || row['Sub-sector'] || '',
                    role_in_category: row['Role'] || row['Job Title'] || '',
                    role: 'job_seeker',
                    profile_status: 'active', // Admin upload bypasses gate
                    paymentStatus: 'approved',
                    isPremium: false,
                    video_upload_enabled: true,
                    isBanned: false,
                    onboardingCompleted: true,
                    bulkImported: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    createdBy: adminUser.uid,
                };

                // Create profile object for job seeker
                (newUser as any).profile = {
                    fullName: newUser.name,
                    phone: newUser.phone,
                    location: newUser.location,
                    industry: newUser.industry,
                    preferredSubcategory: newUser.subcategory,
                    preferredJobTitle: newUser.role_in_category,
                    onboardingCompleted: true,
                    profile_status: 'video_pending',
                    completedSections: {
                        basicInfo: true,
                        skills: false,
                        cv: false,
                        video: false,
                        experience: false,
                        education: false,
                        certifications: false,
                    }
                };

                batch.set(userRef, newUser);
                count++;

                // Firestore batches are limited to 500 writes
                if (count % 450 === 0) {
                    await batch.commit();
                }
            }

            await batch.commit();

            await writeActivityLog({
                admin_id: adminUser.uid,
                action_type: 'bulk_import',
                target_id: 'multiple',
                target_type: 'user',
                note: `Admin bulk imported ${bulkData.length} users`
            });

            toast(`Successfully imported ${bulkData.length} members!`, 'success');
            router.push('/admin/users');
        } catch (err: any) {
            console.error(err);
            toast(err.message || 'Bulk import failed', 'error');
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const template = [
            { 'Full Name': 'Ali Ahmed', 'Email': 'ali@example.com', 'Phone': '03001234567', 'City': 'Lahore', 'Industry': 'healthcare', 'Subcategory': 'medicine', 'Role': 'Cardiologist' },
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "KhanHub_Bulk_Import_Template.xlsx");
    };

    return (
        <div className="max-w-3xl mx-auto pb-20 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/users"
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 transition-all hover:border-slate-300 shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter flex items-center gap-3">
                            <UserPlus className="w-8 h-8 text-blue-600" />
                            Deploy Member
                        </h1>
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">Manual Onboarding Flow</p>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Step {step} of {totalSteps}</span>
                    <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-500"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex p-1.5 bg-slate-200/50 rounded-3xl w-fit mx-auto shadow-inner mb-4">
                <button
                    onClick={() => setActiveTab('single')}
                    className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black italic uppercase text-sm tracking-tighter transition-all ${activeTab === 'single' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-500 hover:bg-white/50'}`}
                >
                    <UserIcon className="w-4 h-4" />
                    Single Member
                </button>
                <button
                    onClick={() => setActiveTab('bulk')}
                    className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black italic uppercase text-sm tracking-tighter transition-all ${activeTab === 'bulk' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-500 hover:bg-white/50'}`}
                >
                    <Upload className="w-4 h-4" />
                    Bulk Upload
                </button>
            </div>

            {activeTab === 'single' ? (
                <>
                    {/* Role Switcher (Only on Step 1) */}
                    {step === 1 && (
                        <div className="flex p-1.5 bg-slate-200/50 rounded-3xl w-fit mx-auto shadow-inner">
                            <button
                                onClick={() => setRole('job_seeker')}
                                className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black italic uppercase text-sm tracking-tighter transition-all ${role === 'job_seeker' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-500 hover:bg-white/50'}`}
                            >
                                <UserIcon className="w-4 h-4" />
                                Candidate
                            </button>
                            <button
                                onClick={() => setRole('employer')}
                                className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black italic uppercase text-sm tracking-tighter transition-all ${role === 'employer' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-500 hover:bg-white/50'}`}
                            >
                                <Building2 className="w-4 h-4" />
                                Company
                            </button>
                        </div>
                    )}

                    <div className="bg-white p-8 md:p-12 rounded-[40px] border border-slate-200 shadow-sm min-h-[500px] flex flex-col justify-between">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* STEP 1: BASIC AUTH INFO */}
                            {step === 1 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="text-center space-y-2">
                                        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Registration Basics</h3>
                                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Core account identifiers</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Full Name</label>
                                            <input
                                                required
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                placeholder="Full Legal Name"
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Email Address</label>
                                            <input
                                                required
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                placeholder="user@example.com"
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* JOB SEEKER FLOW */}
                            {role === 'job_seeker' && (
                                <>
                                    {step === 2 && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 text-center">
                                            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                                                <Globe className="w-10 h-10" />
                                            </div>
                                            <div className="space-y-4 max-w-sm mx-auto text-left">
                                                <label className="text-xl font-black text-slate-900 uppercase italic block text-center">Select Industry</label>
                                                <SearchableSelect
                                                    options={INDUSTRIES.map(i => ({ id: i.id, label: i.label }))}
                                                    value={formData.industry}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, industry: val, subcategory: '', role_in_category: '' }))}
                                                    placeholder="Search Industry..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 text-center">
                                            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                                                <Target className="w-10 h-10" />
                                            </div>
                                            <div className="space-y-6 max-w-md mx-auto text-left">
                                                <div className="space-y-2">
                                                    <label className="text-xl font-black text-slate-900 uppercase italic block text-center">Sub-sector</label>
                                                    <SearchableSelect
                                                        options={getSubcategories(formData.industry).map(s => ({ id: s.id, label: s.label }))}
                                                        value={formData.subcategory}
                                                        onChange={(val) => setFormData(prev => ({ ...prev, subcategory: val, role_in_category: '' }))}
                                                        placeholder="Search Sub-sector..."
                                                    />
                                                </div>

                                                {formData.subcategory && (
                                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                        <label className="text-xl font-black text-slate-900 uppercase italic block text-center">Specific Role</label>
                                                        {getRoles(formData.industry, formData.subcategory).length > 0 ? (
                                                            <SearchableSelect
                                                                options={getRoles(formData.industry, formData.subcategory).map(r => ({ id: r, label: r }))}
                                                                value={formData.role_in_category}
                                                                onChange={(val) => setFormData(prev => ({ ...prev, role_in_category: val }))}
                                                                placeholder="Select Role..."
                                                            />
                                                        ) : (
                                                            <input
                                                                required
                                                                name="role_in_category"
                                                                value={formData.role_in_category}
                                                                onChange={handleInputChange}
                                                                placeholder="e.g. Senior Doctor, Head Chef"
                                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all text-center"
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {step === 4 && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 text-center">
                                            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                                                <Briefcase className="w-10 h-10" />
                                            </div>
                                            <div className="space-y-4 max-w-sm mx-auto">
                                                <label className="text-xl font-black text-slate-900 uppercase italic">Experience Level</label>
                                                <select
                                                    required
                                                    name="experience"
                                                    value={formData.experience}
                                                    onChange={handleInputChange}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all appearance-none"
                                                >
                                                    <option value="">Select Level...</option>
                                                    <option value="0">Student / Fresher</option>
                                                    <option value="1">1 Year</option>
                                                    <option value="2">2 Years</option>
                                                    <option value="3">3 Years</option>
                                                    <option value="5">5+ Years</option>
                                                    <option value="10">10+ Years</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {step === 5 && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="text-center space-y-2">
                                                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Location & Skills</h3>
                                                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Final candidate profile details</p>
                                            </div>

                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Phone Number</label>
                                                    <input
                                                        required
                                                        name="phone"
                                                        value={formData.phone}
                                                        onChange={handleInputChange}
                                                        placeholder="03xx-xxxxxxx"
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">City / Location</label>
                                                    <input
                                                        required
                                                        name="location"
                                                        value={formData.location}
                                                        onChange={handleInputChange}
                                                        placeholder="e.g. Karachi, Pakistan"
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Top Skills (Comma Separated)</label>
                                                    <input
                                                        required
                                                        name="skills"
                                                        value={formData.skills}
                                                        onChange={handleInputChange}
                                                        placeholder="Surgery, Patient Care, Diagnostics"
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {step === 6 && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="text-center space-y-2">
                                                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                                                    <Video className="w-10 h-10" />
                                                </div>
                                                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Video CV</h3>
                                                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Upload intro video + pick thumbnail</p>
                                            </div>

                                            {/* Video Picker */}
                                            {!videoPreview ? (
                                                <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-slate-200 rounded-[32px] cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all group">
                                                    <div className="text-center space-y-4">
                                                        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-[20px] flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-110 transition-all">
                                                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900 italic uppercase tracking-tighter">Select Video File</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">MP4, WebM · Max 200MB · Optional</p>
                                                        </div>
                                                    </div>
                                                    <input type="file" className="hidden" accept="video/*" onChange={handleVideoFileSelect} />
                                                </label>
                                            ) : (
                                                <div className="space-y-6">
                                                    <div className="relative group rounded-3xl overflow-hidden aspect-video bg-black shadow-2xl border-4 border-white">
                                                        <video src={videoPreview} controls className="w-full h-full" />
                                                        <button
                                                            type="button"
                                                            onClick={handleClearVideo}
                                                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition-all"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>

                                                    {/* Thumbnail Picker */}
                                                    <AdminThumbnailSelector
                                                        previewUrl={videoPreview}
                                                        selectedThumbnail={selectedThumbnail}
                                                        setSelectedThumbnail={setSelectedThumbnail}
                                                        uploadedThumbnail={uploadedThumbnail}
                                                        setUploadedThumbnail={setUploadedThumbnail}
                                                    />
                                                </div>
                                            )}

                                            {/* Seeker Context */}
                                            <AdminVideoContextForm
                                                role="job_seeker"
                                                videoContext={videoContext}
                                                setVideoContext={setVideoContext}
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            {/* EMPLOYER FLOW */}
                            {role === 'employer' && (
                                <>
                                    {step === 2 && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="text-center space-y-2">
                                                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Brand Details</h3>
                                                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Identity and presence</p>
                                            </div>

                                            <div className="flex justify-center mb-4">
                                                <div className="relative group">
                                                    <div className="w-32 h-32 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[35px] flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400">
                                                        {logoPreview ? (
                                                            <Image src={logoPreview} alt="Logo" fill className="object-cover" />
                                                        ) : (
                                                            <Building className="h-10 w-10 text-slate-300 group-hover:text-blue-400" />
                                                        )}
                                                    </div>
                                                    <label className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2.5 rounded-2xl cursor-pointer shadow-lg hover:bg-blue-700 transition-all border-4 border-white">
                                                        <Plus className="h-5 w-5" />
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Company Name</label>
                                                    <input
                                                        required
                                                        name="companyName"
                                                        value={formData.companyName}
                                                        onChange={handleInputChange}
                                                        placeholder="e.g. Acme Corp"
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Website</label>
                                                    <input
                                                        name="website"
                                                        value={formData.website}
                                                        onChange={handleInputChange}
                                                        placeholder="https://..."
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Company Size</label>
                                                    <select
                                                        required
                                                        name="size"
                                                        value={formData.size}
                                                        onChange={handleInputChange}
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all appearance-none"
                                                    >
                                                        <option value="">Select Size...</option>
                                                        <option value="1-10">1-10 emp</option>
                                                        <option value="11-50">11-50 emp</option>
                                                        <option value="51-200">51-200 emp</option>
                                                        <option value="200+">200+ emp</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="text-center space-y-2">
                                                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Location & Industry</h3>
                                                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Industry categorization</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2 space-y-4">
                                                    <div className="space-y-1.5">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Industry</label>
                                                        <SearchableSelect
                                                            options={INDUSTRIES.map(i => ({ id: i.id, label: i.label }))}
                                                            value={formData.industry}
                                                            onChange={(val) => setFormData(prev => ({ ...prev, industry: val, subcategory: '' }))}
                                                            placeholder="Search Industry..."
                                                        />
                                                    </div>
                                                    {formData.industry && (
                                                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Sub-sector / Market</label>
                                                            <SearchableSelect
                                                                options={getSubcategories(formData.industry).map(s => ({ id: s.id, label: s.label }))}
                                                                value={formData.subcategory}
                                                                onChange={(val) => setFormData(prev => ({ ...prev, subcategory: val }))}
                                                                placeholder="Search Sub-sector..."
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">City</label>
                                                    <input
                                                        required
                                                        name="location"
                                                        value={formData.location}
                                                        onChange={handleInputChange}
                                                        placeholder="City Name"
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Full Office Address</label>
                                                    <input
                                                        name="address"
                                                        value={formData.address}
                                                        onChange={handleInputChange}
                                                        placeholder="Street, Building, etc."
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {step === 4 && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="text-center space-y-2">
                                                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Contact & Bio</h3>
                                                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Finalizing company profile</p>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Contact Person</label>
                                                        <input
                                                            required
                                                            name="contactPerson"
                                                            value={formData.contactPerson}
                                                            onChange={handleInputChange}
                                                            placeholder="Hiring Manager"
                                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Phone</label>
                                                        <input
                                                            required
                                                            name="phone"
                                                            value={formData.phone}
                                                            onChange={handleInputChange}
                                                            placeholder="03XXXXXXXXX"
                                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">About the Company</label>
                                                    <textarea
                                                        required
                                                        name="description"
                                                        value={formData.description}
                                                        onChange={handleInputChange}
                                                        placeholder="Tell us what makes this company special..."
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all h-32 resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {step === 5 && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="text-center space-y-2">
                                                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                                                    <Video className="w-10 h-10" />
                                                </div>
                                                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Company Video</h3>
                                                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Upload intro video + hiring context</p>
                                            </div>

                                            {/* Video Picker */}
                                            {!videoPreview ? (
                                                <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-slate-200 rounded-[32px] cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all group">
                                                    <div className="text-center space-y-4">
                                                        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-[20px] flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-110 transition-all">
                                                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900 italic uppercase tracking-tighter">Select Video File</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">MP4, WebM · Max 200MB · Optional</p>
                                                        </div>
                                                    </div>
                                                    <input type="file" className="hidden" accept="video/*" onChange={handleVideoFileSelect} />
                                                </label>
                                            ) : (
                                                <div className="space-y-6">
                                                    <div className="relative group rounded-3xl overflow-hidden aspect-video bg-black shadow-2xl border-4 border-white">
                                                        <video src={videoPreview} controls className="w-full h-full" />
                                                        <button
                                                            type="button"
                                                            onClick={handleClearVideo}
                                                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition-all"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>

                                                    {/* Thumbnail Picker */}
                                                    <AdminThumbnailSelector
                                                        previewUrl={videoPreview}
                                                        selectedThumbnail={selectedThumbnail}
                                                        setSelectedThumbnail={setSelectedThumbnail}
                                                        uploadedThumbnail={uploadedThumbnail}
                                                        setUploadedThumbnail={setUploadedThumbnail}
                                                    />
                                                </div>
                                            )}

                                            {/* Employer Context */}
                                            <AdminVideoContextForm
                                                role="employer"
                                                videoContext={videoContext}
                                                setVideoContext={setVideoContext}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </form>

                        {/* Navigation Controls */}
                        <div className="flex items-center gap-4 mt-12 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="flex-1 flex items-center justify-center gap-2 px-8 py-5 bg-white border border-slate-200 text-slate-400 font-black italic rounded-[25px] hover:text-slate-900 transition-all shadow-sm uppercase tracking-tighter"
                                >
                                    Back
                                </button>
                            )}

                            {step < totalSteps ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="flex-[2] flex items-center justify-center gap-2 px-8 py-5 bg-blue-600 text-white font-black italic rounded-[25px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 uppercase tracking-tighter"
                                >
                                    Continue
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className={`flex-[2] flex items-center justify-center gap-3 px-8 py-5 bg-blue-600 text-white font-black italic rounded-[25px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 uppercase tracking-tighter ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {loading ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-6 h-6" />
                                    )}
                                    {loading ? 'Processing...' : 'Deploy Member'}
                                </button>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                /* BULK UPLOAD UI */
                <div className="bg-white p-8 md:p-12 rounded-[40px] border border-slate-200 shadow-sm space-y-8 animate-in fade-in slide-in-from-right-4">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[30px] flex items-center justify-center mx-auto">
                            <Upload className="w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Mass Deployment</h2>
                            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">Import hundreds of candidates via Excel</p>
                        </div>
                        <button
                            onClick={downloadTemplate}
                            className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline"
                        >
                            Download XLS Template
                        </button>
                    </div>

                    {!bulkData.length ? (
                        <label className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-slate-100 rounded-[40px] cursor-pointer hover:bg-slate-50 hover:border-blue-200 transition-all group">
                            <Upload className="w-12 h-12 text-slate-300 group-hover:text-blue-500 mb-4 transition-all" />
                            <p className="text-lg font-black text-slate-400 uppercase italic tracking-tighter group-hover:text-slate-900">Select Excel File</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">.xlsx or .xls files only</p>
                            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
                        </label>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">
                                    Preview: {bulkData.length} records found
                                </h3>
                                <button
                                    onClick={() => setBulkData([])}
                                    className="text-xs font-bold text-red-500 uppercase tracking-widest"
                                >
                                    Clear
                                </button>
                            </div>

                            <div className="max-h-[300px] overflow-auto border border-slate-100 rounded-2xl shadow-inner bg-slate-50/50">
                                <table className="w-full text-left text-[10px] font-bold uppercase tracking-tight">
                                    <thead className="sticky top-0 bg-white border-b border-slate-100">
                                        <tr>
                                            <th className="p-3 text-slate-400">Name</th>
                                            <th className="p-3 text-slate-400">Email</th>
                                            <th className="p-3 text-slate-400">Industry</th>
                                            <th className="p-3 text-slate-400">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {bulkData.slice(0, 10).map((row, idx) => (
                                            <tr key={idx} className="hover:bg-white transition-colors">
                                                <td className="p-3 text-slate-900">{row['Full Name'] || row['Name']}</td>
                                                <td className="p-3 text-slate-600">{row['Email']}</td>
                                                <td className="p-3 text-slate-600 font-black italic">{row['Industry']}</td>
                                                <td className="p-3">
                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md">Ready</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {bulkData.length > 10 && (
                                    <p className="p-3 text-center text-[8px] text-slate-400 uppercase">... and {bulkData.length - 10} more rows</p>
                                )}
                            </div>

                            <button
                                onClick={handleBulkImport}
                                disabled={importing}
                                className={`w-full flex items-center justify-center gap-3 px-8 py-5 bg-blue-600 text-white font-black italic rounded-[25px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 uppercase tracking-tighter ${importing ? 'opacity-70' : ''}`}
                            >
                                {importing ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-6 h-6" />
                                )}
                                {importing ? 'Importing Pipeline...' : 'Start Bulk Import'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Admin Notice */}
            <div className="bg-slate-900 text-white p-6 rounded-[32px] flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0 mt-1" />
                <div>
                    <h4 className="font-black italic uppercase tracking-tighter">Instant Activation Policy</h4>
                    <p className="text-slate-400 text-xs font-medium mt-1">Manual admin deployment automatically grants Premium status, bypasses verification loops, and marks profile as Active. Payment is considered as "Received at Office".</p>
                </div>
            </div>

            {/* Migration Tool */}
            <MigrationTool />
        </div>
    );
}

/* ─────────────────────────────────────────
   MigrationTool
   Fixes legacy video docs in batches
───────────────────────────────────────── */
function MigrationTool() {
    const [running, setRunning] = useState(false);
    const [count, setCount] = useState<number | null>(null);
    const [log, setLog] = useState<string[]>([]);

    const runMigration = async () => {
        if (!confirm('This will fix ALL broken videos in Firestore. Proceed?')) return;

        try {
            setRunning(true);
            setLog(['Starting scan...']);

            const { collection, query, getDocs, writeBatch, doc, limit } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase/firebase-config');

            // Find videos missing is_live or admin_status
            const q = query(collection(db, 'videos'), limit(500));
            const snap = await getDocs(q);

            let updated = 0;
            const batch = writeBatch(db);

            snap.docs.forEach(videoDoc => {
                const data = videoDoc.data();
                const needsFix = !data.is_live || !data.admin_status || !data.role;

                if (needsFix) {
                    batch.update(doc(db, 'videos', videoDoc.id), {
                        admin_status: data.admin_status || data.status || 'approved',
                        is_live: true,
                        role: data.role || data.userRole || 'job_seeker',
                        updatedAt: serverTimestamp()
                    });
                    updated++;
                }
            });

            if (updated > 0) {
                await batch.commit();
                setLog(prev => [...prev, `Successfully fixed ${updated} videos.`]);
                setCount(updated);
            } else {
                setLog(prev => [...prev, 'No videos needed fixing. System is healthy.']);
                setCount(0);
            }

        } catch (err: any) {
            setLog(prev => [...prev, `Error: ${err.message}`]);
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="mt-8 bg-blue-50 border-2 border-dashed border-blue-200 rounded-[32px] p-8">
            <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">System Health: Schema Fixer</h4>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-0.5">Automated migration tool for legacy video entries</p>
                    </div>
                </div>
                <button
                    onClick={runMigration}
                    disabled={running}
                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                    {running ? 'Repairing...' : 'Fix All Broken Videos'}
                </button>
            </div>

            {log.length > 0 && (
                <div className="mt-6 p-4 bg-white rounded-xl border border-blue-100 font-mono text-[10px] text-slate-600 max-h-32 overflow-auto">
                    {log.map((line, i) => <div key={i} className="mb-1"> {line}</div>)}
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────
   AdminThumbnailSelector
   Compact frame-scrubber + upload tab
───────────────────────────────────────── */
function AdminThumbnailSelector({
    previewUrl,
    selectedThumbnail,
    setSelectedThumbnail,
    uploadedThumbnail,
    setUploadedThumbnail,
}: {
    previewUrl: string | null;
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

    useEffect(() => {
        if (videoRef.current && previewUrl) {
            videoRef.current.onloadedmetadata = () => {
                setDuration(videoRef.current?.duration || 0);
            };
        }
    }, [previewUrl]);

    const drawFrame = useCallback(() => {
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
        if (videoRef.current) videoRef.current.currentTime = time;
    };

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        v.addEventListener('seeked', drawFrame);
        return () => v.removeEventListener('seeked', drawFrame);
    }, [drawFrame]);

    const handleSetThumbnail = () => {
        if (canvasRef.current) {
            setSelectedThumbnail(canvasRef.current.toDataURL('image/jpeg', 0.85));
            setUploadedThumbnail(null);
        }
    };

    if (!previewUrl) return null;

    return (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Thumbnail</h4>

            <div className="flex gap-2 mb-4 p-1 bg-slate-200/50 rounded-xl">
                <button type="button" onClick={() => setTab('pick')}
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${tab === 'pick' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>
                    Pick Frame
                </button>
                <button type="button" onClick={() => setTab('upload')}
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${tab === 'upload' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>
                    Upload Image
                </button>
            </div>

            {tab === 'pick' && (
                <div className="space-y-3">
                    <video ref={videoRef} src={previewUrl} className="hidden" preload="metadata" />
                    <canvas ref={canvasRef} className="w-full aspect-video rounded-xl border border-slate-200 bg-black object-cover" />
                    <input type="range" min={0} max={duration} step={0.1} value={currentTime}
                        onChange={handleSeek} className="w-full accent-blue-600" />
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={handleSetThumbnail} disabled={!currentTime}
                            className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-40 hover:bg-slate-800 transition-all">
                            Set as Thumbnail
                        </button>
                        {selectedThumbnail && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-xl text-[10px] font-black uppercase border border-green-100">
                                <Check className="w-3.5 h-3.5" /> Set
                            </div>
                        )}
                    </div>
                </div>
            )}

            {tab === 'upload' && (
                <div className="space-y-3">
                    <label className="relative flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group">
                        <input type="file" accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => { if (e.target.files?.[0]) { setUploadedThumbnail(e.target.files[0]); setSelectedThumbnail(null); } }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <Upload className="w-7 h-7 text-slate-300 group-hover:text-blue-500 mb-2 transition-colors" />
                        <p className="text-xs font-bold text-slate-500">Drop image or click to browse</p>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">JPEG · PNG · WebP</p>
                    </label>
                    {uploadedThumbnail && (
                        <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Image src={URL.createObjectURL(uploadedThumbnail)} alt="thumb" width={48} height={48} className="w-12 h-12 rounded-lg object-cover border" unoptimized />
                                <span className="text-xs font-bold text-slate-700 truncate max-w-[160px]">{uploadedThumbnail.name}</span>
                            </div>
                            <button type="button" onClick={() => setUploadedThumbnail(null)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────
   AdminVideoContextForm
   Role-specific context questions
───────────────────────────────────────── */
function AdminVideoContextForm({ role, videoContext, setVideoContext }: {
    role: 'job_seeker' | 'employer';
    videoContext: any;
    setVideoContext: (ctx: any) => void;
}) {
    if (role === 'job_seeker') {
        return (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Candidate Details <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">امیدوار کی تفصیل</span></h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Role Targeting <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">مطلوبہ عہدہ</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Sales Executive"
                            value={videoContext.targetJobTitle || ''}
                            onChange={e => setVideoContext({ ...videoContext, targetJobTitle: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Experience <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">تجربہ</span>
                        </label>
                        <select
                            value={videoContext.seekerExperience || ''}
                            onChange={e => setVideoContext({ ...videoContext, seekerExperience: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-sm"
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
            </div>
        );
    }

    return (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Hiring Details <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">بھرتی کی تفصیل</span></h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Role Hiring For <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">مطلوبہ عہدہ</span>
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. Sales Manager"
                        value={videoContext.hiringFor || ''}
                        onChange={e => setVideoContext({ ...videoContext, hiringFor: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-sm"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Expected Experience <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">مطلوبہ تجربہ</span>
                    </label>
                    <select
                        value={videoContext.expectedExperience || ''}
                        onChange={e => setVideoContext({ ...videoContext, expectedExperience: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-sm"
                    >
                        <option value="">Select Range</option>
                        <option value="Fresher / 0-1 Year">Fresher / 0-1 Year</option>
                        <option value="1-3 Years">1-3 Years</option>
                        <option value="3-5 Years">3-5 Years</option>
                        <option value="5-10 Years">5-10 Years</option>
                        <option value="10+ Years">10+ Years</option>
                    </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Job Type <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">ملازمت کی قسم</span>
                    </label>
                    <div className="flex gap-2">
                        {['Onsite', 'Remote', 'Hybrid'].map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setVideoContext({ ...videoContext, jobType: type })}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${videoContext.jobType === type ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Salary Range (PKR/Month) <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">تنخواہ کی حد</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hide Salary</span>
                            <input
                                type="checkbox"
                                checked={videoContext.hideSalary || false}
                                onChange={e => setVideoContext({ ...videoContext, hideSalary: e.target.checked })}
                                className="accent-blue-600 w-4 h-4 cursor-pointer"
                            />
                        </label>
                    </div>
                    {!videoContext.hideSalary && (
                        <div className="flex gap-4">
                            <input
                                type="number"
                                placeholder="Min"
                                value={videoContext.salaryMin || ''}
                                onChange={e => setVideoContext({ ...videoContext, salaryMin: e.target.value })}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-sm"
                            />
                            <input
                                type="number"
                                placeholder="Max"
                                value={videoContext.salaryMax || ''}
                                onChange={e => setVideoContext({ ...videoContext, salaryMax: e.target.value })}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-sm"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
