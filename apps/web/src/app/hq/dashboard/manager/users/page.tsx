'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { 
  Loader2, 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Home, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  DollarSign,
  Briefcase,
  Building2,
  ChevronRight,
  TrendingUp,
  History,
  Camera,
  Plus,
  Trash2,
  FileText,
  Smartphone,
  User,
  Mail,
  Lock,
  Calendar,
  ClipboardList,
  Scissors,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { createRehabUserServer, createStaffMemberServer } from '@/app/departments/rehab/actions/createRehabUser';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import toast from 'react-hot-toast';

type TabType = 'admin' | 'staff' | 'family';

const DEPARTMENTS = [
  { id: 'rehab', name: 'Rehab Center', icon: Building2, color: 'blue' },
  { id: 'spims', name: 'SPIMS Academy', icon: TrendingUp, color: 'purple' },
  { id: 'hospital', name: 'Khan Hospital', icon: Briefcase, color: 'emerald' },
  { id: 'job-center', name: 'Job Center', icon: Briefcase, color: 'orange' },
  { id: 'school', name: 'School Center', icon: Home, color: 'pink' },
];

const COMMON_DUTIES = [
  "Morning Prayer Supervision", "Fajar Wake-up Round", "Medication Distribution (Morning)",
  "Medication Distribution (Night)", "Meal Supervision (Breakfast)", "Meal Supervision (Lunch)",
  "Meal Supervision (Dinner)", "Patient Activity Monitoring", "Counselling Session Support",
  "Vital Signs Check", "Night Security Round", "Gate/Entry Management",
  "Cleaning Supervision", "Visitor Management"
];

const DOCUMENT_TYPES = [
  "CNIC Copy (Front)", "CNIC Copy (Back)", "Educational Certificate",
  "Medical Certificate", "Police Clearance", "Contract/Agreement", "Other"
];

