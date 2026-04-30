// d:\Khan Hub\apps\web\src\app\departments\job-center\dashboard\admin\employers\new\page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createJobCenterUserServer } from '@/app/departments/job-center/actions/createJobCenterUser';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { 
  ArrowLeft, Save, Loader2, User, Upload, 
  Camera, Phone, MapPin, Calendar, FileText, 
  Plus, X, Eye, EyeOff, Shield, Mail, Building, Globe, Briefcase
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Employer } from '@/types/job-center';

export default function RegisterEmployerPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  
  // Auth & UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  // SECTION 1: Login Credentials
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // SECTION 2: Company Information
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  // SECTION 3: Contact Person Details
  const [contactPersonName, setContactPersonName] = useState('');
  const [contactPersonPosition, setContactPersonPosition] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // SECTION 4: Additional Information
  const [companySize, setCompanySize] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) {
      router.push('/departments/job-center/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/job-center/login');
      return;
    }
    setLoading(false);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    
    // Validate required fields
    if (!loginId || !loginPassword || !companyName || !industry || !address || 
        !contactPersonName || !contactPhone) {
      setError('Please fill all required fields');
      toast.error('Missing required fields');
      return;
    }
    if (loginPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    setSubmitStatus('processing');
    setError('');

    let employerDocId: string | null = null;
    try {
      // 1. Upload logo if selected
      let logoUrl = '';
      if (logoFile) {
        logoUrl = await uploadToCloudinary(logoFile, 'Khan Hub/jobcenter/employers');
      }

      // 2. Create employer document in Firestore
      const employerData: Omit<Employer, 'id'> = {
        companyName,
        industry,
        email: companyEmail || null,
        website: website || null,
        address,
        logoUrl: logoUrl || null,
        contactPerson: {
          name: contactPersonName,
          position: contactPersonPosition || null,
          phone: contactPhone,
        },
        companySize: companySize || null,
        description: description || null,
        isActive: true,
        loginId: loginId.toUpperCase(),
        createdAt: Timestamp.now(),
      };

      const employerRef = await addDoc(collection(db, 'jobcenter_employers'), employerData);
      employerDocId = employerRef.id;

      // 3. Create employer login account
      const result = await createJobCenterUserServer(
        loginId.toUpperCase(),
        loginPassword,
        'employer',
        companyName,
        undefined, // seekerId
        employerRef.id
      );

      if (!result.success) {
        try {
          await deleteDoc(doc(db, 'jobcenter_employers', employerRef.id));
        } catch {}

        setSubmitStatus('error');
        setError(`Registration failed: ${result.error}. Please choose a different Employer Login ID.`);
        toast.error('Login account creation failed');
        return;
      }

      setSubmitStatus('success');
      toast.success('Employer registered successfully ✓');
      setTimeout(() => {
        router.push(`/departments/job-center/dashboard/admin/employers/${employerRef.id}`);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      if (employerDocId) {
        try {
          await deleteDoc(doc(db, 'jobcenter_employers', employerDocId));
        } catch {}
      }
      setSubmitStatus('error');
      setError(err?.message || 'Something went wrong');
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
      <Icon size={16} className="text-indigo-500" />
      <h3 className="font-black text-gray-700 text-sm uppercase tracking-widest">
        {title}
      </h3>
    </div>
  );

  const inputStyle = "w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm transition-all";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Link href="/departments/job-center/dashboard/admin/employers" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" />
            Back to Employers
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building className="w-6 h-6 text-indigo-600" />
              Register New Employer
            </h1>
            <p className="text-sm text-gray-500 mt-1">Register a new company and set up their employer portal access.</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            
            {/* SECTION 1: Login Credentials */}
            <div className="space-y-4">
              <SectionHeader icon={Shield} title="Portal Access" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Employer Login ID *</label>
                  <input required placeholder="e.g. COMP-2024-ABC" className={inputStyle} value={loginId} onChange={e => setLoginId(e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Login Password * (Min 6 chars)</label>
                  <div className="relative">
                    <input required type={showPassword ? "text" : "password"} placeholder="••••••••" className={inputStyle} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 italic px-1">The company will use these to log into the Employer Portal</p>
            </div>

            {/* SECTION 2: Company Information */}
            <div className="space-y-4 mt-8">
              <SectionHeader icon={Building} title="Company Information" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Company Name *</label>
                  <input required placeholder="Company Name" className={inputStyle} value={companyName} onChange={e => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Industry *</label>
                  <input required placeholder="e.g. Construction, IT, Healthcare" className={inputStyle} value={industry} onChange={e => setIndustry(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Company Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="email" placeholder="hr@company.com" className={`${inputStyle} pl-11`} value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="url" placeholder="https://www.company.com" className={`${inputStyle} pl-11`} value={website} onChange={e => setWebsite(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase px-1">Office Address *</label>
                <textarea required rows={2} className={inputStyle} placeholder="Full Address" value={address} onChange={e => setAddress(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Company Size</label>
                  <select className={inputStyle} value={companySize} onChange={e => setCompanySize(e.target.value)}>
                    <option value="">Select Size</option>
                    <option value="1-10">1-10 Employees</option>
                    <option value="11-50">11-50 Employees</option>
                    <option value="51-200">51-200 Employees</option>
                    <option value="201-500">201-500 Employees</option>
                    <option value="500+">500+ Employees</option>
                  </select>
                </div>
              </div>

              {/* LOGO UPLOAD */}
              <div className="flex items-center gap-4 py-2">
                <div 
                  onClick={() => fileRef.current?.click()}
                  className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all overflow-hidden flex-shrink-0"
                >
                  {logoPreview ? (
                    <img src={logoPreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <>
                      <Camera size={24} className="text-gray-400 mb-1" />
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Upload Logo</span>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/webp" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.type !== 'image/webp') {
                    toast.error('Only WebP images are allowed');
                    return;
                  }
                  setLogoFile(file);
                  setLogoPreview(URL.createObjectURL(file));
                }} />
                <div>
                  <p className="text-sm font-bold text-gray-700">Company Logo</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 uppercase font-bold tracking-tight">JPG, PNG up to 5MB</p>
                  {logoPreview && (
                    <button type="button" onClick={() => { setLogoFile(null); setLogoPreview('') }} className="text-xs text-red-500 mt-1 hover:text-red-700 font-bold uppercase">Remove</button>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: Contact Person */}
            <div className="space-y-4 mt-8">
              <SectionHeader icon={User} title="Contact Person" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Person Name *</label>
                  <input required placeholder="Name of HR or Manager" className={inputStyle} value={contactPersonName} onChange={e => setContactPersonName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Position / Title</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input placeholder="e.g. HR Manager" className={`${inputStyle} pl-11`} value={contactPersonPosition} onChange={e => setContactPersonPosition(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase px-1">Contact Phone *</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input required placeholder="+92XXXXXXXXXX" className={`${inputStyle} pl-11`} value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
                </div>
              </div>
            </div>

            {/* SECTION 4: Description */}
            <div className="space-y-4 mt-8">
              <SectionHeader icon={FileText} title="Company Bio" />
              <textarea rows={4} className={inputStyle} placeholder="Briefly describe the company, its scale, and workforce requirements..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 text-red-700 text-sm font-semibold">
                <X size={18} />
                {error}
              </div>
            )}

            <div className="mt-10 flex flex-col items-center gap-4">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-5 rounded-[2rem] font-black text-lg transition-all active:scale-95 shadow-2xl disabled:opacity-50 flex items-center justify-center gap-3 ${
                  submitStatus === 'success' ? 'bg-emerald-600 text-white shadow-emerald-500/20' :
                  submitStatus === 'error' ? 'bg-rose-600 text-white shadow-rose-500/20' :
                  'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/10'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : submitStatus === 'success' ? (
                  <>
                    <Shield size={20} className="text-emerald-200" />
                    <span>Employer Registered</span>
                  </>
                ) : submitStatus === 'error' ? (
                  <>
                    <X size={20} className="text-rose-200" />
                    <span>Retry Sync</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>Complete Registration</span>
                  </>
                )}
              </button>
              <Link href="/departments/job-center/dashboard/admin/employers" className="text-gray-400 font-bold text-xs uppercase hover:text-gray-600 transition-colors tracking-widest">
                Discard Registration
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
