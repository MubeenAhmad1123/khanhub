// d:\Khan Hub\apps\web\src\app\departments\job-center\dashboard\admin\seekers\new\page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, Timestamp, doc, deleteDoc, query, orderBy, limit, getDocs, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { createJobCenterUserServer } from '@/app/departments/job-center/actions/createJobCenterUser';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import {
  ArrowLeft, Save, Loader2, User, Upload,
  Camera, Phone, MapPin, Calendar, FileText, Users,
  ChevronDown, Plus, X, Eye, EyeOff, Shield, Mail, Briefcase, DollarSign, Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { JobSeeker } from '@/types/job-center';
import { BrutalistCalendar } from '@/components/ui/BrutalistCalendar';

// Preset Seeker Categories
const PRESET_CATEGORIES = [
  '🏠 Domestic / House Help', '🚗 Driver', '👶 Child Care', '📚 Tutor / Teacher',
  '🏭 Factory / Labor', '💼 Office / Corporate', '🔧 Skilled Trade (Plumber, Electrician, etc.)',
  '🛡️ Security / Guard', '🍳 Cook / Chef', '💻 IT / Digital', '🏥 Healthcare', '🌾 Agriculture', '🔄 Other'
];

// Preset Preferred Work Types
const PRESET_WORK_TYPES = [
  'Full Time', 'Part Time', 'Contract', 'Live-in (for domestic help)', 'Daily Wage'
];