export default function ManagerUsersPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [activeTab, setActiveTab] = useState<TabType>('admin');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    customId: '',
    displayName: '',
    password: '',
    firstName: '',
    lastName: '',
    gender: 'male',
    dateOfBirth: '',
    cnic: '',
    phone: '',
    email: '',
    emergencyContact: { name: '', phone: '' },
    photoUrl: '',
    department: 'rehab',
    designation: '',
    staffRole: 'Worker',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: '',
    dutyStartTime: '08:00',
    dutyEndTime: '20:00',
    duties: [] as string[],
    dressCode: [] as string[],
    documents: [] as { type: string, url: string, name: string }[],
    createAccount: true,
    patientId: '', // For family tab only
  });

  const [uploading, setUploading] = useState<string | null>(null);
  const [employeeCount, setEmployeeCount] = useState(0);

  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('hq_dark_mode') === 'true';
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'manager') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'hq_users'), orderBy('createdAt', 'desc'), limit(50)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setUsers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const snap = await getDocs(collection(db, 'rehab_staff'));
      setEmployeeCount(snap.size);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!session || session.role !== 'manager') return;
    fetchUsers();
    fetchCounts();
  }, [session]);

  const generateEmployeeId = () => {
    const nextIdx = employeeCount + 1;
    return `REHAB-STF-${nextIdx.toString().padStart(3, '0')}`;
  };

  const handleFileUpload = async (file: File, type: string = 'profile') => {
    const fieldId = type === 'profile' ? 'photoUrl' : 'document';
    setUploading(fieldId);
    try {
      const url = await uploadToCloudinary(file, `khanhub/staff/${type}`);
      if (type === 'profile') {
        setFormData(prev => ({ ...prev, photoUrl: url }));
      } else {
        setFormData(prev => ({
          ...prev,
          documents: [...prev.documents, { type, url, name: file.name }]
        }));
      }
      toast.success(`${type} uploaded successfully`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(null);
    }
  };

  useEffect(() => {
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    const empId = generateEmployeeId();
    const autoEmail = `${empId.toLowerCase()}@rehab.khanhub`;
    
    setFormData(prev => ({
      ...prev,
      customId: empId.toLowerCase(),
      displayName: fullName,
      email: autoEmail
    }));
  }, [formData.firstName, formData.lastName, employeeCount]);

  useEffect(() => {
    // Default Dress Code based on gender
    const maleDress = ["Dress Pant", "Dress Shirt", "Tie", "ID Card", "Formal Shoes"];
    const femaleDress = ["Abaya / Uniform", "Hijab/Dupatta", "ID Card", "Formal Shoes"];
    
    if (formData.gender === 'male') {
      setFormData(prev => ({ ...prev, dressCode: maleDress }));
    } else {
      setFormData(prev => ({ ...prev, dressCode: femaleDress }));
    }
  }, [formData.gender]);

  const validateCustomId = (id: string) => /^[a-zA-Z0-9_-]{3,15}$/.test(id);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setToggling(id);
    try {
      await updateDoc(doc(db, 'hq_users', id), { isActive: !currentStatus });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !currentStatus } : u));
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(null);
    }
  };

  const handleAdminSubmit = async () => {
    if (!formData.customId || !formData.displayName || !formData.password) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      // Check for existing admin
      const q = query(collection(db, 'rehab_users'), where('role', '==', 'admin'), where('isActive', '==', true));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error('An active Admin account already exists. Only one primary Admin is allowed.');
      }

      const res = await createRehabUserServer(
        formData.customId,
        formData.password,
        'admin',
        formData.displayName
      );

      if (res.success) {
        setMessage({ type: 'success', text: `Admin account ${formData.customId} created successfully.` });
        setFormData({ ...formData, customId: '', displayName: '', password: '' });
        fetchUsers();
      } else {
        throw new Error(res.error || 'Failed to create account');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStaffSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.joiningDate || !formData.department) {
      setMessage({ type: 'error', text: 'Please fill all required fields marked with *' });
      toast.error('Missing required fields');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const empId = generateEmployeeId();
      let loginUserId = null;

      // Handle Login Account Creation if toggled ON
      if (formData.createAccount) {
        const res = await createStaffMemberServer(
          empId,
          formData.password || 'admin123', // Default password if none provided
          `${formData.firstName} ${formData.lastName}`,
          formData.staffRole,
          formData.phone,
          Number(formData.salary) || 0,
          formData.gender,
          formData.duties.map(d => ({ id: d.toLowerCase().replace(/\s/g, '_'), description: d })),
          formData.dutyStartTime,
          formData.dutyEndTime,
          formData.photoUrl,
          formData.department
        );

        if (!res.success) throw new Error(res.error || 'Failed to create login account');
        loginUserId = res.uid;
      }

      // Save to staff collection (Rehab vs HQ)
      const collectionName = formData.department === 'rehab' ? 'rehab_staff' : 'hq_staff';
      const staffRef = collection(db, collectionName);
      
      await addDoc(staffRef, {
        employeeId: empId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: `${formData.firstName} ${formData.lastName}`,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        cnic: formData.cnic,
        phone: formData.phone,
        emergencyContact: formData.emergencyContact,
        photoUrl: formData.photoUrl || null,
        department: formData.department,
        designation: formData.designation,
        role: formData.staffRole,
        joiningDate: formData.joiningDate,
        salary: Number(formData.salary) || 0,
        dutyStartTime: formData.dutyStartTime,
        dutyEndTime: formData.dutyEndTime,
        duties: formData.duties,
        dressCode: formData.dressCode,
        documents: formData.documents,
        loginUserId: loginUserId,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: session?.customId || 'manager',
      });

      setMessage({ type: 'success', text: `Staff profile ${empId} created successfully.` });
      toast.success(`Staff profile initialized: ${empId}`);
      
      // Reset Form
      setFormData(prev => ({
        ...prev,
        firstName: '', lastName: '', photoUrl: '', phone: '', cnic: '', dateOfBirth: '',
        designation: '', salary: '', duties: [], documents: [], patientId: ''
      }));
      
      fetchUsers();
      fetchCounts();
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message });
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFamilySubmit = async () => {
    if (!formData.customId || !formData.displayName || !formData.password || !formData.patientId) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      // Validate Patient ID exists
      const q = query(collection(db, 'rehab_patients'), where('customId', '==', formData.patientId));
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error(`Patient ID ${formData.patientId} not found.`);
      }

      const res = await createRehabUserServer(
        formData.customId,
        formData.password,
        'family',
        formData.displayName,
        formData.patientId
      );

      if (res.success) {
        setMessage({ type: 'success', text: `Family account ${formData.customId} linked to ${formData.patientId} successfully.` });
        setFormData({ ...formData, customId: '', displayName: '', password: '', patientId: '' });
        fetchUsers();
      } else {
        throw new Error(res.error || 'Failed to create family account');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-black' : 'bg-white'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 pb-20 ${darkMode ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8FAFC] text-gray-900'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
              <Users className="w-10 h-10 text-blue-500" />
              Account Management
            </h1>
            <p className={`mt-1 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Create and manage administrative, staff, and family credentials
            </p>
          </div>
          
          <div className={`flex items-center gap-4 px-5 py-2.5 rounded-2xl border ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-8 h-8 rounded-full border-2 ${darkMode ? 'border-gray-800 bg-gray-700' : 'border-white bg-gray-100'} flex items-center justify-center`}>
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
              ))}
            </div>
            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-tight text-blue-500 leading-none">Global Access</p>
              <p className={`text-[10px] font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Unified Account Hub</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mb-8 p-1.5 rounded-2xl flex gap-1 bg-gray-200/50 dark:bg-gray-900/50 backdrop-blur-md max-w-md">
          {[
            { id: 'admin', icon: ShieldCheck, label: 'Admin' },
            { id: 'staff', icon: UserPlus, label: 'Staff' },
            { id: 'family', icon: Home, label: 'Family' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as TabType); setMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : `hover:bg-gray-300/50 dark:hover:bg-gray-800/50 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Form Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <div className={`rounded-[2.5rem] border p-8 md:p-10 transition-all duration-500 ${
              darkMode ? 'bg-gray-900/40 border-gray-800 shadow-2xl shadow-black/20' : 'bg-white border-gray-100 shadow-xl shadow-blue-900/5'
            }`}>
              
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  activeTab === 'admin' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                  activeTab === 'staff' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' :
                  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                }`}>
                  {activeTab === 'admin' ? <ShieldCheck className="w-7 h-7" /> :
                   activeTab === 'staff' ? <UserPlus className="w-7 h-7" /> :
                   <Home className="w-7 h-7" />}
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">
                    Create {activeTab} Account
                  </h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {activeTab === 'admin' ? 'Strategic administrative oversight credentials' :
                     activeTab === 'staff' ? 'Operational and clinical personnel management' :
                     'Patient family and guardian portal access'}
                  </p>
                </div>
              </div>

              {message && (
                <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                  message.type === 'success' 
                    ? 'bg-green-500/10 border border-green-500/20 text-green-500' 
                    : 'bg-red-500/10 border border-red-500/20 text-red-500'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <p className="text-sm font-bold">{message.text}</p>
                </div>
              )}

              <div className="space-y-6">
                
                {/* ADMIN & FAMILY FORMS (Simplified Grid) */}
                {(activeTab === 'admin' || activeTab === 'family') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                    {/* Common Fields */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 ml-1">Custom User ID</label>
                      <div className="relative group">
                        <Users className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-gray-600 group-focus-within:text-blue-500' : 'text-gray-300 group-focus-within:text-blue-600'}`} />
                        <input
                          type="text"
                          placeholder="e.g. jdoe_001"
                          value={formData.customId}
                          onChange={e => setFormData({ ...formData, customId: e.target.value.toLowerCase().replace(/\s/g, '') })}
                          className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-bold transition-all outline-none ${
                            darkMode ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:bg-gray-800' : 'bg-gray-50 border-gray-200 focus:border-blue-500 focus:bg-white'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 ml-1">Full Display Name</label>
                      <div className="relative group">
                        <UserPlus className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-gray-600 group-focus-within:text-blue-500' : 'text-gray-300 group-focus-within:text-blue-600'}`} />
                        <input
                          type="text"
                          placeholder="e.g. Johnathan Doe"
                          value={formData.displayName}
                          onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                          className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-bold transition-all outline-none ${
                            darkMode ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:bg-gray-800' : 'bg-gray-50 border-gray-200 focus:border-blue-500 focus:bg-white'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 ml-1">Secure Password</label>
                      <div className="relative group">
                        <ShieldCheck className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-gray-600 group-focus-within:text-blue-500' : 'text-gray-300 group-focus-within:text-blue-600'}`} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          className={`w-full pl-11 pr-12 py-4 rounded-2xl border text-sm font-bold transition-all outline-none ${
                            darkMode ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:bg-gray-800' : 'bg-gray-50 border-gray-200 focus:border-blue-500 focus:bg-white'
                          }`}
                        />
                        <button 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {activeTab === 'family' && (
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 ml-1">Patient ID Link</label>
                        <div className="relative group">
                          <TrendingUp className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                          <input
                            type="text"
                            placeholder="e.g. P001, P002"
                            value={formData.patientId}
                            onChange={e => setFormData({ ...formData, patientId: e.target.value.toUpperCase() })}
                            className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-bold transition-all outline-none ${
                              darkMode ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    <div className="md:col-span-2 pt-6 flex justify-end">
                      <button
                        disabled={submitting}
                        onClick={activeTab === 'admin' ? handleAdminSubmit : handleFamilySubmit}
                        className={`px-10 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 disabled:opacity-50 ${
                          activeTab === 'admin' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 text-white' :
                          'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white'
                        }`}
                      >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        {submitting ? 'Confirming...' : `Initialize ${activeTab}`}
                      </button>
                    </div>
                  </div>
                )}

                {/* STAFF FORM (Comprehensive 6-Section Layout) */}
                {activeTab === 'staff' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* SECTION 1: PROFILE & IDENTITY */}
                    <div className={`p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-[#1e1e1e] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <User className="text-blue-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold tracking-tight">SECTION 1: PROFILE & IDENTITY</h3>
                          <p className="text-sm opacity-60">Personal information and identity verification</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-white/10 rounded-2xl p-4 aspect-square relative hover:border-blue-500 transition-colors cursor-pointer group">
                          {formData.photoUrl ? (
                            <img src={formData.photoUrl} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <div className="text-center">
                              <Camera size={32} className="mx-auto mb-2 opacity-40 group-hover:opacity-100 transition-opacity" />
                              <span className="text-xs font-medium opacity-50">Upload Photo*</span>
                            </div>
                          )}
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'profile')}
                          />
                          {uploading === 'photoUrl' && (
                            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent animate-spin rounded-full"></div>
                            </div>
                          )}
                        </div>

                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold tracking-[0.2em] opacity-50 uppercase ml-1">First Name*</label>
                            <input
                              type="text"
                              placeholder="Enter first name"
                              value={formData.firstName}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all ${darkMode ? 'bg-white/5 focus:bg-white/10' : 'bg-white focus:bg-gray-100 border border-gray-200'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold tracking-[0.2em] opacity-50 uppercase ml-1">Last Name*</label>
                            <input
                              type="text"
                              placeholder="Enter last name"
                              value={formData.lastName}
                              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all ${darkMode ? 'bg-white/5 focus:bg-white/10' : 'bg-white focus:bg-gray-100 border border-gray-200'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold tracking-[0.2em] opacity-50 uppercase ml-1">Gender*</label>
                            <select
                              value={formData.gender}
                              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all ${darkMode ? 'bg-white/5 focus:bg-white/10' : 'bg-white focus:bg-gray-100 border border-gray-200'}`}
                            >
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold tracking-[0.2em] opacity-50 uppercase ml-1">Date of Birth</label>
                            <input
                              type="date"
                              value={formData.dateOfBirth}
                              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all ${darkMode ? 'bg-white/5 focus:bg-white/10' : 'bg-white focus:bg-gray-100 border border-gray-200'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold tracking-[0.2em] opacity-50 uppercase ml-1">CNIC Number</label>
                            <input
                              type="text"
                              placeholder="42101-XXXXXXX-X"
                              value={formData.cnic}
                              onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all ${darkMode ? 'bg-white/5 focus:bg-white/10' : 'bg-white focus:bg-gray-100 border border-gray-200'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold tracking-[0.2em] opacity-50 uppercase ml-1">Phone Number*</label>
                            <input
                              type="tel"
                              placeholder="+92 3XX XXXXXXX"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all ${darkMode ? 'bg-white/5 focus:bg-white/10' : 'bg-white focus:bg-gray-100 border border-gray-200'}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: EMPLOYMENT DETAILS */}
                    <div className={`p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-[#1e1e1e] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <Building2 className="text-emerald-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold tracking-tight">SECTION 2: EMPLOYMENT DETAILS</h3>
                          <p className="text-sm opacity-60">Job location, role and initial salary</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="text-[10px] font-bold tracking-[0.2em] opacity-50 uppercase ml-1">Assigned Department*</label>
                          <div className="grid grid-cols-2 gap-3">
                            {DEPARTMENTS.map(dept => (
                              <button
                                key={dept.id}
                                onClick={() => setFormData({ ...formData, department: dept.id })}
                                className={`p-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${
                                  formData.department === dept.id 
                                    ? 'border-blue-500 bg-blue-500/10' 
                                    : 'border-transparent bg-white/5 hover:bg-white/10'
                                }`}
                              >
                                <dept.icon size={24} className={formData.department === dept.id ? 'text-blue-500' : 'opacity-40'} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{dept.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold tracking-[0.2em] opacity-50 uppercase ml-1">Staff Role / Category*</label>
                            <select
                              value={formData.staffRole}
                              onChange={(e) => setFormData({ ...formData, staffRole: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all ${darkMode ? 'bg-white/5 focus:bg-white/10' : 'bg-white focus:bg-gray-100 border border-gray-200'}`}
                            >
                              <option value="Worker">Worker (Junior)</option>
                              <option value="Senior Staff">Senior Staff</option>
                              <option value="Team Lead">Team Lead</option>
                              <option value="Manager">Manager</option>
                              <option value="Field Ops">Field Ops</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold tracking-[0.2em] opacity-50 uppercase ml-1">Employee ID</label>
                              <input
                                type="text"
                                disabled
                                value={generateEmployeeId()}
                                className={`w-full h-14 px-5 rounded-2xl outline-none opacity-50 ${darkMode ? 'bg-white/5' : 'bg-gray-100 border border-gray-200'}`}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold tracking-[0.2em] opacity-50 uppercase ml-1">Starting Salary*</label>
                              <input
                                type="number"
                                placeholder="50000"
                                value={formData.salary}
                                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                className={`w-full h-14 px-5 rounded-2xl outline-none transition-all ${darkMode ? 'bg-white/5 focus:bg-white/10' : 'bg-white focus:bg-gray-100 border border-gray-200'}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: DUTIES ASSIGNMENT */}
                    <div className={`p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-[#1e1e1e] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                          <ClipboardList className="text-purple-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold tracking-tight">SECTION 3: DUTIES ASSIGNMENT</h3>
                          <p className="text-sm opacity-60">Specific responsibilities for daily monitoring</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {COMMON_DUTIES.map(duty => (
                          <button
                            key={duty}
                            onClick={() => {
                              const exists = formData.duties.includes(duty);
                              setFormData({
                                ...formData,
                                duties: exists ? formData.duties.filter(d => d !== duty) : [...formData.duties, duty]
                              });
                            }}
                            className={`px-4 py-2 rounded-full text-[10px] font-bold tracking-wider transition-all border ${
                              formData.duties.includes(duty)
                                ? 'bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                                : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100'
                            }`}
                          >
                            {duty}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* SECTION 4: DRESS CODE */}
                    <div className={`p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-[#1e1e1e] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                          <Scissors className="text-orange-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold tracking-tight">SECTION 4: DRESS CODE</h3>
                          <p className="text-sm opacity-60">Required uniform items (Gender Aware)</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {formData.dressCode.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                            <CheckCircle size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SECTION 5: LOGIN ACCOUNT */}
                    <div className={`p-6 rounded-[2.5rem] border-2 transition-all ${formData.createAccount ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 bg-white/5'}`}>
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${formData.createAccount ? 'bg-blue-500 text-white' : 'bg-white/10 opacity-40'}`}>
                            <Lock size={24} />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">Create KHANHUB Login Account?</h3>
                            <p className="text-sm opacity-60">Enable mobile app & dashboard access</p>
                          </div>
                        </div>

                        <div className="flex items-center bg-white/10 p-1.5 rounded-2xl border border-white/5">
                          <button 
                            onClick={() => setFormData({ ...formData, createAccount: true })}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all ${formData.createAccount ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/20' : 'opacity-40'}`}
                          >
                            YES
                          </button>
                          <button 
                            onClick={() => setFormData({ ...formData, createAccount: false })}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all ${!formData.createAccount ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'opacity-40'}`}
                          >
                            NO
                          </button>
                        </div>
                      </div>

                      {formData.createAccount && (
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white/5 rounded-[2rem] border border-white/10 animate-in zoom-in-95 duration-300">
                           <div className="space-y-1.5">
                            <label className="text-[10px] font-bold tracking-[0.2em] opacity-50 uppercase ml-1">Generated Tracking Email</label>
                            <div className="w-full h-14 px-5 rounded-2xl bg-white/5 flex items-center text-sm font-medium opacity-70">
                              <Mail size={16} className="mr-3 opacity-40" />
                              {formData.email}
                            </div>
                          </div>
                          <div className="space-y-1.5 relative">
                            <label className="text-[10px] font-bold tracking-[0.2em] opacity-50 uppercase ml-1">Account Password (Initial)*</label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="e.g. admin123"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className={`w-full h-14 px-5 rounded-2xl outline-none transition-all ${darkMode ? 'bg-white/10 focus:bg-white/20' : 'bg-white border border-gray-200'}`}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 6: DOCUMENTS */}
                    <div className={`p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-[#1e1e1e] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                          <FileText className="text-pink-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold tracking-tight">SECTION 6: DOCUMENTS & VERIFICATION</h3>
                          <p className="text-sm opacity-60">Upload CNIC, Certificates and Contracts</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-4 hover:border-blue-500 transition-all cursor-pointer relative group">
                          <Plus className="text-blue-500" size={28} />
                          <div>
                            <p className="text-sm font-bold uppercase tracking-widest">Add Document</p>
                            <p className="text-[10px] opacity-40 mt-1">PDF / JPG / PNG</p>
                          </div>
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'document')}
                          />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          {formData.documents.map((doc, idx) => (
                            <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                <FileText className="text-pink-500" size={16} />
                                <span className="text-xs font-bold truncate max-w-[200px]">{doc.name}</span>
                              </div>
                              <button 
                                onClick={() => setFormData({ ...formData, documents: formData.documents.filter((_, i) => i !== idx) })}
                                className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Final Action */}
                    <div className="pt-6">
                      <button
                        onClick={handleStaffSubmit}
                        disabled={submitting}
                        className="w-full h-20 rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xl font-black tracking-[0.2em] shadow-2xl shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-4"
                      >
                        {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 size={24} />}
                        {submitting ? 'PROCESSING...' : 'INITIALIZE STAFF MEMBER'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Right Summary Column */}
          <div className="space-y-6">
            <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-gray-100 shadow-xl shadow-blue-900/5'}`}>
              <h3 className="text-lg font-black uppercase tracking-tight mb-6">Credential Summary</h3>
              <div className="space-y-6">
                {[
                  { label: 'Username', value: formData.customId ? `${formData.customId}@rehab.khanhub` : 'None', icon: Users },
                  { label: 'Access Level', value: activeTab === 'admin' ? 'Administrative' : activeTab === 'staff' ? 'Operational' : 'Viewer', icon: ShieldCheck },
                  { label: 'Department', value: activeTab === 'staff' ? (DEPARTMENTS.find(d => d.id === formData.department)?.name || 'Default') : 'System Wide', icon: Building2 },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-gray-800 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 leading-none mb-1">{item.label}</p>
                      <p className="text-sm font-black truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-8 rounded-[2.5rem] border group transition-all duration-300 cursor-pointer overflow-hidden relative ${darkMode ? 'bg-blue-600/10 border-blue-500/20' : 'bg-blue-600 text-white shadow-xl shadow-blue-600/20'}`}>
              <div className="relative z-10">
                <h3 className="text-xl font-black uppercase tracking-tight mb-2">Need Help?</h3>
                <p className={`text-xs font-bold leading-relaxed mb-6 ${darkMode ? 'text-blue-400' : 'text-blue-100'}`}>
                  Admin accounts have full control. Staff accounts can manage their departments. Family accounts are read-only.
                </p>
                <button className={`w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${
                  darkMode ? 'border-blue-500/30 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white' : 'border-white/30 bg-white/20 text-white hover:bg-white hover:text-blue-600'
                }`}>
                  Read Docs
                </button>
              </div>
              <ShieldCheck className={`absolute -right-8 -bottom-8 w-40 h-40 transition-transform duration-500 group-hover:scale-110 ${darkMode ? 'text-blue-500/10' : 'text-white/10'}`} />
            </div>
          </div>

        </div>

        {/* Audit Table */}
        <div className="mt-12">
          <div className={`rounded-[2.5rem] border overflow-hidden transition-all duration-500 ${
            darkMode ? 'bg-gray-900/40 border-gray-800 shadow-2xl' : 'bg-white border-gray-100 shadow-xl shadow-blue-900/5'
          }`}>
            <div className={`px-8 py-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${darkMode ? 'border-gray-800 bg-gray-900/60' : 'border-gray-50 bg-gray-50/50'}`}>
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-black uppercase tracking-tight">Recent System Access</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  darkMode ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-white border-gray-200 text-gray-400'
                }`}>
                  {users.length} Records
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className={`text-[10px] font-black uppercase tracking-tighter ${darkMode ? 'text-gray-600 border-gray-800' : 'text-gray-400 border-gray-50'}`}>
                    <th className="px-8 py-5">Full Identity</th>
                    <th className="px-8 py-5">Assigned Role</th>
                    <th className="px-8 py-5">Initialization Date</th>
                    <th className="px-8 py-5 text-right">Operational Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-800/50' : 'divide-gray-50'}`}>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-[11px]">
                        No account records initialized
                      </td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id} className="group hover:bg-blue-500/5 transition-all">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                              u.role === 'admin' ? 'bg-blue-500 text-white' : 
                              u.role === 'staff' ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'
                            }`}>
                              {u.displayName?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-black">{u.displayName}</p>
                              <p className={`text-[10px] font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{u.customId}@rehab.khanhub</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 capitalize">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            u.role === 'manager' || u.role === 'admin' 
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                              : 'bg-green-500/10 text-green-500 border-green-500/20'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className={`px-8 py-5 text-xs font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending'}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button
                            disabled={toggling === u.id}
                            onClick={() => handleToggleStatus(u.id, u.isActive !== false)}
                            className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              u.isActive !== false
                                ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                            {u.isActive !== false ? 'Active' : 'Disabled'}
                            {toggling === u.id && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}