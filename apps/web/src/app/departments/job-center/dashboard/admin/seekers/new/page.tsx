// d:\khanhub\apps\web\src\app\departments\job-center\dashboard\admin\seekers\new\page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createJobCenterUserServer } from '@/app/departments/job-center/actions/createJobCenterUser';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { 
  ArrowLeft, Heart, Save, Loader2, User, Upload, 
  Camera, Phone, MapPin, Calendar, FileText, Users,
  ChevronDown, Plus, X, Eye, EyeOff, Shield, Mail, Briefcase, DollarSign
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { JobSeeker } from '@/types/job-center';

export default function RegisterSeekerPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  
  // Auth & UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [error, setError] = useState('');

  // SECTION 1: Login Credentials
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // SECTION 2: Seeker Information
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [address, setAddress] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');

  // SECTION 3: Job Preferences & Skills
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [preferredJobTypes, setPreferredJobTypes] = useState<string[]>([]);
  const [jobTypeInput, setJobTypeInput] = useState('');

  // SECTION 4: Contact Details
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');

  // SECTION 5: Additional Notes
  const [notes, setNotes] = useState('');

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

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const addJobType = () => {
    if (jobTypeInput.trim() && !preferredJobTypes.includes(jobTypeInput.trim())) {
      setPreferredJobTypes([...preferredJobTypes, jobTypeInput.trim()]);
      setJobTypeInput('');
    }
  };

  const removeJobType = (type: string) => {
    setPreferredJobTypes(preferredJobTypes.filter(t => t !== type));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!loginId || !loginPassword || !name || !fatherName || 
        !age || !dateOfBirth || !gender || !maritalStatus || !address || 
        !phone || !cnic) {
      setError('Please fill all required fields');
      toast.error('Missing required fields');
      return;
    }
    if (loginPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // 1. Upload photo if selected
      let photoUrl = '';
      if (photoFile) {
        setSubmitStatus('Uploading photo...');
        photoUrl = await uploadToCloudinary(photoFile, 'khanhub/jobcenter/seekers');
      }

      // 2. Create seeker document in Firestore
      setSubmitStatus('Creating Job Seeker record...');
      const seekerData: Omit<JobSeeker, 'id'> = {
        name,
        fatherName,
        email: email || undefined,
        age: Number(age),
        dateOfBirth,
        gender: gender as any,
        education: education || '',
        experience: experience || '',
        maritalStatus: maritalStatus as any,
        address,
        photoUrl: photoUrl || undefined,
        phone,
        cnic,
        skills,
        expectedSalary: expectedSalary,
        preferredJobTypes,
        notes: notes || undefined,
        isActive: true,
        loginId: loginId.toUpperCase(),
        createdAt: Timestamp.now(),
      };

      const seekerRef = await addDoc(collection(db, 'jobcenter_seekers'), seekerData);

      // 3. Create seeker login account
      setSubmitStatus('Creating seeker login...');
      const result = await createJobCenterUserServer(
        loginId.toUpperCase(),
        loginPassword,
        'seeker',
        name,
        seekerRef.id
      );

      if (!result.success) {
        try {
          await deleteDoc(doc(db, 'jobcenter_seekers', seekerRef.id));
        } catch {}

        setError(`Registration failed: ${result.error}. Please choose a different Seeker Login ID.`);
        toast.error('Login account creation failed');
        setSubmitting(false);
        return;
      }

      setSubmitStatus('Done!');
      toast.success('Job Seeker registered successfully ✓');
      router.push(`/departments/job-center/dashboard/admin/seekers/${seekerRef.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Something went wrong');
      toast.error('Submission failed');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
      <Icon size={16} className="text-blue-500" />
      <h3 className="font-black text-gray-700 text-sm uppercase tracking-widest">
        {title}
      </h3>
    </div>
  );

  const inputStyle = "w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm transition-all";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Link href="/departments/job-center/dashboard/admin/seekers" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" />
            Back to Job Seekers
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-6 h-6 text-blue-600" />
              Register New Job Seeker
            </h1>
            <p className="text-sm text-gray-500 mt-1">Register a new profile and set up their portal access.</p>
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
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Job Seeker Login ID *</label>
                  <input required placeholder="e.g. JS-2024-001" className={inputStyle} value={loginId} onChange={e => setLoginId(e.target.value.toUpperCase())} />
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
              <p className="text-[10px] text-gray-400 italic px-1">The Job Seeker will use these to log into the portal</p>
            </div>

            {/* SECTION 2: Seeker Information */}
            <div className="space-y-4 mt-8">
              <SectionHeader icon={User} title="Personal Information" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Full Name *</label>
                  <input required placeholder="Full Name" className={inputStyle} value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Father's Name *</label>
                  <input required placeholder="Father's Name" className={inputStyle} value={fatherName} onChange={e => setFatherName(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="email" placeholder="email@example.com" className={`${inputStyle} pl-11`} value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input required placeholder="+92XXXXXXXXXX" className={`${inputStyle} pl-11`} value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Age *</label>
                  <input required type="number" min="1" max="120" placeholder="Age" className={inputStyle} value={age} onChange={e => setAge(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Gender *</label>
                  <select required className={inputStyle} value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Education *</label>
                  <select required className={inputStyle} value={education} onChange={e => setEducation(e.target.value)}>
                    <option value="">Select</option>
                    <option value="None">None</option>
                    <option value="Primary">Primary</option>
                    <option value="Middle">Middle</option>
                    <option value="Matric">Matric</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Post-Graduate">Post-Graduate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Marital Status *</label>
                  <select required className={inputStyle} value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)}>
                    <option value="">Select</option>
                    <option value="Unmarried">Unmarried</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Date of Birth *</label>
                  <input required type="date" className={inputStyle} value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">CNIC Number *</label>
                  <input required placeholder="XXXXX-XXXXXXX-X" className={inputStyle} value={cnic} onChange={e => setCnic(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase px-1">Residential Address *</label>
                <textarea required rows={2} className={inputStyle} placeholder="Full Address" value={address} onChange={e => setAddress(e.target.value)} />
              </div>

              {/* PHOTO UPLOAD */}
              <div className="flex items-center gap-4 py-2">
                <div 
                  onClick={() => fileRef.current?.click()}
                  className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all overflow-hidden flex-shrink-0"
                >
                  {photoPreview ? (
                    <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <>
                      <Camera size={24} className="text-gray-400 mb-1" />
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Upload Photo</span>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setPhotoFile(file);
                  setPhotoPreview(URL.createObjectURL(file));
                }} />
                <div>
                  <p className="text-sm font-bold text-gray-700">Profile Photo</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 uppercase font-bold tracking-tight">JPG, PNG up to 5MB</p>
                  {photoPreview && (
                    <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview('') }} className="text-xs text-red-500 mt-1 hover:text-red-700 font-bold uppercase">Remove</button>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: Job Preferences & Skills */}
            <div className="space-y-4 mt-8">
              <SectionHeader icon={Briefcase} title="Career Profile" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Total Experience (Years)</label>
                  <input placeholder="e.g. 5 Years" className={inputStyle} value={experience} onChange={e => setExperience(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Expected Salary (PKR)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="number" placeholder="Monthly Salary" className={`${inputStyle} pl-11`} value={expectedSalary} onChange={e => setExpectedSalary(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase px-1">Key Skills</label>
                <div className="flex gap-2">
                  <input 
                    placeholder="Add a skill (e.g. Accounting, Java, Electrician)" 
                    className={inputStyle} 
                    value={newSkill} 
                    onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <button type="button" onClick={addSkill} className="bg-blue-600 text-white px-6 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">Add</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {skills.length === 0 && <p className="text-xs text-gray-400 italic px-1">No skills added yet</p>}
                  {skills.map(s => (
                    <span key={s} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-100 flex items-center gap-2">
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} className="hover:text-blue-900"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 mt-4">
                <label className="text-xs font-bold text-gray-500 uppercase px-1">Preferred Job Types</label>
                <div className="flex gap-2">
                  <input 
                    placeholder="e.g. Full-time, Remote, Night Shift" 
                    className={inputStyle} 
                    value={jobTypeInput} 
                    onChange={e => setJobTypeInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addJobType())}
                  />
                  <button type="button" onClick={addJobType} className="bg-blue-600 text-white px-6 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">Add</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {preferredJobTypes.length === 0 && <p className="text-xs text-gray-400 italic px-1">No job preferences added</p>}
                  {preferredJobTypes.map(t => (
                    <span key={t} className="bg-green-50 text-green-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-green-100 flex items-center gap-2">
                      {t}
                      <button type="button" onClick={() => removeJobType(t)} className="hover:text-green-900"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 5: Additional Notes */}
            <div className="space-y-4 mt-8">
              <SectionHeader icon={FileText} title="Background & Notes" />
              <textarea rows={3} className={inputStyle} placeholder="Briefly describe the Job Seeker's background or any specific constraints..." value={notes} onChange={e => setNotes(e.target.value)} />
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/10 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span className="animate-pulse">{submitStatus}</span>
                  </>
                ) : (
                  <>
                    <Save size={18} className="group-hover:scale-110 transition-transform" />
                    Complete Registration
                  </>
                )}
              </button>
              <Link href="/departments/job-center/dashboard/admin/seekers" className="text-gray-400 font-bold text-xs uppercase hover:text-gray-600 transition-colors tracking-widest">
                Discard Registration
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
