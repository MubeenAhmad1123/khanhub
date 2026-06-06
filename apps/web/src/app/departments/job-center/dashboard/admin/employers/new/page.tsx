// d:\Khan Hub\apps\web\src\app\departments\job-center\dashboard\admin\employers\new\page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, Timestamp, doc, deleteDoc, query, getDocs, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { createJobCenterUserServer } from '@/app/departments/job-center/actions/createJobCenterUser';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { 
  ArrowLeft, Save, Loader2, User, Upload, 
  Camera, Phone, MapPin, FileText, Plus, X, 
  Eye, EyeOff, Shield, Mail, Building, Globe, Check, HelpCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Employer } from '@/types/job-center';

// Hardcoded industries for Company Type
const PRESET_INDUSTRIES = [
  'Healthcare', 'Education', 'Manufacturing', 'Retail', 
  'Food & Beverage', 'IT/Tech', 'Construction', 'Agriculture', 'Other'
];

// Hardcoded requirements for Individual Type
const PRESET_REQUIREMENTS = [
  'Maid / House Help', 'Cook', 'Driver', 'Baby Sitter / Nanny', 
  'Guard / Chowkidar', 'Home Tutor', 'Skilled Labor (Plumber, Electrician, etc.)', 'Other'
];

export default function RegisterEmployerPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  
  // UI Steps: 1: Portal Access, 2: Employer Details, 3: Success Screen
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successDocId, setSuccessDocId] = useState('');
  
  // Custom Field suggestions cache in state
  const [customSuggestions, setCustomSuggestions] = useState<Record<string, { id: string; value: string; usageCount: number }[]>>({});
  
  // Suggested dropdown values shown to user based on what they type
  const [suggestionList, setSuggestionList] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customInputVal, setCustomInputVal] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);

  // General fields
  const [employerType, setEmployerType] = useState<'company' | 'individual' | null>(null);

  // SECTION 1: Login Credentials
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // SECTION 2 (Company Mode): Company Info
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState(''); // Preset or custom
  const [companySize, setCompanySize] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  
  // Logo / Profile Photo Upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  // SECTION 3 (Company Mode): Contact Person Info
  const [contactPersonName, setContactPersonName] = useState('');
  const [contactPersonPosition, setContactPersonPosition] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [description, setDescription] = useState('');

  // SECTION 2 (Individual Mode): Individual Info
  const [cnic, setCnic] = useState('');
  const [requirementTypes, setRequirementTypes] = useState<string[]>([]); // preset or custom
  const [customChips, setCustomChips] = useState<string[]>([]); // tracks custom chips separate for border dashed style
  const [helpersCount, setHelpersCount] = useState('1');
  const [preferredGender, setPreferredGender] = useState('Any');

  // Inline Validation Errors state
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

    const savedDraft = localStorage.getItem('jobcenter_employer_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.currentStep) setCurrentStep(draft.currentStep);
        if (draft.employerType) setEmployerType(draft.employerType);
        if (draft.loginId) setLoginId(draft.loginId);
        if (draft.loginPassword) setLoginPassword(draft.loginPassword);
        if (draft.companyName) setCompanyName(draft.companyName);
        if (draft.industry) setIndustry(draft.industry);
        if (draft.companySize) setCompanySize(draft.companySize);
        if (draft.companyEmail) setCompanyEmail(draft.companyEmail);
        if (draft.website) setWebsite(draft.website);
        if (draft.address) setAddress(draft.address);
        if (draft.contactPersonName) setContactPersonName(draft.contactPersonName);
        if (draft.contactPersonPosition) setContactPersonPosition(draft.contactPersonPosition);
        if (draft.contactPhone) setContactPhone(draft.contactPhone);
        if (draft.description) setDescription(draft.description);
        if (draft.cnic) setCnic(draft.cnic);
        if (draft.requirementTypes) setRequirementTypes(draft.requirementTypes);
        if (draft.customChips) setCustomChips(draft.customChips);
        if (draft.helpersCount) setHelpersCount(draft.helpersCount);
        if (draft.preferredGender) setPreferredGender(draft.preferredGender);
        if (draft.logoPreview) {
          setLogoPreview(draft.logoPreview);
          try {
            const arr = draft.logoPreview.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const file = new File([u8arr], 'logo.webp', { type: mime });
            setLogoFile(file);
          } catch (fileErr) {
            console.error('Error recreating logo file from base64:', fileErr);
          }
        }
      } catch (e) {
        console.error('Error parsing saved employer draft:', e);
      }
    }
    isDraftLoaded.current = true;
  }, [loading]);

  // Save draft to localStorage
  useEffect(() => {
    if (!isDraftLoaded.current || loading) return;

    const draft = {
      currentStep,
      employerType,
      loginId,
      loginPassword,
      companyName,
      industry,
      companySize,
      companyEmail,
      website,
      address,
      contactPersonName,
      contactPersonPosition,
      contactPhone,
      description,
      cnic,
      requirementTypes,
      customChips,
      helpersCount,
      preferredGender,
      logoPreview: logoPreview.startsWith('data:') ? logoPreview : '',
    };

    try {
      localStorage.setItem('jobcenter_employer_draft', JSON.stringify(draft));
    } catch (e) {
      console.error('Failed to save employer draft to localStorage:', e);
    }
  }, [
    loading,
    currentStep,
    employerType,
    loginId,
    loginPassword,
    companyName,
    industry,
    companySize,
    companyEmail,
    website,
    address,
    contactPersonName,
    contactPersonPosition,
    contactPhone,
    description,
    cnic,
    requirementTypes,
    customChips,
    helpersCount,
    preferredGender,
    logoPreview
  ]);

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

  // Custom Suggestion Handlers
  const handleAddCustomOption = async (fieldName: 'industry' | 'requirementType', value: string) => {
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

  // Handle typing custom input
  const handleCustomInputChanged = (val: string, fieldName: 'industry' | 'requirementType') => {
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

  const addCustomChip = async (fieldName: 'industry' | 'requirementType') => {
    if (!customInputVal.trim()) return;
    if (customChips.length >= 3) {
      toast.error('Maximum 3 custom options allowed to prevent abuse');
      return;
    }
    const actualVal = await handleAddCustomOption(fieldName, customInputVal);
    if (actualVal) {
      if (fieldName === 'industry') {
        setIndustry(actualVal);
      } else {
        if (!requirementTypes.includes(actualVal)) {
          setRequirementTypes([...requirementTypes, actualVal]);
        }
      }
      if (!customChips.includes(actualVal)) {
        setCustomChips([...customChips, actualVal]);
      }
      setCustomInputVal('');
      setAddingCustom(false);
      setSuggestionList([]);
    }
  };

  const removeCustomChip = (val: string, fieldName: 'industry' | 'requirementType') => {
    setCustomChips(customChips.filter(c => c !== val));
    if (fieldName === 'industry') {
      if (industry === val) setIndustry('');
    } else {
      setRequirementTypes(requirementTypes.filter(t => t !== val));
    }
  };

  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!employerType) errors.employerType = 'Employer type is required';
    if (!loginId.trim()) errors.loginId = 'Login ID is required';
    if (!loginPassword || loginPassword.length < 6) errors.loginPassword = 'Password must be at least 6 characters';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (employerType === 'company') {
      if (!companyName.trim()) errors.companyName = 'Company name is required';
      if (!industry) errors.industry = 'Industry is required';
      if (!address.trim()) errors.address = 'Office Address is required';
      if (!contactPersonName.trim()) errors.contactPersonName = 'Contact Person Name is required';
      
      const phoneClean = contactPhone.replace(/\D/g, '');
      if (phoneClean.length !== 11) {
        errors.contactPhone = 'Phone number must be in format 03XX-XXXXXXX';
      }
    } else if (employerType === 'individual') {
      if (!contactPersonName.trim()) errors.contactPersonName = 'Full name is required';
      
      const cnicClean = cnic.replace(/\D/g, '');
      if (cnicClean.length !== 13) {
        errors.cnic = 'CNIC must be in format XXXXX-XXXXXXX-X';
      }
      
      const phoneClean = contactPhone.replace(/\D/g, '');
      if (phoneClean.length !== 11) {
        errors.contactPhone = 'Phone number must be in format 03XX-XXXXXXX';
      }
      
      if (!address.trim()) errors.address = 'Home address is required';
      if (requirementTypes.length === 0) errors.requirementTypes = 'Please select at least one service needed';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isFormValid = () => {
    if (currentStep === 1) return validateStep1();
    return validateStep2();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!validateStep2()) {
      toast.error('Please correct errors before submission');
      return;
    }

    setSubmitting(true);
    setError('');

    let employerDocId: string | null = null;
    try {
      // 1. Upload logo / profile photo if selected
      let logoUrl = '';
      if (logoFile) {
        logoUrl = await uploadToCloudinary(logoFile, 'Khan Hub/jobcenter/employers');
      }

      // 2. Prepare Firestore payload based on type
      let employerData: Omit<Employer, 'id'>;

      if (employerType === 'company') {
        employerData = {
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
          tsemployerType: 'company',
        };
      } else {
        employerData = {
          companyName: contactPersonName, // Map name for compatibility
          industry: requirementTypes.join(', '), // Map list for compatibility
          email: companyEmail || null,
          address,
          logoUrl: logoUrl || null,
          contactPerson: {
            name: contactPersonName,
            position: 'Individual / Household',
            phone: contactPhone,
          },
          description: description || null,
          isActive: true,
          loginId: loginId.toUpperCase(),
          createdAt: Timestamp.now(),
          tsemployerType: 'individual',
          requirementTypes,
          cnic,
        };
      }

      // 3. Create document in Firestore
      const employerRef = await addDoc(collection(db, 'jobcenter_employers'), employerData);
      employerDocId = employerRef.id;

      // 4. Create user access account
      const result = await createJobCenterUserServer(
        loginId.toUpperCase(),
        loginPassword,
        'employer',
        contactPersonName,
        undefined, // seekerId
        employerRef.id,
        undefined, // emailDomain
        undefined, // userCollection
        employerType || undefined // employerType parameter
      );

      if (!result.success) {
        try {
          await deleteDoc(doc(db, 'jobcenter_employers', employerRef.id));
        } catch {}

        setError(`Registration failed: ${result.error}. Please choose a different Employer Login ID.`);
        toast.error('Login account creation failed');
        return;
      }

      setSuccessDocId(employerRef.id);
      localStorage.removeItem('jobcenter_employer_draft');
      setCurrentStep(3);
      toast.success('Employer registered successfully ✓');
    } catch (err: any) {
      console.error(err);
      if (employerDocId) {
        try {
          await deleteDoc(doc(db, 'jobcenter_employers', employerDocId));
        } catch {}
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
          <Link href="/departments/job-center/dashboard/admin/employers" className="inline-flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-orange-500 transition-colors tracking-widest w-fit">
            <ArrowLeft className="w-4 h-4" />
            Back to Employers
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tight">
                <Building className="w-8 h-8 text-orange-600" />
                Register Employer
              </h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Fields marked * are required</p>
            </div>
          </div>
        </div>

        {/* Progress Step Indicator */}
        <div className="flex items-center justify-between bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
          {[
            { step: 1, label: 'Portal Access' },
            { step: 2, label: 'Profile Details' },
            { step: 3, label: 'Completed' }
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
              {idx < 2 && <div className={`flex-1 h-0.5 mx-4 border-t border-dashed ${currentStep > item.step ? 'border-emerald-500' : 'border-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Form Container */}
        {currentStep < 3 ? (
          <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-xl shadow-orange-500/5">
            <div className="p-8 md:p-10">
              
              {currentStep === 1 && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {/* Step 1: Employer Type Selector */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Employer Type *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setEmployerType('company');
                          setRequirementTypes([]);
                          setCustomChips([]);
                          setCompanyName('');
                          setIndustry('');
                          setContactPersonName('');
                        }}
                        className={`flex flex-col items-center justify-center p-8 rounded-[2.5rem] border-2 transition-all group ${
                          employerType === 'company'
                            ? 'border-orange-500 bg-orange-500/5 shadow-xl shadow-orange-500/10'
                            : 'border-gray-100 hover:border-orange-200 hover:bg-gray-50/50'
                        }`}
                      >
                        <Building size={32} className={`mb-3 transition-transform group-hover:scale-110 ${employerType === 'company' ? 'text-orange-500' : 'text-gray-400'}`} />
                        <span className="text-sm font-black uppercase tracking-widest text-gray-900">Company / Business</span>
                        <span className="text-[10px] text-gray-400 mt-1">Corporate or commercial entity</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmployerType('individual');
                          setRequirementTypes([]);
                          setCustomChips([]);
                          setCompanyName('');
                          setIndustry('');
                          setContactPersonName('');
                        }}
                        className={`flex flex-col items-center justify-center p-8 rounded-[2.5rem] border-2 transition-all group ${
                          employerType === 'individual'
                            ? 'border-orange-500 bg-orange-500/5 shadow-xl shadow-orange-500/10'
                            : 'border-gray-100 hover:border-orange-200 hover:bg-gray-50/50'
                        }`}
                      >
                        <User size={32} className={`mb-3 transition-transform group-hover:scale-110 ${employerType === 'individual' ? 'text-orange-500' : 'text-gray-400'}`} />
                        <span className="text-sm font-black uppercase tracking-widest text-gray-900">Individual / Household</span>
                        <span className="text-[10px] text-gray-400 mt-1">Home help, maids, drivers, cooks</span>
                      </button>
                    </div>
                    {validationErrors.employerType && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.employerType}</p>}
                  </div>

                  {employerType && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
                      <SectionHeader icon={Shield} title="Portal Access" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Employer Login ID *</label>
                          <input 
                            placeholder="e.g. COMP-ABC" 
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
                      <p className="text-[10px] text-gray-400 italic px-1 font-semibold uppercase tracking-wider">You'll use these to log into the Employer Portal</p>
                    </div>
                  )}

                  <div className="pt-6 border-t border-gray-50 flex justify-end">
                    <button
                      type="button"
                      disabled={!employerType || !loginId || loginPassword.length < 6}
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

              {currentStep === 2 && (
                <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-500">
                  {employerType === 'company' ? (
                    <div className="space-y-6">
                      <SectionHeader icon={Building} title="Company Information" />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Company Name *</label>
                          <input 
                            placeholder="e.g. Nexus Surgical Ltd." 
                            className={inputStyle} 
                            value={companyName} 
                            onChange={e => setCompanyName(e.target.value)} 
                          />
                          {validationErrors.companyName && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.companyName}</p>}
                        </div>

                        {/* Company Mode Custom Suggestion Industry */}
                        <div className="space-y-1.5 relative">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Industry *</label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {PRESET_INDUSTRIES.map(ind => (
                              <button
                                type="button"
                                key={ind}
                                onClick={() => {
                                  setIndustry(ind);
                                  setCustomChips([]);
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                                  industry === ind && customChips.length === 0
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                                }`}
                              >
                                {ind}
                              </button>
                            ))}
                            {customChips.map(chip => (
                              <span 
                                key={chip} 
                                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-dashed border-orange-400 bg-orange-50 text-orange-700 flex items-center gap-1.5"
                              >
                                {chip}
                                <button type="button" onClick={() => removeCustomChip(chip, 'industry')} className="text-orange-500 hover:text-red-500"><X size={12} /></button>
                              </span>
                            ))}
                          </div>
                          
                          {/* "+ Add Custom" control */}
                          {addingCustom ? (
                            <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-200 relative">
                              <input
                                placeholder="Type custom industry..."
                                className="bg-white border-none rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-400 w-full"
                                value={customInputVal}
                                onChange={e => handleCustomInputChanged(e.target.value, 'industry')}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomChip('industry'))}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                              />
                              <button type="button" onClick={() => addCustomChip('industry')} className="p-1.5 bg-orange-500 text-white rounded-lg"><Plus size={14} /></button>
                              <button type="button" onClick={() => setAddingCustom(false)} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg"><X size={14} /></button>

                              {/* Autocomplete suggestion dropdown */}
                              {showSuggestions && suggestionList.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-2 max-h-40 overflow-y-auto">
                                  {suggestionList.map(s => (
                                    <button
                                      type="button"
                                      key={s}
                                      onClick={() => {
                                        setCustomInputVal(s);
                                        addCustomChip('industry');
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
                                onClick={() => setAddingCustom(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-dashed border-gray-300 hover:border-orange-500 rounded-xl text-xs font-black uppercase tracking-wider text-gray-400 hover:text-orange-500 bg-white transition-all"
                              >
                                <Plus size={12} /> Add Custom
                              </button>
                            )
                          )}
                          {validationErrors.industry && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.industry}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Company Size (Optional)</label>
                          <select className={inputStyle} value={companySize} onChange={e => setCompanySize(e.target.value)}>
                            <option value="">Select Size</option>
                            <option value="1-10">1-10 Employees</option>
                            <option value="11-50">11-50 Employees</option>
                            <option value="51-200">51-200 Employees</option>
                            <option value="201-500">201-500 Employees</option>
                            <option value="500+">500+ Employees</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Company Email (Optional)</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input type="email" placeholder="hr@company.com" className={`${inputStyle} pl-11`} value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Website URL (Optional)</label>
                          <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input type="url" placeholder="https://www.company.com" className={`${inputStyle} pl-11`} value={website} onChange={e => setWebsite(e.target.value)} />
                          </div>
                        </div>

                        {/* Logo Upload */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Company Logo (Optional)</label>
                          <div className="flex items-center gap-4">
                            <div 
                              onClick={() => fileRef.current?.click()}
                              className="w-16 h-16 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-all overflow-hidden flex-shrink-0"
                            >
                              {logoPreview ? (
                                <img src={logoPreview} className="w-full h-full object-cover" alt="Preview" />
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
                              setLogoFile(file);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setLogoPreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }} />
                            <div className="text-left">
                              <p className="text-[10px] text-gray-400 font-bold uppercase">Format: WEBP (Max 5MB)</p>
                              {logoPreview && (
                                <button type="button" onClick={() => { setLogoFile(null); setLogoPreview('') }} className="text-[9px] text-rose-500 hover:underline font-black uppercase mt-1">Remove</button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Office Address *</label>
                        <textarea required rows={2} className={inputStyle} placeholder="Full commercial office address" value={address} onChange={e => setAddress(e.target.value)} />
                        {validationErrors.address && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.address}</p>}
                      </div>

                      <SectionHeader icon={User} title="Contact Person" />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Contact Name *</label>
                          <input placeholder="e.g. Mubeen Ahmed" className={inputStyle} value={contactPersonName} onChange={e => setContactPersonName(e.target.value)} />
                          {validationErrors.contactPersonName && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.contactPersonName}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Contact Title/Position (Optional)</label>
                          <input placeholder="e.g. HR Manager" className={inputStyle} value={contactPersonPosition} onChange={e => setContactPersonPosition(e.target.value)} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Contact Phone * (Pakistan Format: 03XX-XXXXXXX)</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input 
                            placeholder="0321-1234567" 
                            className={`${inputStyle} pl-11`} 
                            value={contactPhone} 
                            onChange={e => setContactPhone(formatPhone(e.target.value))} 
                          />
                        </div>
                        {validationErrors.contactPhone && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.contactPhone}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Company Bio / What kind of staff are you looking for? (Optional)</label>
                        <textarea rows={3} className={inputStyle} placeholder="Describe your commercial requirements..." value={description} onChange={e => setDescription(e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in duration-500">
                      <SectionHeader icon={User} title="Individual / Household Details" />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Your Full Name *</label>
                          <input placeholder="Full Name" className={inputStyle} value={contactPersonName} onChange={e => setContactPersonName(e.target.value)} />
                          {validationErrors.contactPersonName && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.contactPersonName}</p>}
                        </div>
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
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Contact Phone * (Pakistan Format: 03XX-XXXXXXX)</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                              placeholder="0300-1234567" 
                              className={`${inputStyle} pl-11`} 
                              value={contactPhone} 
                              onChange={e => setContactPhone(formatPhone(e.target.value))} 
                            />
                          </div>
                          {validationErrors.contactPhone && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.contactPhone}</p>}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Email Address (Optional)</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input type="email" placeholder="name@example.com" className={`${inputStyle} pl-11`} value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Home Address *</label>
                        <textarea required rows={2} className={inputStyle} placeholder="Full residential address" value={address} onChange={e => setAddress(e.target.value)} />
                        {validationErrors.address && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.address}</p>}
                      </div>

                      {/* Photo Upload (Optional) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Profile Photo (Optional)</label>
                        <div className="flex items-center gap-4">
                          <div 
                            onClick={() => fileRef.current?.click()}
                            className="w-16 h-16 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-all overflow-hidden flex-shrink-0"
                          >
                            {logoPreview ? (
                              <img src={logoPreview} className="w-full h-full object-cover" alt="Preview" />
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
                            setLogoFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setLogoPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }} />
                          <div className="text-left">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Format: WEBP (Max 5MB)</p>
                            {logoPreview && (
                              <button type="button" onClick={() => { setLogoFile(null); setLogoPreview('') }} className="text-[9px] text-rose-500 hover:underline font-black uppercase mt-1">Remove</button>
                            )}
                          </div>
                        </div>
                      </div>

                      <SectionHeader icon={HelpCircle} title="What kind of help do you need? *" />
                      
                      {/* Individual Mode Custom Suggestions Requirement Types */}
                      <div className="space-y-1.5 relative">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {PRESET_REQUIREMENTS.map(req => {
                            const selected = requirementTypes.includes(req);
                            return (
                              <button
                                type="button"
                                key={req}
                                onClick={() => {
                                  if (selected) {
                                    setRequirementTypes(requirementTypes.filter(t => t !== req));
                                  } else {
                                    setRequirementTypes([...requirementTypes, req]);
                                  }
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                                  selected
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                                }`}
                              >
                                {req}
                              </button>
                            );
                          })}
                          {customChips.map(chip => (
                            <span 
                              key={chip} 
                              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-dashed border-orange-400 bg-orange-50 text-orange-700 flex items-center gap-1.5 animate-in zoom-in-90"
                            >
                              {chip}
                              <button type="button" onClick={() => removeCustomChip(chip, 'requirementType')} className="text-orange-500 hover:text-red-500"><X size={12} /></button>
                            </span>
                          ))}
                        </div>

                        {/* "+ Add Custom" control */}
                        {addingCustom ? (
                          <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-200 relative max-w-md animate-in slide-in-from-left-4">
                            <input
                              placeholder="Type custom help needed..."
                              className="bg-white border-none rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-400 w-full font-bold uppercase"
                              value={customInputVal}
                              onChange={e => handleCustomInputChanged(e.target.value, 'requirementType')}
                              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomChip('requirementType'))}
                              onFocus={() => setShowSuggestions(true)}
                              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            />
                            <button type="button" onClick={() => addCustomChip('requirementType')} className="p-1.5 bg-orange-500 text-white rounded-lg"><Plus size={14} /></button>
                            <button type="button" onClick={() => setAddingCustom(false)} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg"><X size={14} /></button>

                            {/* Autocomplete suggestion dropdown */}
                            {showSuggestions && suggestionList.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-2 max-h-40 overflow-y-auto">
                                {suggestionList.map(s => (
                                  <button
                                    type="button"
                                    key={s}
                                    onClick={() => {
                                      setCustomInputVal(s);
                                      addCustomChip('requirementType');
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
                              onClick={() => setAddingCustom(true)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-dashed border-gray-300 hover:border-orange-500 rounded-xl text-xs font-black uppercase tracking-wider text-gray-400 hover:text-orange-500 bg-white transition-all"
                            >
                              <Plus size={12} /> Add Custom
                            </button>
                          )
                        )}
                        {validationErrors.requirementTypes && <p className="text-xs text-rose-500 font-bold mt-1 px-1">{validationErrors.requirementTypes}</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Number of Helpers Needed *</label>
                          <select className={inputStyle} value={helpersCount} onChange={e => setHelpersCount(e.target.value)}>
                            <option value="1">1 Helper</option>
                            <option value="2">2 Helpers</option>
                            <option value="3">3 Helpers</option>
                            <option value="More than 3">More than 3 Helpers</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Preferred Gender *</label>
                          <div className="flex gap-2">
                            {['Any', 'Male', 'Female'].map(g => (
                              <button
                                type="button"
                                key={g}
                                onClick={() => setPreferredGender(g)}
                                className={`flex-1 py-3 rounded-xl border text-xs font-black uppercase transition-all ${
                                  preferredGender === g
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                                }`}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Additional Notes (Optional)</label>
                        <textarea rows={3} className={inputStyle} placeholder="Specify helper timings, duties, specific preferences, or salary packages..." value={description} onChange={e => setDescription(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mt-6 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-3 text-rose-700 text-sm font-semibold">
                      <X size={18} />
                      {error}
                    </div>
                  )}

                  <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-6 py-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !isFormValid()}
                      className="px-8 py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-2xl text-[13px] font-black shadow-lg shadow-orange-500/20 active:scale-95 transition-all uppercase tracking-widest flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>Register</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-xl p-10 md:p-16 text-center space-y-8 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/10 mx-auto animate-bounce">✓</div>
            <div>
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Employer Registered Successfully</h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mt-3">Authentication node activated & data synced</p>
            </div>
            
            <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-3xl text-left max-w-md mx-auto space-y-2">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Credentials Details</p>
              <p className="text-sm font-black text-gray-900 uppercase">Login ID: <span className="text-orange-600">{loginId}</span></p>
              <p className="text-sm font-bold text-gray-500">Full Name: <span className="text-gray-900">{contactPersonName}</span></p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button
                type="button"
                onClick={() => {
                  setEmployerType(null);
                  setLoginId('');
                  setLoginPassword('');
                  setCompanyName('');
                  setIndustry('');
                  setCompanySize('');
                  setCompanyEmail('');
                  setWebsite('');
                  setAddress('');
                  setLogoFile(null);
                  setLogoPreview('');
                  setContactPersonName('');
                  setContactPersonPosition('');
                  setContactPhone('');
                  setDescription('');
                  setCnic('');
                  setRequirementTypes([]);
                  setCustomChips([]);
                  setHelpersCount('1');
                  setPreferredGender('Any');
                  setSuccessDocId('');
                  localStorage.removeItem('jobcenter_employer_draft');
                  setCurrentStep(1);
                }}
                className="px-8 py-4 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                Register Another
              </button>
              <Link
                href={`/departments/job-center/dashboard/admin/employers/${successDocId}`}
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
