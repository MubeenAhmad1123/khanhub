'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createRehabUserServer } from '@/app/departments/rehab/actions/createRehabUser';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { 
  ArrowLeft, Heart, Save, Loader2, User, Upload, 
  Camera, Phone, MapPin, Calendar, FileText, Users,
  ChevronDown, Plus, X, Eye, EyeOff, Shield
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY, parseDateDMY } from '@/lib/utils';

export default function AdmitPatientPage() {
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

  // SECTION 2: Patient Information
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [age, setAge] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [education, setEducation] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [children, setChildren] = useState('0');
  const [address, setAddress] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');

  // SECTION 3: Guardian / Family Information
  const [guardianName, setGuardianName] = useState('');
  const [guardianFatherName, setGuardianFatherName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianCnic, setGuardianCnic] = useState('');

  // SECTION 4: Admission Details
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [reasonsForAdmission, setReasonsForAdmission] = useState<string[]>([]);
  const [conditionOnAdmission, setConditionOnAdmission] = useState('');
  const [packageAmount, setPackageAmount] = useState('60000');

  // SECTION 5: Additional Notes
  const [notes, setNotes] = useState('');

  const admissionReasons = [
    'Substance Abuse', 'Alcoholism', 'Behavioral Issues',
    'Psychological', 'Other'
  ];

  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return calculatedAge.toString();
  };

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) {
      router.push('/departments/rehab/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/rehab/login');
      return;
    }
    setLoading(false);
  }, [router]);

  const toggleReason = (reason: string) => {
    setReasonsForAdmission(prev => 
      prev.includes(reason) 
        ? prev.filter(r => r !== reason) 
        : [...prev, reason]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!loginId || !loginPassword || !name || !fatherName || 
        !age || !gender || !maritalStatus || !address || 
        !guardianName || !guardianPhone || !guardianRelation || 
        !admissionDate || reasonsForAdmission.length === 0) {
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
      let photoUrl = null;
      if (photoFile) {
        setSubmitStatus('Uploading photo...');
        photoUrl = await uploadToCloudinary(photoFile, 'Khan Hub/rehab/patients');
      }

      // Financial Calculations
      const monthlyPackageValue = Number(packageAmount) || 60000;
      const dailyRateValue = Math.round(monthlyPackageValue / 30);

      // 2. Create patient document in Firestore
      setSubmitStatus('Creating patient record...');
      const patientRef = await addDoc(collection(db, 'rehab_patients'), {
        name,
        fatherName,
        age: Number(age),
        dateOfBirth: dateOfBirth || null,
        gender,
        education: education || null,
        maritalStatus,
        children: maritalStatus === 'Married' ? Number(children || 0) : 0,
        address,
        photoUrl,
        guardianName,
        guardianFatherName: guardianFatherName || null,
        guardianRelation,
        guardianPhone,
        contactNumber: guardianPhone, // used by AdmissionTab profile editor
        guardianCnic: guardianCnic || null,
        admissionDate: Timestamp.fromDate(new Date(admissionDate)),
        monthlyPackage: monthlyPackageValue,
        packageAmount: monthlyPackageValue, // Legacy support
        dailyRate: dailyRateValue,
        reasonsForAdmission,
        conditionOnAdmission: conditionOnAdmission || null,
        conditionOnDischarge: null,
        notes: notes || null,
        isActive: true,
        loginId: loginId.toUpperCase(),
        createdAt: Timestamp.now(),
      });

      // 3. Create family login account linked to this patient
      setSubmitStatus('Creating family login...');
      const result = await createRehabUserServer(
        loginId.toUpperCase(),
        loginPassword,
        'family',
        name,
        patientRef.id
      );

      if (!result.success) {
        // Roll back the patient doc if the login account could not be created.
        // This prevents "half-created" records from confusing future logins.
        try {
          await deleteDoc(doc(db, 'rehab_patients', patientRef.id));
        } catch {}

        setError(`Patient admission failed: ${result.error}. Please choose a different Patient Login ID.`);
        toast.error('Login account creation failed');
        setSubmitting(false);
        return;
      }

      setSubmitStatus('Done!');
      toast.success('Patient admitted successfully ✓');
      router.push(`/departments/rehab/dashboard/admin/patients/${patientRef.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Something went wrong');
      toast.error('Submission failed');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
      <Icon size={16} className="text-teal-500" />
      <h3 className="font-black text-gray-700 text-sm uppercase tracking-widest">
        {title}
      </h3>
    </div>
  );

  const inputStyle = "w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm transition-all";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Link href="/departments/rehab/dashboard/admin/patients" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" />
            Back to Patients
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-6 h-6 text-teal-600" />
              Admit New Patient
            </h1>
            <p className="text-sm text-gray-500 mt-1">Register a new patient and set up family access.</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            
            {/* SECTION 1: Login Credentials */}
            <div className="space-y-4">
              <SectionHeader icon={Shield} title="Login Credentials" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Patient Login ID *</label>
                  <input required placeholder="e.g. REHAB-PAT-001" className={inputStyle} value={loginId} onChange={e => setLoginId(e.target.value.toUpperCase())} />
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
              <p className="text-[10px] text-gray-400 italic px-1">Family will use these to log in and view this patient's profile</p>
            </div>

            {/* SECTION 2: Patient Information */}
            <div className="space-y-4 mt-8">
              <SectionHeader icon={User} title="Patient Information" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
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
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Date of Birth *</label>
                  <input
                    required
                    type="text"
                    placeholder="DD MM YYYY"
                    className={inputStyle}
                    value={formatDateDMY(dateOfBirth)}
                    onChange={e => setDateOfBirth(e.target.value)}
                    onBlur={e => {
                      const parsed = parseDateDMY(e.target.value);
                      if (parsed) {
                        const iso = parsed.toISOString().split('T')[0];
                        setDateOfBirth(iso);
                        setAge(calculateAge(iso));
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Age * (Auto-filled)</label>
                  <input required type="number" min="1" max="120" placeholder="Age" className={inputStyle} value={age} onChange={e => setAge(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Education</label>
                  <select className={inputStyle} value={education} onChange={e => setEducation(e.target.value)}>
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

              {maritalStatus === 'Married' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Number of Children</label>
                  <input type="number" min="0" className={inputStyle} value={children} onChange={e => setChildren(e.target.value)} />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase px-1">Address *</label>
                <textarea required rows={2} className={inputStyle} placeholder="Full Address" value={address} onChange={e => setAddress(e.target.value)} />
              </div>

              {/* PHOTO UPLOAD */}
              <div className="flex items-center gap-4 py-2">
                <div 
                  onClick={() => fileRef.current?.click()}
                  className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-all overflow-hidden flex-shrink-0"
                >
                  {photoPreview ? (
                    <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <>
                      <Camera size={24} className="text-gray-400 mb-1" />
                      <span className="text-[10px] text-gray-400 font-bold">Upload Photo</span>
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
                  setPhotoFile(file);
                  setPhotoPreview(URL.createObjectURL(file));
                }} />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Patient Photo</p>
                  <p className="text-xs text-gray-400 mt-0.5">JPG, PNG up to 5MB</p>
                  {photoPreview && (
                    <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview('') }} className="text-xs text-red-400 mt-1 hover:text-red-600 font-semibold">Remove</button>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: Guardian Information */}
            <div className="space-y-4 mt-8">
              <SectionHeader icon={Users} title="Guardian / Family Information" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Guardian Name *</label>
                  <input required placeholder="Parent or responsible person" className={inputStyle} value={guardianName} onChange={e => setGuardianName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Guardian's Father Name</label>
                  <input placeholder="Optional" className={inputStyle} value={guardianFatherName} onChange={e => setGuardianFatherName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Relation *</label>
                  <select required className={inputStyle} value={guardianRelation} onChange={e => setGuardianRelation(e.target.value)}>
                    <option value="">Select</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Uncle">Uncle</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Guardian Phone *</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input required className={`${inputStyle} pl-10`} placeholder="+92XXXXXXXXXX" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Guardian CNIC</label>
                  <input className={inputStyle} placeholder="XXXXX-XXXXXXX-X" value={guardianCnic} onChange={e => setGuardianCnic(e.target.value)} />
                </div>
              </div>
            </div>

            {/* SECTION 4: Admission Details */}
            <div className="space-y-4 mt-8">
              <SectionHeader icon={Calendar} title="Admission Details" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Admission Date *</label>
                  <input
                    required
                    type="text"
                    placeholder="DD MM YYYY"
                    className={inputStyle}
                    value={formatDateDMY(admissionDate)}
                    onChange={e => setAdmissionDate(e.target.value)}
                    onBlur={e => {
                      const parsed = parseDateDMY(e.target.value);
                      if (parsed) setAdmissionDate(parsed.toISOString().split('T')[0]);
                    }}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Monthly Package *</label>
                  <input required type="number" className={inputStyle} value={packageAmount} onChange={e => setPackageAmount(e.target.value)} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase px-1">Reasons for Admission *</label>
                <div className="flex flex-wrap gap-2">
                  {admissionReasons.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleReason(r)}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                        reasonsForAdmission.includes(r)
                          ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-teal-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase px-1">Condition on Admission</label>
                <textarea rows={2} className={inputStyle} placeholder="Physical and mental condition on arrival..." value={conditionOnAdmission} onChange={e => setConditionOnAdmission(e.target.value)} />
              </div>
            </div>

            {/* SECTION 5: Additional Notes */}
            <div className="space-y-4 mt-8">
              <SectionHeader icon={FileText} title="Additional Notes" />
              <textarea rows={3} className={inputStyle} placeholder="History, special requests, or medical notes..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 text-red-700 text-sm font-semibold">
                <AlertTriangle size={18} />
                {error}
              </div>
            )}

            <div className="mt-10 flex flex-col items-center gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-900/10 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span className="animate-pulse">{submitStatus}</span>
                  </>
                ) : (
                  <>
                    <Save size={18} className="group-hover:scale-110 transition-transform" />
                    Admit Patient
                  </>
                )}
              </button>
              <Link href="/departments/rehab/dashboard/admin/patients" className="text-gray-400 font-bold text-xs uppercase hover:text-gray-600 transition-colors">
                Cancel Registration
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

function AlertTriangle({ size, className }: { size: number, className?: string }) {
  return <X size={size} className={className} />;
}
