'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/firebase-config';
import { serverTimestamp, setDoc, doc } from 'firebase/firestore';
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
    MapPin,
    Phone,
    Plus,
    Building
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { INDUSTRIES, getSubcategories, getRoles } from '@/lib/constants/categories';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export default function AddUserPage() {
    const { user: adminUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [role, setRole] = useState<'job_seeker' | 'employer'>('job_seeker');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

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
        videoUrl: '',
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

    const totalSteps = role === 'job_seeker' ? 6 : 4;

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

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            setUploadProgress(0);

            const result = await uploadToCloudinary(
                file,
                `khanhub/admin_uploads/${Date.now()}`,
                (p) => setUploadProgress(p.percentage),
                'video'
            );

            setFormData(prev => ({ ...prev, videoUrl: result.secureUrl }));
            toast('Video uploaded successfully', 'success');
        } catch (err: any) {
            toast(err.message || 'Video upload failed', 'error');
        } finally {
            setLoading(false);
        }
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

            // 1. Handle Employer Logo if exists
            let finalLogoUrl = '';
            if (role === 'employer' && logoFile) {
                const result = await uploadCompanyLogo(logoFile, `admin_${Date.now()}`);
                finalLogoUrl = result.secureUrl;
            }

            // 2. Prepare Data
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
                    videoUrl: formData.videoUrl,
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
                        video: !!formData.videoUrl,
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

            // 3. Save to Firestore
            await setDoc(doc(db, 'users', userId), userData);

            // 4. Log activity
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
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 text-center">
                                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                                        <Video className="w-10 h-10" />
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Media Assets</h3>
                                            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Upload introduction video CV</p>
                                        </div>

                                        <div className="relative max-w-md mx-auto">
                                            {formData.videoUrl ? (
                                                <div className="relative group rounded-3xl overflow-hidden aspect-video bg-black shadow-2xl">
                                                    <video src={formData.videoUrl} controls className="w-full h-full" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, videoUrl: '' }))}
                                                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all group-hover:scale-110"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-slate-200 rounded-[32px] cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all group">
                                                    {loading && uploadProgress > 0 ? (
                                                        <div className="text-center space-y-4">
                                                            <div className="relative w-24 h-24 flex items-center justify-center">
                                                                <Loader2 className="w-full h-full text-blue-600 animate-spin" />
                                                                <span className="absolute text-[12px] font-black text-blue-600 italic uppercase">
                                                                    {uploadProgress}%
                                                                </span>
                                                            </div>
                                                            <p className="text-xs font-black text-slate-400 uppercase italic">Sending to Cloudinary...</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center space-y-4">
                                                            <div className="w-16 h-16 mx-auto bg-slate-100 rounded-[20px] flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-110 transition-all">
                                                                <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-slate-900 italic uppercase tracking-tighter">Upload Profile Video</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Skip if not available</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="video/*"
                                                        onChange={handleVideoUpload}
                                                        disabled={loading}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
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

            {/* Admin Notice */}
            <div className="bg-slate-900 text-white p-6 rounded-[32px] flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0 mt-1" />
                <div>
                    <h4 className="font-black italic uppercase tracking-tighter">Instant Activation Policy</h4>
                    <p className="text-slate-400 text-xs font-medium mt-1">Manual admin deployment automatically grants Premium status, bypasses verification loops, and marks profile as Active. Payment is considered as "Received at Office".</p>
                </div>
            </div>
        </div>
    );
}