export default function RegisterSeekerPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // UI Steps: 1: Portal Access, 2: Personal Info, 3: Career History, 4: Seeker Registered Success Screen
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successDocId, setSuccessDocId] = useState('');

  // Custom suggestions mapping cache
  const [customSuggestions, setCustomSuggestions] = useState<Record<string, { id: string; value: string; usageCount: number }[]>>({});
  
  // Suggestion list dropdown details
  const [suggestionList, setSuggestionList] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customInputVal, setCustomInputVal] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);
  const [activeCustomField, setActiveCustomField] = useState<'jobCategory' | 'workType' | null>(null);

  // SECTION 1: Login Credentials
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // SECTION 2: Personal Information
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  
  // Profile Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');

  // SECTION 3: Career Profile
  const [educationList, setEducationList] = useState<{ degree: string; institution: string; year: string }[]>([]);
  const [newEdu, setNewEdu] = useState({ degree: '', institution: '', year: '' });
  
  const [experienceList, setExperienceList] = useState<{ title: string; company: string; duration: string }[]>([]);
  const [newExp, setNewExp] = useState({ title: '', company: '', duration: '' });

  const [jobCategory, setJobCategory] = useState(''); // Preset or custom
  const [expectedSalary, setExpectedSalary] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [preferredWorkType, setPreferredWorkType] = useState<string[]>([]); // Preset or custom
  const [customChips, setCustomChips] = useState<string[]>([]); // separate tracking for dashed border styling

  // SECTION 4: Background & Notes
  const [notes, setNotes] = useState('');

  // Validation Errors state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const isDraftLoaded = useRef(false);

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

    const fetchSuggestions = async () => {
      try {
        const q = query(collection(db, 'jobcenter_custom_options'));
        const snap = await getDocs(q);
        const suggestionsMap: Record<string, { id: string; value: string; usageCount: number }[]> = {};
        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const fieldName = data.field;
          if (!suggestionsMap[fieldName]) suggestionsMap[fieldName] = [];
          suggestionsMap[fieldName].push({
            id: docSnap.id,
            value: data.value,
            usageCount: data.usageCount || 0
          });
        });
        
        Object.keys(suggestionsMap).forEach(key => {
          suggestionsMap[key].sort((a, b) => b.usageCount - a.usageCount);
        });
        setCustomSuggestions(suggestionsMap);
      } catch (e) {
        console.error("Error fetching custom options: ", e);
      } finally {
        setLoading(false);
      }
    };

    // Wait for auth + force token refresh before loading suggestions
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && user.uid === parsed.uid) {
        await user.getIdToken(true);
        setTimeout(() => {
          fetchSuggestions();
        }, 250);
      } else if (auth.currentUser && auth.currentUser.uid === parsed.uid) {
        await auth.currentUser.getIdToken(true);
        setTimeout(() => {
          fetchSuggestions();
        }, 250);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Load saved draft from localStorage
  useEffect(() => {
    if (loading) return;
    if (isDraftLoaded.current) return;

    const savedDraft = localStorage.getItem('jobcenter_seeker_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.currentStep) setCurrentStep(draft.currentStep);
        if (draft.loginId) setLoginId(draft.loginId);
        if (draft.loginPassword) setLoginPassword(draft.loginPassword);
        if (draft.name) setName(draft.name);
        if (draft.fatherName) setFatherName(draft.fatherName);
        if (draft.dateOfBirth) setDateOfBirth(draft.dateOfBirth);
        if (draft.age) setAge(draft.age);
        if (draft.gender) setGender(draft.gender);
        if (draft.maritalStatus) setMaritalStatus(draft.maritalStatus);
        if (draft.cnic) setCnic(draft.cnic);
        if (draft.phone) setPhone(draft.phone);
        if (draft.email) setEmail(draft.email);
        if (draft.address) setAddress(draft.address);
        if (draft.educationList) setEducationList(draft.educationList);
        if (draft.experienceList) setExperienceList(draft.experienceList);
        if (draft.jobCategory) setJobCategory(draft.jobCategory);
        if (draft.expectedSalary) setExpectedSalary(draft.expectedSalary);
        if (draft.skills) setSkills(draft.skills);
        if (draft.preferredWorkType) setPreferredWorkType(draft.preferredWorkType);
        if (draft.customChips) setCustomChips(draft.customChips);
        if (draft.notes) setNotes(draft.notes);
        if (draft.photoPreview) {
          setPhotoPreview(draft.photoPreview);
          try {
            const arr = draft.photoPreview.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const file = new File([u8arr], 'profile_photo.webp', { type: mime });
            setPhotoFile(file);
          } catch (fileErr) {
            console.error('Error recreating file from base64:', fileErr);
          }
        }
      } catch (e) {
        console.error('Error parsing saved seeker draft:', e);
      }
    }
    isDraftLoaded.current = true;
  }, [loading]);

  // Save draft to localStorage
  useEffect(() => {
    if (!isDraftLoaded.current || loading) return;

    const draft = {
      currentStep,
      loginId,
      loginPassword,
      name,
      fatherName,
      dateOfBirth,
      age,
      gender,
      maritalStatus,
      cnic,
      phone,
      email,
      address,
      educationList,
      experienceList,
      jobCategory,
      expectedSalary,
      skills,
      preferredWorkType,
      customChips,
      notes,
      photoPreview: photoPreview.startsWith('data:') ? photoPreview : '',
    };

    try {
      localStorage.setItem('jobcenter_seeker_draft', JSON.stringify(draft));
    } catch (e) {
      console.error('Failed to save seeker draft to localStorage:', e);
    }
  }, [
    loading,
    currentStep,
    loginId,
    loginPassword,
    name,
    fatherName,
    dateOfBirth,
    age,
    gender,
    maritalStatus,
    cnic,
    phone,
    email,
    address,
    educationList,
    experienceList,
    jobCategory,
    expectedSalary,
    skills,
    preferredWorkType,
    customChips,
    notes,
    photoPreview
  ]);

  // Calculate age automatically from Date of Birth
  useEffect(() => {
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let calculated = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculated--;
        }
        if (calculated >= 0) {
          setAge(String(calculated));
        }
      }
    }
  }, [dateOfBirth]);

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const addEdu = () => {
    if (newEdu.degree.trim() && newEdu.institution.trim()) {
      setEducationList([...educationList, { ...newEdu }]);
      setNewEdu({ degree: '', institution: '', year: '' });
      setValidationErrors(prev => ({ ...prev, educationList: '' }));
    } else {
      toast.error('Degree and Institution are required');
    }
  };

  const removeEdu = (index: number) => {
    setEducationList(educationList.filter((_, i) => i !== index));
  };

  const addExp = () => {
    if (newExp.title.trim() && newExp.company.trim()) {
      setExperienceList([...experienceList, { ...newExp }]);
      setNewExp({ title: '', company: '', duration: '' });
    } else {
      toast.error('Job Title and Company are required');
    }
  };

  const removeExp = (index: number) => {
    setExperienceList(experienceList.filter((_, i) => i !== index));
  };

  // Format CNIC: XXXXX-XXXXXXX-X
  const formatCnic = (val: string) => {
    const digits = val.replace(/\D/g, '').substring(0, 13);
    let res = '';
    if (digits.length > 0) res += digits.substring(0, 5);
    if (digits.length > 5) res += '-' + digits.substring(5, 12);
    if (digits.length > 12) res += '-' + digits.substring(12, 13);
    return res;
  };

  // Format Phone: 03XX-XXXXXXX
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').substring(0, 11);
    if (digits.length <= 4) return digits;
    return `${digits.substring(0, 4)}-${digits.substring(4)}`;
  };

  // Custom Suggestion Engine Handler
  const handleAddCustomOption = async (fieldName: 'jobCategory' | 'workType', value: string) => {
    const cleanVal = value.trim();
    if (!cleanVal) return null;
    
    const list = customSuggestions[fieldName] || [];
    const existing = list.find(item => item.value.toLowerCase() === cleanVal.toLowerCase());
    
    if (existing) {
      try {
        const docRef = doc(db, 'jobcenter_custom_options', existing.id);
        await updateDoc(docRef, {
          usageCount: increment(1),
          lastUsedAt: Timestamp.now()
        });
        
        setCustomSuggestions(prev => {
          const updated = (prev[fieldName] || []).map(item => 
            item.id === existing.id ? { ...item, usageCount: item.usageCount + 1 } : item
          );
          updated.sort((a, b) => b.usageCount - a.usageCount);
          return { ...prev, [fieldName]: updated };
        });
      } catch (e) {
        console.error("Error updating suggestion count:", e);
      }
      return existing.value;
    } else {
      try {
        const docRef = doc(collection(db, 'jobcenter_custom_options'));
        const newDoc = {
          field: fieldName,
          value: cleanVal,
          usageCount: 1,
          createdAt: Timestamp.now(),
          lastUsedAt: Timestamp.now()
        };
        await setDoc(docRef, newDoc);
        
        const newItem = { id: docRef.id, value: cleanVal, usageCount: 1 };
        setCustomSuggestions(prev => {
          const updated = [...(prev[fieldName] || []), newItem];
          updated.sort((a, b) => b.usageCount - a.usageCount);
          return { ...prev, [fieldName]: updated };
        });
      } catch (e) {
        console.error("Error creating suggestion:", e);
      }
      return cleanVal;
    }
  };

  // Autocomplete change
  const handleCustomInputChanged = (val: string, fieldName: 'jobCategory' | 'workType') => {
    setCustomInputVal(val);
    if (!val.trim()) {
      setSuggestionList([]);
      return;
    }
    const list = customSuggestions[fieldName] || [];
    const filtered = list
      .filter(item => item.value.toLowerCase().includes(val.toLowerCase()))
      .map(item => item.value);
    setSuggestionList(filtered);
  };

  const addCustomChip = async (fieldName: 'jobCategory' | 'workType') => {
    if (!customInputVal.trim()) return;
    if (customChips.length >= 3) {
      toast.error('Maximum 3 custom options allowed to prevent abuse');
      return;
    }
    const actualVal = await handleAddCustomOption(fieldName, customInputVal);
    if (actualVal) {
      if (fieldName === 'jobCategory') {
        setJobCategory(actualVal);
      } else {
        if (!preferredWorkType.includes(actualVal)) {
          setPreferredWorkType([...preferredWorkType, actualVal]);
        }
      }
      if (!customChips.includes(actualVal)) {
        setCustomChips([...customChips, actualVal]);
      }
      setCustomInputVal('');
      setAddingCustom(false);
      setActiveCustomField(null);
      setSuggestionList([]);
    }
  };

  const removeCustomChip = (val: string, fieldName: 'jobCategory' | 'workType') => {
    setCustomChips(customChips.filter(c => c !== val));
    if (fieldName === 'jobCategory') {
      if (jobCategory === val) setJobCategory('');
    } else {
      setPreferredWorkType(preferredWorkType.filter(t => t !== val));
    }
  };

  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!loginId.trim()) errors.loginId = 'Login ID is required';
    if (!loginPassword || loginPassword.length < 6) errors.loginPassword = 'Password must be at least 6 characters';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Full name is required';
    if (!fatherName.trim()) errors.fatherName = "Father's name is required";
    if (!dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    if (!age || Number(age) <= 0) errors.age = 'Age is required';
    if (!gender) errors.gender = 'Gender selection is required';
    if (!maritalStatus) errors.maritalStatus = 'Marital status is required';
    
    const cnicClean = cnic.replace(/\D/g, '');
    if (cnicClean.length !== 13) {
      errors.cnic = 'CNIC must be in format XXXXX-XXXXXXX-X';
    }

    const phoneClean = phone.replace(/\D/g, '');
    if (phoneClean.length !== 11) {
      errors.phone = 'Phone number must be in format 03XX-XXXXXXX';
    }

    if (!address.trim()) errors.address = 'Residential address is required';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = () => {
    const errors: Record<string, string> = {};
    if (educationList.length === 0) errors.educationList = 'Add at least one education record';
    if (!jobCategory) errors.jobCategory = 'Job category is required';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isFormValid = () => {
    if (currentStep === 1) return validateStep1();
    if (currentStep === 2) return validateStep2();
    return validateStep3();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!validateStep3()) {
      toast.error('Missing required career profile fields');
      return;
    }

    setSubmitting(true);
    setError('');

    let seekerDocId: string | null = null;
    try {
      // 1. Upload profile photo if selected
      let photoUrl = '';
      if (photoFile) {
        photoUrl = await uploadToCloudinary(photoFile, 'Khan Hub/jobcenter/seekers');
      }

      // 2. Generate Seeker Number
      const seekersQuery = query(collection(db, 'jobcenter_seekers'), orderBy('serialNumber', 'desc'), limit(1));
      const seekersSnap = await getDocs(seekersQuery);
      const lastSeeker = seekersSnap.docs[0]?.data();
      const nextSerial = (lastSeeker?.serialNumber || 0) + 1;
      const seekerNumber = `JC-S-${String(nextSerial).padStart(3, '0')}`;

      // 3. Create seeker document payload
      const seekerData = {
        name,
        fatherName,
        email: email || null,
        age: Number(age),
        dateOfBirth,
        gender: gender as any,
        education: educationList,
        experience: experienceList,
        maritalStatus: maritalStatus as any,
        address,
        photoUrl: photoUrl || null,
        phone,
        contactNumber: phone, // ensure profile shows contact number
        cnic,
        skills,
        expectedSalary: expectedSalary || null,
        preferredJobTypes: preferredWorkType, // map for backwards compatibility
        preferredWorkType,
        // map job category to jobInterests for profile view
        jobInterests: jobCategory ? [jobCategory] : [],
        notes: notes || null,
        isActive: true,
        loginId: loginId.toUpperCase(),
        seekerNumber,
        serialNumber: nextSerial,
        createdAt: Timestamp.now(),
        tsjobCategory: jobCategory,
      };

      const seekerRef = await addDoc(collection(db, 'jobcenter_seekers'), seekerData);
      seekerDocId = seekerRef.id;

      // 4. Create portal user access account
      const result = await createJobCenterUserServer(
        loginId.toUpperCase(),
        loginPassword,
        'seeker',
        name,
        seekerRef.id,
        undefined, // employerId
        undefined, // emailDomain
        undefined, // userCollection
        undefined, // employerType
        jobCategory // jobCategory parameter
      );

      if (!result.success) {
        try {
          await deleteDoc(doc(db, 'jobcenter_seekers', seekerRef.id));
        } catch { }

        setError(`Registration failed: ${result.error}. Please choose a different Seeker Login ID.`);
        toast.error('Login account creation failed');
        return;
      }

      setSuccessDocId(seekerRef.id);
      localStorage.removeItem('jobcenter_seeker_draft');
      setCurrentStep(4);
      toast.success('Job Seeker registered successfully ✓');
    } catch (err: any) {
      console.error(err);
      if (seekerDocId) {
        try {
          await deleteDoc(doc(db, 'jobcenter_seekers', seekerDocId));
        } catch { }
      }
      setError(err?.message || 'Something went wrong');
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF7]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
      <Icon size={16} className="text-orange-500" />
      <h3 className="font-black text-gray-700 text-xs uppercase tracking-widest">
        {title}
      </h3>
    </div>
  );

  const inputStyle = "w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm transition-all shadow-sm";

  return (
    <div className="min-h-screen bg-[#FFFBF7] p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4">
          <Link href="/departments/job-center/dashboard/admin/seekers" className="inline-flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-orange-500 transition-colors tracking-widest w-fit">
            <ArrowLeft className="w-4 h-4" />
            Back to Job Seekers
          </Link>
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tight">
              <Plus className="w-8 h-8 text-orange-600" />
              Register Seeker
            </h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Fields marked * are required</p>
          </div>
        </div>

        {/* Progress Step Indicator */}
        <div className="flex items-center justify-between bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
          {[
            { step: 1, label: 'Portal Access' },
            { step: 2, label: 'Personal Info' },
            { step: 3, label: 'Career History' },
            { step: 4, label: 'Completed' }
          ].map((item, idx) => (
            <React.Fragment key={item.step}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                  currentStep === item.step
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : currentStep > item.step 
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {currentStep > item.step ? '✓' : item.step}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest hidden sm:inline ${
                  currentStep === item.step ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {item.label}
                </span>
              </div>
              {idx < 3 && <div className={`flex-1 h-0.5 mx-4 border-t border-dashed ${currentStep > item.step ? 'border-emerald-500' : 'border-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {currentStep < 4 ? (
          <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-xl shadow-orange-500/5">
            <div className="p-8 md:p-10">

              {/* STEP 1: Portal Access */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <SectionHeader icon={Shield} title="Portal Access" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Job Seeker Login ID *</label>
                      <input 
                        placeholder="e.g. SEEKER-XYZ" 
                        className={inputStyle} 
                        value={loginId} 
                        onChange={e => setLoginId(e.target.value.toUpperCase().replace(/\s/g, ''))} 
                      />
                      {validationErrors.loginId && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.loginId}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Login Password * (Min 6 chars)</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          className={inputStyle} 
                          value={loginPassword} 
                          onChange={e => setLoginPassword(e.target.value)} 
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {validationErrors.loginPassword && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.loginPassword}</p>}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 italic px-1 font-semibold uppercase tracking-wider">You'll use these to log into the Seeker Portal</p>

                  <div className="pt-6 border-t border-gray-50 flex justify-end">
                    <button
                      type="button"
                      disabled={!loginId || loginPassword.length < 6}
                      onClick={() => {
                        if (validateStep1()) setCurrentStep(2);
                      }}
                      className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-[13px] font-black shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Personal Information */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <SectionHeader icon={User} title="Personal Information" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Full Name *</label>
                      <input placeholder="Full Name" className={inputStyle} value={name} onChange={e => setName(e.target.value)} />
                      {validationErrors.name && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.name}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Father's Name *</label>
                      <input placeholder="Father's Name" className={inputStyle} value={fatherName} onChange={e => setFatherName(e.target.value)} />
                      {validationErrors.fatherName && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.fatherName}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <BrutalistCalendar
                        label="Date of Birth *"
                        value={dateOfBirth}
                        onChange={setDateOfBirth}
                      />
                      {validationErrors.dateOfBirth && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.dateOfBirth}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Age * (Auto-calculated)</label>
                      <input required readOnly placeholder="Age" className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-gray-50 focus:outline-none text-sm transition-all shadow-sm cursor-not-allowed font-black" value={age} />
                      {validationErrors.age && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.age}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Gender *</label>
                      <select required className={inputStyle} value={gender} onChange={e => setGender(e.target.value)}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {validationErrors.gender && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.gender}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Marital Status *</label>
                      <select required className={inputStyle} value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)}>
                        <option value="">Select Status</option>
                        <option value="Unmarried">Unmarried</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                      {validationErrors.maritalStatus && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.maritalStatus}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">CNIC Number * (Format: XXXXX-XXXXXXX-X)</label>
                      <input 
                        placeholder="35201-1234567-1" 
                        className={inputStyle} 
                        value={cnic} 
                        onChange={e => setCnic(formatCnic(e.target.value))} 
                      />
                      {validationErrors.cnic && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.cnic}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Phone Number * (Format: 03XX-XXXXXXX)</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                          placeholder="0300-1234567" 
                          className={`${inputStyle} pl-11`} 
                          value={phone} 
                          onChange={e => setPhone(formatPhone(e.target.value))} 
                        />
                      </div>
                      {validationErrors.phone && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.phone}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Email Address (Optional)</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input type="email" placeholder="name@example.com" className={`${inputStyle} pl-11`} value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Residential Address *</label>
                    <textarea required rows={2} className={inputStyle} placeholder="Full current address" value={address} onChange={e => setAddress(e.target.value)} />
                    {validationErrors.address && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.address}</p>}
                  </div>

                  {/* Profile Photo Upload */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Profile Photo (Optional)</label>
                    <div className="flex items-center gap-4">
                      <div 
                        onClick={() => fileRef.current?.click()}
                        className="w-16 h-16 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-all overflow-hidden flex-shrink-0"
                      >
                        {photoPreview ? (
                          <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                          <Camera size={20} className="text-gray-400" />
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
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setPhotoPreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }} />
                      <div className="text-left">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Format: WEBP (Max 5MB)</p>
                        {photoPreview && (
                          <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview('') }} className="text-[9px] text-rose-500 hover:underline font-black uppercase mt-1">Remove</button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-6 py-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!name || !fatherName || !dateOfBirth || !gender || !maritalStatus || !cnic || !phone || !address}
                      onClick={() => {
                        if (validateStep2()) setCurrentStep(3);
                      }}
                      className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-[13px] font-black shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Career History */}
              {currentStep === 3 && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <SectionHeader icon={Briefcase} title="Career History" />

                  {/* Education History Builder */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Education History *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        placeholder="Degree (e.g. Matric)"
                        className={inputStyle}
                        value={newEdu.degree}
                        onChange={e => setNewEdu({ ...newEdu, degree: e.target.value })}
                      />
                      <input
                        placeholder="Institution"
                        className={inputStyle}
                        value={newEdu.institution}
                        onChange={e => setNewEdu({ ...newEdu, institution: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <input
                          placeholder="Year"
                          className={inputStyle}
                          value={newEdu.year}
                          onChange={e => setNewEdu({ ...newEdu, year: e.target.value })}
                        />
                        <button type="button" onClick={addEdu} className="bg-orange-600 hover:bg-orange-700 text-white px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors">Add</button>
                      </div>
                    </div>
                    <div className="space-y-2 mt-3">
                      {educationList.length === 0 && <p className="text-xs text-gray-400 italic px-1">No education records added yet (at least 1 required)</p>}
                      {educationList.map((e, idx) => (
                        <div key={idx} className="bg-orange-50/20 p-4 rounded-[1.5rem] border border-orange-100 flex items-center justify-between group animate-in slide-in-from-left-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-orange-950 uppercase tracking-tight">{e.degree}</span>
                            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest mt-1">{e.institution} • {e.year}</span>
                          </div>
                          <button type="button" onClick={() => removeEdu(idx)} className="text-orange-400 hover:text-red-500 transition-colors p-2"><X size={16} /></button>
                        </div>
                      ))}
                      {validationErrors.educationList && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.educationList}</p>}
                    </div>
                  </div>

                  {/* Work Experience Builder */}
                  <div className="space-y-1.5 mt-6">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Work Experience (Optional)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        placeholder="Job Title"
                        className={inputStyle}
                        value={newExp.title}
                        onChange={e => setNewExp({ ...newExp, title: e.target.value })}
                      />
                      <input
                        placeholder="Company"
                        className={inputStyle}
                        value={newExp.company}
                        onChange={e => setNewExp({ ...newExp, company: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <input
                          placeholder="Duration"
                          className={inputStyle}
                          value={newExp.duration}
                          onChange={e => setNewExp({ ...newExp, duration: e.target.value })}
                        />
                        <button type="button" onClick={addExp} className="bg-orange-600 hover:bg-orange-700 text-white px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors">Add</button>
                      </div>
                    </div>
                    <div className="space-y-2 mt-3">
                      {experienceList.length === 0 && <p className="text-xs text-gray-400 italic px-1">No experience records added yet</p>}
                      {experienceList.map((exp, idx) => (
                        <div key={idx} className="bg-orange-50/20 p-4 rounded-[1.5rem] border border-orange-100 flex items-center justify-between animate-in slide-in-from-left-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-orange-950 uppercase tracking-tight">{exp.title}</span>
                            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest mt-1">{exp.company} • {exp.duration}</span>
                          </div>
                          <button type="button" onClick={() => removeExp(idx)} className="text-orange-400 hover:text-red-500 transition-colors p-2"><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Job Category with Suggestions */}
                  <div className="space-y-1.5 relative mt-6">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Job Category *</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {PRESET_CATEGORIES.map(cat => (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => {
                            setJobCategory(cat);
                            setCustomChips(customChips.filter(c => c !== jobCategory));
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                            jobCategory === cat
                              ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                      {customChips.filter(c => !PRESET_CATEGORIES.includes(c) && !PRESET_WORK_TYPES.includes(c)).map(chip => (
                        <span 
                          key={chip} 
                          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-dashed border-orange-400 bg-orange-50 text-orange-700 flex items-center gap-1.5 animate-in zoom-in-90"
                        >
                          {chip}
                          <button type="button" onClick={() => removeCustomChip(chip, 'jobCategory')} className="text-orange-500 hover:text-red-500"><X size={12} /></button>
                        </span>
                      ))}
                    </div>

                    {/* "+ Add Custom" control */}
                    {addingCustom && activeCustomField === 'jobCategory' ? (
                      <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-200 relative max-w-md animate-in slide-in-from-left-4">
                        <input
                          placeholder="Type custom category..."
                          className="bg-white border-none rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-400 w-full font-bold uppercase"
                          value={customInputVal}
                          onChange={e => handleCustomInputChanged(e.target.value, 'jobCategory')}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomChip('jobCategory'))}
                          onFocus={() => setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        />
                        <button type="button" onClick={() => addCustomChip('jobCategory')} className="p-1.5 bg-orange-500 text-white rounded-lg"><Plus size={14} /></button>
                        <button type="button" onClick={() => { setAddingCustom(false); setActiveCustomField(null); }} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg"><X size={14} /></button>

                        {/* Autocomplete suggestion dropdown */}
                        {showSuggestions && suggestionList.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-2 max-h-40 overflow-y-auto">
                            {suggestionList.map(s => (
                              <button
                                type="button"
                                key={s}
                                onClick={() => {
                                  setCustomInputVal(s);
                                  addCustomChip('jobCategory');
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-orange-50 hover:text-orange-600 font-bold uppercase transition-colors"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      customChips.length < 3 && (
                        <button
                          type="button"
                          onClick={() => { setAddingCustom(true); setActiveCustomField('jobCategory'); }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-dashed border-gray-300 hover:border-orange-500 rounded-xl text-xs font-black uppercase tracking-wider text-gray-400 hover:text-orange-500 bg-white transition-all"
                        >
                          <Plus size={12} /> Add Custom
                        </button>
                      )
                    )}
                    {validationErrors.jobCategory && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.jobCategory}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mt-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Expected Salary (PKR) (Optional)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input type="text" placeholder="Monthly Salary e.g. 15,000 - 25,000" className={`${inputStyle} pl-11`} value={expectedSalary} onChange={e => setExpectedSalary(e.target.value)} />
                      </div>
                      <p className="text-[10px] text-gray-400 italic px-1 font-bold uppercase tracking-wider">You can write a range e.g. 15,000 – 25,000</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Key Skills</label>
                    <div className="flex gap-2">
                      <input
                        placeholder="Add a skill (e.g. Accounting, Java, Driving)"
                        className={inputStyle}
                        value={newSkill}
                        onChange={e => setNewSkill(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      />
                      <button type="button" onClick={addSkill} className="bg-orange-600 hover:bg-orange-700 text-white px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {skills.length === 0 && <p className="text-xs text-gray-400 italic px-1">No skills added yet</p>}
                      {skills.map(s => (
                        <span key={s} className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-orange-100 flex items-center gap-2 animate-in zoom-in-90">
                          {s}
                          <button type="button" onClick={() => removeSkill(s)} className="hover:text-orange-950"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Work Type with Suggestions */}
                  <div className="space-y-1.5 mt-6 relative">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Preferred Work Type</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {PRESET_WORK_TYPES.map(t => {
                        const selected = preferredWorkType.includes(t);
                        return (
                          <button
                            type="button"
                            key={t}
                            onClick={() => {
                              if (selected) {
                                setPreferredWorkType(preferredWorkType.filter(item => item !== t));
                              } else {
                                setPreferredWorkType([...preferredWorkType, t]);
                              }
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                              selected
                                ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                      {customChips.filter(c => !PRESET_CATEGORIES.includes(c) && PRESET_WORK_TYPES.includes(c)).map(chip => (
                        <span 
                          key={chip} 
                          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-dashed border-orange-400 bg-orange-50 text-orange-700 flex items-center gap-1.5 animate-in zoom-in-90"
                        >
                          {chip}
                          <button type="button" onClick={() => removeCustomChip(chip, 'workType')} className="text-orange-500 hover:text-red-500"><X size={12} /></button>
                        </span>
                      ))}
                    </div>

                    {/* "+ Add Custom" control */}
                    {addingCustom && activeCustomField === 'workType' ? (
                      <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-200 relative max-w-md animate-in slide-in-from-left-4">
                        <input
                          placeholder="Type custom work type..."
                          className="bg-white border-none rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-400 w-full font-bold uppercase"
                          value={customInputVal}
                          onChange={e => handleCustomInputChanged(e.target.value, 'workType')}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomChip('workType'))}
                          onFocus={() => setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        />
                        <button type="button" onClick={() => addCustomChip('workType')} className="p-1.5 bg-orange-500 text-white rounded-lg"><Plus size={14} /></button>
                        <button type="button" onClick={() => { setAddingCustom(false); setActiveCustomField(null); }} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg"><X size={14} /></button>

                        {/* Autocomplete suggestion dropdown */}
                        {showSuggestions && suggestionList.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-2 max-h-40 overflow-y-auto">
                            {suggestionList.map(s => (
                              <button
                                type="button"
                                key={s}
                                onClick={() => {
                                  setCustomInputVal(s);
                                  addCustomChip('workType');
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-orange-50 hover:text-orange-600 font-bold uppercase transition-colors"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      customChips.length < 3 && (
                        <button
                          type="button"
                          onClick={() => { setAddingCustom(true); setActiveCustomField('workType'); }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-dashed border-gray-300 hover:border-orange-500 rounded-xl text-xs font-black uppercase tracking-wider text-gray-400 hover:text-orange-500 bg-white transition-all"
                        >
                          <Plus size={12} /> Add Custom
                        </button>
                      )
                    )}
                  </div>

                  <SectionHeader icon={FileText} title="Background & Notes" />
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Additional Information / Notes (Optional)</label>
                    <textarea rows={3} className={inputStyle} placeholder="Briefly describe the Job Seeker's background or any specific constraints..." value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>

                  {error && (
                    <div className="mt-6 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-3 text-rose-700 text-sm font-semibold">
                      <X size={18} />
                      {error}
                    </div>
                  )}

                  <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-6 py-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={submitting || educationList.length === 0 || !jobCategory}
                      onClick={handleSubmit}
                      className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-[13px] font-black shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>Complete Registration</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-xl p-10 md:p-16 text-center space-y-8 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/10 mx-auto animate-bounce">✓</div>
            <div>
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Job Seeker Registered Successfully</h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mt-3">Seeker node activated & credentials live</p>
            </div>
            
            <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-3xl text-left max-w-md mx-auto space-y-2">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Credentials details</p>
              <p className="text-sm font-black text-gray-900 uppercase">Login ID: <span className="text-orange-600">{loginId}</span></p>
              <p className="text-sm font-bold text-gray-500">Full Name: <span className="text-gray-900">{name}</span></p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button
                type="button"
                onClick={() => {
                  setName('');
                  setFatherName('');
                  setLoginId('');
                  setLoginPassword('');
                  setDateOfBirth('');
                  setAge('');
                  setGender('');
                  setMaritalStatus('');
                  setCnic('');
                  setPhone('');
                  setEmail('');
                  setAddress('');
                  setEducationList([]);
                  setExperienceList([]);
                  setJobCategory('');
                  setExpectedSalary('');
                  setSkills([]);
                  setPreferredWorkType([]);
                  setCustomChips([]);
                  setPhotoFile(null);
                  setPhotoPreview('');
                  setNotes('');
                  setSuccessDocId('');
                  localStorage.removeItem('jobcenter_seeker_draft');
                  setCurrentStep(1);
                }}
                className="px-8 py-4 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                Register Another
              </button>
              <Link
                href={`/departments/job-center/dashboard/admin/seekers/${successDocId}`}
                className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-orange-500/10"
              >
                View Profile
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
