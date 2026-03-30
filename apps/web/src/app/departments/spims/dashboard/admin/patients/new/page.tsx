'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, Timestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createSpimsUserServer } from '@/app/departments/spims/actions/createSpimsUser';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { SPIMS_COURSES, CourseId } from '@/types/spims';
import { 
  ArrowLeft, Save, Loader2, User, Upload, 
  Camera, Phone, MapPin, Calendar, FileText, Users,
  Plus, X, Eye, EyeOff, Shield, GraduationCap,
  BookOpen, Hash, CreditCard
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function StudentEnrollmentPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  
  // Auth & UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [error, setError] = useState('');

  // SECTION 1: Login Credentials
  const [loginId, setLoginId] = useState('SPIMS-STU-');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // SECTION 2: Student Information
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('male');
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');

  // SECTION 3: Academic Info
  const [courseId, setCourseId] = useState<CourseId | ''>('');
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [year, setYear] = useState<'1' | '2'>('1');
  const [rollNumber, setRollNumber] = useState('');
  const [totalCourseFee, setTotalCourseFee] = useState(0);

  // SECTION 4: Referral
  const [referredBy, setReferredBy] = useState('');
  const [referrerPhone, setReferrerPhone] = useState('');

  useEffect(() => {
    const sessionData = localStorage.getItem('spims_session');
    if (!sessionData) {
      router.push('/departments/spims/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/spims/login');
      return;
    }
    setLoading(false);
  }, [router]);

  // Handle Course Change
  useEffect(() => {
    if (!courseId) return;
    const course = SPIMS_COURSES.find(c => c.id === courseId);
    if (course) {
      setTotalCourseFee(course.totalFee);
      
      // Auto-calculate completion date (2 years)
      if (enrollmentDate) {
        const date = new Date(enrollmentDate);
        date.setFullYear(date.getFullYear() + course.duration);
        setExpectedCompletionDate(date.toISOString().split('T')[0]);
      }
    }
  }, [courseId, enrollmentDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginId || !loginPassword || !name || !fatherName || !courseId || !enrollmentDate) {
      setError('Please fill all required fields');
      toast.error('Missing required fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // 1. Upload photo if selected
      let photoUrl = null;
      if (photoFile) {
        setSubmitStatus('Uploading photo...');
        photoUrl = await uploadToCloudinary(photoFile, 'khanhub/spims/students');
      }

      // 2. Create Student document
      setSubmitStatus('Creating student record...');
      const studentDoc = {
        name,
        fatherName,
        dateOfBirth: dateOfBirth || null,
        gender,
        cnic: cnic || null,
        phone: phone || null,
        address,
        photoUrl,
        courseId,
        courseName: SPIMS_COURSES.find(c => c.id === courseId)?.name || '',
        totalCourseFee,
        enrollmentDate: Timestamp.fromDate(new Date(enrollmentDate)),
        expectedCompletionDate: expectedCompletionDate 
          ? Timestamp.fromDate(new Date(expectedCompletionDate)) 
          : null,
        year: Number(year),
        rollNumber: rollNumber || null,
        referredBy: referredBy || null,
        referrerPhone: referrerPhone || null,
        isActive: true,
        status: 'enrolled',
        createdAt: Timestamp.now(),
      };

      const studentRef = await addDoc(collection(db, 'spims_students'), studentDoc);

      // 3. Create Fee Record
      await setDoc(doc(db, 'spims_fees', studentRef.id), {
        studentId: studentRef.id,
        studentName: name,
        courseId,
        totalCourseFee,
        totalPaid: 0,
        totalRemaining: totalCourseFee,
        payments: [],
        createdAt: Timestamp.now(),
      });

      // 4. Create Login Account
      setSubmitStatus('Creating login account...');
      const result = await createSpimsUserServer(
        loginId.toUpperCase(),
        loginPassword,
        'student',
        name,
        studentRef.id
      );

      if (!result.success) {
        toast.error('Login account creation failed, but student record was created.');
      }

      setSubmitStatus('Done!');
      toast.success('Student enrolled successfully');
      router.push(`/departments/spims/dashboard/admin/patients/${studentRef.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Something went wrong');
      toast.error('Enrollment failed');
    } finally {
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
          <Link href="/departments/spims/dashboard/admin/patients" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" />
            Back to Students
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-6 h-6 text-teal-600" />
              Enroll New Student
            </h1>
            <p className="text-sm text-gray-500 mt-1">SPIMS Academy — Student Registration System</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            
            {/* SECTION 1: Login Credentials */}
            <div className="space-y-4">
              <SectionHeader icon={Shield} title="Student Portal Access" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Login ID / Username *</label>
                  <input required placeholder="e.g. SPIMS-STU-001" className={inputStyle} value={loginId} onChange={e => setLoginId(e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Initial Password *</label>
                  <div className="relative">
                    <input required type={showPassword ? "text" : "password"} placeholder="••••••••" className={inputStyle} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Personal Information */}
            <div className="space-y-4 mt-8">
              <SectionHeader icon={User} title="Personal Information" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Full Name *</label>
                  <input required placeholder="Student Name" className={inputStyle} value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Father's Name *</label>
                  <input required placeholder="Father Name" className={inputStyle} value={fatherName} onChange={e => setFatherName(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Date of Birth</label>
                  <input type="date" className={inputStyle} value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Gender *</label>
                  <select required className={inputStyle} value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Student CNIC / B-Form</label>
                  <input placeholder="00000-0000000-0" className={inputStyle} value={cnic} onChange={e => setCnic(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Student / Parent Phone</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className={`${inputStyle} pl-10`} placeholder="+92XXXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Home Address *</label>
                  <input required placeholder="Current Residential Address" className={inputStyle} value={address} onChange={e => setAddress(e.target.value)} />
                </div>
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
                      <span className="text-[10px] text-gray-400 font-bold">Photo</span>
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
                  <p className="text-sm font-semibold text-gray-700">Admission Photo</p>
                  <p className="text-xs text-gray-400 mt-0.5">Will be used for student ID cards</p>
                </div>
              </div>
            </div>

            {/* SECTION 3: Academic Information */}
            <div className="space-y-4 mt-8">
              <SectionHeader icon={GraduationCap} title="Academic Information" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Course / Program *</label>
                  <select required className={inputStyle} value={courseId} onChange={e => setCourseId(e.target.value as CourseId)}>
                    <option value="">Select Course</option>
                    {SPIMS_COURSES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Board Roll Number</label>
                  <div className="relative">
                    <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className={`${inputStyle} pl-10`} placeholder="Roll No (if assigned)" value={rollNumber} onChange={e => setRollNumber(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Enrollment Date *</label>
                  <input required type="date" className={inputStyle} value={enrollmentDate} onChange={e => setEnrollmentDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Expected Completion</label>
                  <input type="date" className={inputStyle} value={expectedCompletionDate} readOnly disabled />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Academic Year</label>
                  <select className={inputStyle} value={year} onChange={e => setYear(e.target.value as '1' | '2')}>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 max-w-xs">
                <label className="text-xs font-bold text-gray-500 uppercase px-1">Total Course Fee (Rs)</label>
                <div className="relative">
                  <CreditCard size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" className={`${inputStyle} pl-10 bg-gray-50 font-black text-teal-700`} value={totalCourseFee} readOnly disabled />
                </div>
              </div>
            </div>

            {/* SECTION 4: Referral */}
            <div className="space-y-4 mt-8">
              <SectionHeader icon={Users} title="Referral & Additional Info" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Referred By</label>
                  <input placeholder="Source of admission" className={inputStyle} value={referredBy} onChange={e => setReferredBy(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Referrer Contact</label>
                  <input placeholder="Phone Number" className={inputStyle} value={referrerPhone} onChange={e => setReferrerPhone(e.target.value)} />
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 rounded-2xl border border-red-100 text-red-700 text-sm font-semibold">
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
                    <Save size={18} />
                    Complete Enrollment
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
