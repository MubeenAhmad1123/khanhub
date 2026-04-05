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
  serverTimestamp,
  getDoc
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
  Unlock,
  Calendar,
  ClipboardList,
  Scissors,
  CheckCircle,
  XCircle,
  ShieldAlert,
  UploadCloud,
  FileCheck,
  ArrowRightCircle,
  Fingerprint,
  Crosshair,
  Activity,
  BookOpen
} from 'lucide-react';
import { createRehabUserServer, createStaffMemberServer } from '@/app/departments/rehab/actions/createRehabUser';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import toast from 'react-hot-toast';

type TabType = 'admin' | 'staff' | 'client';

const DEPARTMENTS = [
  { id: 'rehab', name: 'Rehab Center', fullName: 'Khan Hub Rehabilitation Center', icon: Building2, color: 'blue', emailDomain: '@rehab.khanhub', collection: 'rehab_users', staffCollection: 'rehab_staff', prefix: 'REHAB' },
  { id: 'spims', name: 'SPIMS Academy', fullName: 'SPIMS Academy', icon: TrendingUp, color: 'purple', emailDomain: '@spims.edu.pk', collection: 'spims_users', staffCollection: 'spims_staff', prefix: 'SPIMS' },
  { id: 'hospital', name: 'Khan Hospital', fullName: 'Khan Hospital', icon: Briefcase, color: 'emerald', emailDomain: '@hospital.khanhub', collection: 'hospital_users', staffCollection: 'hospital_staff', prefix: 'HOSP' },
  { id: 'sukoon-center', name: 'Sukoon Center', fullName: 'Sukoon Center', icon: Home, color: 'orange', emailDomain: '@sukoon.khanhub', collection: 'sukoon_users', staffCollection: 'sukoon_staff', prefix: 'SUK' },
  { id: 'social-media', name: 'Social Media', fullName: 'Social Media', icon: Smartphone, color: 'pink', emailDomain: '@media.khanhub', collection: 'media_users', staffCollection: 'media_staff', prefix: 'MED' },
  { id: 'it', name: 'IT Department', fullName: 'IT Department', icon: ShieldCheck, color: 'indigo', emailDomain: '@it.khanhub', collection: 'it_users', staffCollection: 'it_staff', prefix: 'IT' },
  { id: 'hq', name: 'HQ / Khan Hub', fullName: 'HQ / Khan Hub', icon: Users, color: 'gray', emailDomain: '@khanhub.io', collection: 'hq_users', staffCollection: 'hq_staff', prefix: 'HQ' },
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

const UNIFORM_RULES: Record<string, string[]> = {
  'hospital_male_doctor':           ['ID Card'],
  'hospital_female_doctor':         ['ID Card'],
  'hospital_male_staff':            ['Black OT Kit', 'White Overall', 'Shoes', 'ID Card'],
  'hospital_female_staff':          ['Black OT Kit', 'White Overall', 'Shoes', 'ID Card', 'Hijab'],
  'spims_male_teacher':             ['Dress Pant', 'Dress Shirt', 'Tie', 'Shoes', 'White Overall', 'ID Card'],
  'spims_female_teacher':           ['White Overall', 'ID Card'],
  'rehab_male_admin':               ['Dress Pant', 'Dress Shirt', 'Tie', 'Shoes', 'ID Card'],
  'rehab_female_doctor':            ['White Overall', 'ID Card', 'Shoes'],
  'rehab_male_reception':           ['Dress Pant', 'Dress Shirt', 'Tie', 'Shoes', 'ID Card'],
  'rehab_female_reception':         ['Black OT Kit', 'Hijab', 'White Overall', 'Shoes', 'ID Card'],
  'rehab_male_security':            ['Security Uniform', 'Shoes', 'ID Card', 'Security Cap'],
  'rehab_male_default':             ['Dress Pant', 'Dress Shirt', 'Tie', 'Shoes', 'ID Card'],
  'sukoon-center_female_admin':     ['ID Card'],
  'sukoon-center_male_default':     ['Dress Pant', 'Dress Shirt', 'Tie', 'Shoes', 'ID Card'],
  'social-media_male_default':      ['Dress Pant', 'Dress Shirt', 'Tie', 'Shoes', 'ID Card'],
  'it_male_default':                ['Dress Pant', 'Dress Shirt', 'Tie', 'Shoes', 'ID Card'],
  'welfare_male_admin':             ['ID Card'],
  'hq_male_cashier':                ['Dress Pant', 'Dress Shirt', 'Tie', 'Shoes', 'ID Card'],
  'security_male_default':          ['Security Uniform', 'Shoes', 'ID Card', 'Security Cap', 'Torch', 'Whistle'],
  'security_female_default':        ['ID Card'],
};

const ALL_DRESS_ITEMS = [
  'Dress Pant', 'Dress Shirt', 'Tie', 'ID Card', 'Shoes', 'White Overall', 
  'Black OT Kit', 'Hijab', 'Lab Coat', 'Security Uniform', 'Security Cap', 'Torch', 'Whistle'
];

const DEFAULT_DUTY_TIMES: Record<string, { start: string; end: string }> = {
  'hospital':       { start: '08:00', end: '20:00' },
  'spims':          { start: '09:00', end: '14:00' },
  'rehab':          { start: '08:00', end: '20:00' },
  'sukoon-center':  { start: '10:00', end: '17:00' },
  'social-media':   { start: '09:00', end: '21:00' },
  'it':             { start: '09:00', end: '21:00' },
  'hq':             { start: '09:00', end: '17:00' },
};

function getDressCodeKey(department: string, gender: string, designation: string): string {
  const dept = department.toLowerCase();
  const gen = gender.toLowerCase();
  const desig = designation.toLowerCase();
  
  if (desig.includes('doctor')) return `${dept}_${gen}_doctor`;
  if (desig.includes('admin')) return `${dept}_${gen}_admin`;
  if (desig.includes('security')) return `${dept}_${gen}_security`;
  if (desig.includes('reception')) return `${dept}_${gen}_reception`;
  if (desig.includes('teacher') || desig.includes('lecturer')) return `${dept}_${gen}_teacher`;
  if (desig.includes('cashier')) return `${dept}_${gen}_cashier`;
  
  return `${dept}_${gen}_default`;
}

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
    patientId: '',
  });

  const [uploading, setUploading] = useState<string | null>(null);
  const [employeeCount, setEmployeeCount] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ customId: string, password: string, name: string } | null>(null);

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
      const deptDetails = DEPARTMENTS.find(d => d.id === formData.department) || DEPARTMENTS[0];
      const collectionName = activeTab === 'staff' ? deptDetails.staffCollection : deptDetails.collection;
      
      const snap = await getDocs(query(collection(db, collectionName), orderBy('createdAt', 'desc'), limit(50)));
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
      const deptDetails = DEPARTMENTS.find(d => d.id === formData.department);
      if(!deptDetails) return;
      const snap = await getDocs(collection(db, deptDetails.staffCollection));
      setEmployeeCount(snap.size);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!session || session.role !== 'manager') return;
    fetchUsers();
    fetchCounts();
  }, [session, formData.department, activeTab]);

  const generateEmployeeId = () => {
    const nextIdx = employeeCount + 1;
    const deptDetails = DEPARTMENTS.find(d => d.id === formData.department);
    const prefix = deptDetails ? deptDetails.prefix : 'UNK';
    return `${prefix}-STF-${nextIdx.toString().padStart(3, '0')}`;
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
    const deptDetails = DEPARTMENTS.find(d => d.id === formData.department);
    const domain = deptDetails ? deptDetails.emailDomain : '@rehab.khanhub';
    const autoEmail = `${empId.toLowerCase()}${domain}`;
    
    setFormData(prev => ({
      ...prev,
      customId: empId.toLowerCase(),
      displayName: fullName,
      email: autoEmail
    }));
  }, [formData.firstName, formData.lastName, employeeCount, formData.department]);

  useEffect(() => {
    // Smart Timings
    const times = DEFAULT_DUTY_TIMES[formData.department];
    if (times) {
      setFormData(prev => ({ ...prev, dutyStartTime: times.start, dutyEndTime: times.end }));
    }

    // Smart Dress Code
    const key = getDressCodeKey(formData.department, formData.gender, formData.designation);
    const suggested = UNIFORM_RULES[key] || 
      (formData.gender === 'male' 
        ? ['Dress Pant', 'Dress Shirt', 'Tie', 'ID Card', 'Shoes']
        : ['ID Card', 'Shoes']);
        
    setFormData(prev => ({ ...prev, dressCode: suggested }));
  }, [formData.department, formData.gender, formData.designation]);

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
      const deptDetails = DEPARTMENTS.find(d => d.id === formData.department) || DEPARTMENTS[0];
      const q = query(collection(db, deptDetails.collection), where('role', '==', 'admin'), where('isActive', '==', true));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error('An active Admin account already exists. Only one primary Admin is allowed.');
      }

      const res = await createRehabUserServer(
        formData.customId,
        formData.password,
        'admin',
        formData.displayName,
        undefined, // no patientId
        deptDetails.emailDomain,
        deptDetails.collection
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
    setLastCreated(null);

    try {
      const empId = generateEmployeeId();
      let loginUserId = null;
      const pass = formData.password || 'admin123';

      const deptDetails = DEPARTMENTS.find(d => d.id === formData.department) || DEPARTMENTS[0];

      // Handle Login Account Creation if toggled ON
      if (formData.createAccount) {
        // BUG 3 FIX: Integrating createRehabUserServer for staff login accounts
        const res = await createRehabUserServer(
          empId.toLowerCase(),
          pass,
          'staff',
          `${formData.firstName} ${formData.lastName}`,
          undefined,
          deptDetails.emailDomain,
          deptDetails.collection
        );

        if (!res.success) throw new Error(res.error || 'Failed to create login account');
        loginUserId = res.uid;
      }

      // Save to staff collection
      const collectionName = deptDetails.staffCollection;
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

      if (formData.createAccount) {
        setLastCreated({
          customId: empId.toLowerCase(),
          password: pass,
          name: `${formData.firstName} ${formData.lastName}`
        });
      }

      setMessage({ type: 'success', text: `Staff profile ${empId} created successfully.` });
      toast.success(`Staff profile initialized: ${empId}`);
      
      // Reset Form (except for credentials view)
      setFormData(prev => ({
        ...prev,
        firstName: '', lastName: '', password: '', photoUrl: '', phone: '', cnic: '', dateOfBirth: '',
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

  const handleClientSubmit = async () => {
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

      const deptDetails = DEPARTMENTS.find(d => d.id === formData.department) || DEPARTMENTS[0];
      const res = await createRehabUserServer(
        formData.customId,
        formData.password,
        'client',
        formData.displayName,
        formData.patientId,
        deptDetails.emailDomain,
        deptDetails.collection
      );

      if (res.success) {
        setMessage({ type: 'success', text: `Client account ${formData.customId} linked to ${formData.patientId} successfully.` });
        setFormData({ ...formData, customId: '', displayName: '', password: '', patientId: '' });
        fetchUsers();
      } else {
        throw new Error(res.error || 'Failed to create client account');
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
        <div className="mb-8 p-1.5 rounded-2xl flex gap-1 bg-gray-200/50 dark:bg-gray-900/50 backdrop-blur-md max-w-lg overflow-x-auto whitespace-nowrap">
          {[
            { id: 'admin', icon: ShieldCheck, label: 'Admin' },
            { id: 'staff', icon: UserPlus, label: 'Staff' },
            { id: 'client', icon: Home, label: 'Client / User' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as TabType); setMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 min-w-max ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : `hover:bg-gray-300/50 dark:hover:bg-gray-800/50 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Form Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">

            {/* Department Horizontal Selector */}
            <div className="mb-6 overflow-x-auto pb-4 scrollbar-hide">
              <div className="flex gap-4 min-w-max">
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept.id}
                    onClick={() => { setFormData({ ...formData, department: dept.id }); fetchCounts(); }}
                    className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      formData.department === dept.id 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : `border-transparent ${darkMode ? 'bg-zinc-900/60 hover:bg-zinc-800' : 'bg-white hover:bg-gray-50'} shadow-sm`
                    }`}
                  >
                    <div className={formData.department === dept.id ? 'text-blue-500' : 'text-gray-400'}>
                      <dept.icon size={24} />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-black tracking-tight ${formData.department === dept.id ? 'text-blue-600 dark:text-blue-400' : ''}`}>{dept.name}</p>
                      <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{dept.prefix}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

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

              {lastCreated && (
                <div className="mb-10 p-8 rounded-[2rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 relative overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <Unlock className="w-5 h-5" />
                        </div>
                        <h3 className="font-black uppercase tracking-widest">Credentials Generated</h3>
                      </div>
                      <button onClick={() => setLastCreated(null)} className="text-white/60 hover:text-white transition-colors">
                        <XCircle size={24} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-black/20 p-6 rounded-2xl border border-white/10 backdrop-blur-xl">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Access Identity</p>
                        <p className="text-lg font-mono font-black">{lastCreated.customId}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Secure Password</p>
                        <p className="text-lg font-mono font-black">{lastCreated.password}</p>
                      </div>
                    </div>
                    
                    <p className="mt-6 text-[10px] font-bold uppercase tracking-widest leading-relaxed opacity-80">
                      IMPORTANT: Please provide these credentials to {lastCreated.name}. 
                      The system does not store passwords in plain text after this session.
                    </p>
                  </div>
                  <ShieldCheck size={180} className="absolute -right-12 -bottom-12 opacity-10 rotate-12" />
                </div>
              )}

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
                
                {/* ADMIN & CLIENT FORMS (Simplified Grid) */}
                {(activeTab === 'admin' || activeTab === 'client') && (
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

                    {activeTab === 'client' && (
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
                        onClick={activeTab === 'admin' ? handleAdminSubmit : handleClientSubmit}
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
                    <div className={`p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-[#1e1e1e] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <User className="text-blue-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">SECTION 1 — Profile & Identity</h3>
                          <p className="text-sm font-bold opacity-60">Personal information and identity verification</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="sm:col-span-2 lg:col-span-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-4 aspect-square relative hover:border-blue-500 transition-colors cursor-pointer group bg-gray-50/50 dark:bg-black/20">
                          {formData.photoUrl ? (
                            <img src={formData.photoUrl} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <div className="text-center">
                              <Camera size={32} className="mx-auto mb-2 opacity-40 group-hover:opacity-100 transition-opacity text-blue-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Upload Photo*</span>
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
                              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">First Name*</label>
                            <input
                              type="text"
                              placeholder="Enter first name"
                              value={formData.firstName}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Last Name*</label>
                            <input
                              type="text"
                              placeholder="Enter last name"
                              value={formData.lastName}
                              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Gender*</label>
                            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl">
                              {['male', 'female'].map(g => (
                                <button
                                  key={g}
                                  onClick={() => setFormData({ ...formData, gender: g })}
                                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    formData.gender === g 
                                      ? 'bg-blue-600 text-white shadow-lg' 
                                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                  }`}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Date of Birth</label>
                            <input
                              type="date"
                              value={formData.dateOfBirth}
                              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">CNIC Number (00000-0000000-0)</label>
                            <input
                              type="text"
                              placeholder="42101-XXXXXXX-X"
                              value={formData.cnic}
                              onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                              className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Phone / WhatsApp*</label>
                            <div className="relative">
                              <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                              <input
                                type="tel"
                                placeholder="+92 3XX XXXXXXX"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className={`w-full pl-11 pr-5 h-14 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 dark:border-white/5 pt-6">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Emergency Contact Name</label>
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={formData.emergencyContact.name}
                            onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, name: e.target.value } })}
                            className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Emergency Contact Phone</label>
                          <input
                            type="tel"
                            placeholder="+92 3XX XXXXXXX"
                            value={formData.emergencyContact.phone}
                            onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, phone: e.target.value } })}
                            className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: EMPLOYMENT DETAILS */}
                    <div className={`p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-[#1e1e1e] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <Building2 className="text-emerald-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">SECTION 2 — Employment Details</h3>
                          <p className="text-sm font-bold opacity-60">Job location, role and initial salary</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Employee ID</label>
                              <div className="h-14 px-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center">
                                <span className="text-xs font-black text-blue-500 tracking-widest uppercase">{generateEmployeeId()}</span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Joining Date*</label>
                              <input
                                type="date"
                                value={formData.joiningDate}
                                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                                className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Designation / Title*</label>
                              <input
                                type="text"
                                placeholder="e.g. Senior Doctor"
                                value={formData.designation}
                                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Category / Role*</label>
                              <select
                                value={formData.staffRole}
                                onChange={(e) => setFormData({ ...formData, staffRole: e.target.value })}
                                className={`w-full h-14 px-5 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                              >
                                <option value="Worker">Worker / Junior</option>
                                <option value="Doctor">Doctor / Clinical</option>
                                <option value="Nurse">Medical Staff / Nurse</option>
                                <option value="Supervisor">Supervisor</option>
                                <option value="Manager">Management</option>
                                <option value="Executive">Executive</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Starting Basic Salary (PKR)*</label>
                            <div className="relative">
                              <DollarSign className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                              <input
                                type="number"
                                placeholder="50000"
                                value={formData.salary}
                                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                className={`w-full pl-11 pr-5 h-14 rounded-2xl outline-none transition-all font-bold text-sm ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5 focus:border-blue-500' : 'bg-gray-50 focus:bg-white border-gray-100 focus:border-blue-500'}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                    {/* SECTION 3: DUTIES ASSIGNMENT */}
                    <div className={`p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-[#1e1e1e] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                          <ClipboardList className="text-purple-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">SECTION 3 — Duties & Timings</h3>
                          <p className="text-sm font-bold opacity-60">Working hours and specific responsibilities</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Daily Duty Shift</label>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <span className="text-[8px] font-black uppercase tracking-widest opacity-40 ml-1">Start Time</span>
                              <input
                                type="time"
                                value={formData.dutyStartTime}
                                onChange={(e) => setFormData({ ...formData, dutyStartTime: e.target.value })}
                                className={`w-full h-12 px-4 rounded-xl outline-none font-bold text-xs ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5' : 'bg-gray-50 border-gray-100'}`}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[8px] font-black uppercase tracking-widest opacity-40 ml-1">End Time</span>
                              <input
                                type="time"
                                value={formData.dutyEndTime}
                                onChange={(e) => setFormData({ ...formData, dutyEndTime: e.target.value })}
                                className={`w-full h-12 px-4 rounded-xl outline-none font-bold text-xs ${darkMode ? 'bg-white/5 focus:bg-white/10 border-white/5' : 'bg-gray-50 border-gray-100'}`}
                              />
                            </div>
                          </div>
                          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle size={12} className="text-blue-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Auto-calculated</span>
                            </div>
                            <p className="text-[10px] font-bold opacity-60">Shift times are suggested based on department policy but can be customized.</p>
                          </div>
                        </div>

                        <div className="lg:col-span-2 space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Select Responsibilities / Duties</label>
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
                                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                  formData.duties.includes(duty)
                                    ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/30'
                                    : 'bg-gray-100 border-gray-200 dark:bg-white/5 dark:border-white/10 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                              >
                                {duty}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: DRESS CODE */}
                    <div className={`p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-[#1e1e1e] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                          <Scissors className="text-orange-500" size={20} />
                        </div>
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">SECTION 4 — Uniform Policy</h3>
                          <p className="text-sm font-bold opacity-60">Required attire and equipment (Gender Aware)</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {ALL_DRESS_ITEMS.map((item) => {
                          const isAssigned = formData.dressCode.includes(item);
                          return (
                            <button
                              key={item}
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  dressCode: isAssigned 
                                    ? prev.dressCode.filter(i => i !== item)
                                    : [...prev.dressCode, item]
                                }));
                              }}
                              className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${
                                isAssigned 
                                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-600' 
                                  : 'bg-gray-50 border-gray-100 dark:bg-white/5 dark:border-white/5 text-gray-400 opacity-40 hover:opacity-100'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${isAssigned ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 dark:border-white/20'}`}>
                                {isAssigned && <CheckCircle size={12} />}
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest">{item}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-6 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-center gap-3">
                        <ShieldCheck size={16} className="text-orange-500" />
                        <p className="text-[10px] font-bold text-orange-600/80 uppercase tracking-wider">Note: Selected items will be strictly monitored during daily attendance rounds.</p>
                      </div>
                    </div>

                    {/* SECTION 5: LOGIN ACCOUNT */}
                    <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${formData.createAccount ? 'border-indigo-500/50 bg-indigo-500/5 shadow-2xl shadow-indigo-500/10' : 'border-white/5 bg-white/5'}`}>
                      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${formData.createAccount ? 'bg-indigo-500 text-white rotate-6' : 'bg-white/10 opacity-40'}`}>
                            {formData.createAccount ? <Unlock size={28} /> : <Lock size={28} />}
                          </div>
                          <div>
                            <h3 className="text-xl font-black tracking-tight">KHANHUB LOGIN ACCESS</h3>
                            <p className="text-sm opacity-50 font-medium">Enable mobile app & centralized dashboard access</p>
                          </div>
                        </div>

                        <div className="flex items-center bg-black/20 p-2 rounded-[1.5rem] border border-white/5 backdrop-blur-xl">
                          <button 
                            onClick={() => setFormData({ ...formData, createAccount: true })}
                            className={`px-10 py-4 rounded-xl text-[11px] font-black tracking-[0.2em] transition-all duration-300 ${formData.createAccount ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40' : 'opacity-30 hover:opacity-100'}`}
                          >
                            AUTHORIZED
                          </button>
                          <button 
                            onClick={() => setFormData({ ...formData, createAccount: false })}
                            className={`px-10 py-4 rounded-xl text-[11px] font-black tracking-[0.2em] transition-all duration-300 ${!formData.createAccount ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'opacity-30 hover:opacity-100'}`}
                          >
                            RESTRICTED
                          </button>
                        </div>
                      </div>

                      {formData.createAccount && (
                        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-black/20 rounded-[2.5rem] border border-white/5 animate-in slide-in-from-top-4 duration-500">
                           <div className="space-y-3">
                            <label className="text-[10px] font-black tracking-[0.25em] text-indigo-400 uppercase ml-1">SYSTEM GENERATED IDENTIFIER</label>
                            <div className="w-full h-16 px-6 rounded-2xl bg-white/5 border border-white/5 flex items-center text-sm font-bold text-white/80 group transition-all hover:border-indigo-500/30">
                              <Mail size={18} className="mr-4 text-indigo-500" />
                              {formData.email || 'pending_generation@khanhub.io'}
                            </div>
                            <p className="text-[9px] opacity-30 font-bold ml-1 uppercase tracking-widest italic">Note: This will be used for all system communications.</p>
                          </div>
                          
                          <div className="space-y-3 relative">
                            <label className="text-[10px] font-black tracking-[0.25em] text-indigo-400 uppercase ml-1">SECURE ACCESS TOKEN (PASSWORD)*</label>
                            <div className="relative group">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter secure password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full h-16 px-6 rounded-2xl bg-white/10 border border-white/10 text-white font-mono placeholder:text-white/20 focus:bg-white/15 focus:border-indigo-500/50 outline-none transition-all"
                              />
                              <button 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                              >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                            <p className="text-[9px] opacity-30 font-bold ml-1 uppercase tracking-widest italic">Required for the first-time biometric enrollment.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 6: DOCUMENTS */}
                    <div className="p-8 rounded-[2.5rem] border border-white/5 bg-white/5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <ShieldAlert size={120} />
                      </div>

                      <div className="flex items-center gap-6 mb-10">
                        <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shadow-inner shadow-pink-500/10">
                          <FileText className="text-pink-500" size={28} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black tracking-tight">VERIFICATION ARTIFACTS</h3>
                          <p className="text-sm opacity-50 font-medium">Digital archives for CNIC, certifications & employment contracts</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="relative h-48 rounded-[2rem] border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-pink-500/40 transition-all duration-300 flex flex-col items-center justify-center text-center p-8 group/upload">
                          <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center mb-4 group-hover/upload:scale-110 transition-transform">
                            <Plus className="text-pink-500" size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest">Upload Archive</p>
                            <p className="text-[10px] opacity-30 mt-2 font-bold italic">MAX 10MB • PDF/IMG</p>
                          </div>
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            multiple
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files) {
                                Array.from(files).forEach(file => handleFileUpload(file, 'document'));
                              }
                            }}
                          />
                        </div>

                        <div className="md:col-span-2 space-y-3 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                          {formData.documents.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 border border-dashed border-white/5 rounded-[1.5rem]">
                              <UploadCloud size={32} strokeWidth={1} />
                              <p className="text-[10px] font-black uppercase mt-2">No documents staged</p>
                            </div>
                          ) : (
                            formData.documents.map((doc, idx) => (
                              <div key={idx} className="p-5 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group/item hover:bg-white/10 transition-colors animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-pink-500/5 flex items-center justify-center">
                                    <FileCheck className="text-pink-500" size={18} />
                                  </div>
                                  <div>
                                    <span className="text-xs font-black truncate max-w-[150px] md:max-w-xs block uppercase tracking-wider">{doc.name}</span>
                                    <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest mt-0.5">Verified Asset ID: {doc.url.split('/').pop()?.slice(0, 8)}...</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setFormData({ ...formData, documents: formData.documents.filter((_, i) => i !== idx) })}
                                  className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover/item:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Final Action */}
                    <div className="pt-10">
                      <button
                        onClick={handleStaffSubmit}
                        disabled={submitting}
                        className="w-full group relative overflow-hidden h-24 rounded-[3rem] bg-indigo-600 text-white isolation-auto transition-all duration-700 hover:shadow-[0_0_50px_-12px_rgba(79,70,229,0.5)] active:scale-[0.98] disabled:opacity-50"
                      >
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 w-0 group-hover:w-full transition-all duration-700"></div>
                        <div className="flex items-center justify-center gap-6 relative z-10">
                          {submitting ? (
                            <Loader2 className="w-8 h-8 animate-spin" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                              <ShieldCheck size={28} />
                            </div>
                          )}
                          <div className="text-left">
                            <span className="block text-[11px] font-black uppercase tracking-[0.4em] opacity-50 mb-0.5">Secure Initialization</span>
                            <span className="block text-2xl font-black uppercase tracking-widest">
                              {submitting ? 'PROCESSING PROTOCOL...' : 'DEPLOY STAFF PROFILE'}
                            </span>
                          </div>
                          {!submitting && <ArrowRightCircle size={28} className="ml-4 opacity-30 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />}
                        </div>
                        
                        {/* Background Decorative Flare */}
                        <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 group-hover:left-full transition-all duration-1000 ease-in-out"></div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Right Summary Column */}
          <div className="space-y-8">
            <div className={`p-10 rounded-[3rem] border sticky top-8 transition-all duration-500 ${darkMode ? 'bg-black/40 border-white/10 backdrop-blur-3xl shadow-2xl' : 'bg-white border-gray-100 shadow-xl shadow-blue-900/5'}`}>
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-black uppercase tracking-tight">Live Profile</h3>
                <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black tracking-widest uppercase">
                  STAGING
                </div>
              </div>

              <div className="space-y-8">
                {[
                  { 
                    label: 'Authentication ID', 
                    value: formData.firstName ? `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase() || 'stf'}@rehab.khanhub` : 'Awaiting Details', 
                    icon: Fingerprint,
                    color: 'text-indigo-500',
                    bg: 'bg-indigo-500/10'
                  },
                  { 
                    label: 'Security Clearance', 
                    value: 'Operational Staff - L1', 
                    icon: ShieldCheck,
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-500/10'
                  },
                  { 
                    label: 'Work Area', 
                    value: formData.department ? (DEPARTMENTS.find(d => d.id === formData.department)?.name) : 'Physical Therapy Unit', 
                    icon: Crosshair,
                    color: 'text-orange-500',
                    bg: 'bg-orange-500/10'
                  },
                  { 
                    label: 'Onboarding Date', 
                    value: formData.joiningDate || new Date().toLocaleDateString(), 
                    icon: Calendar,
                    color: 'text-pink-500',
                    bg: 'bg-pink-500/10'
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-6 group cursor-default">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 duration-500 ${item.bg} ${item.color}`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 leading-none mb-2">{item.label}</p>
                      <p className="text-sm font-black truncate max-w-[160px] tracking-wide uppercase">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-6 rounded-[2rem] bg-white/5 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">System Readiness</p>
                  <p className="text-[10px] font-black text-indigo-500 tracking-widest">94%</p>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[94%]" />
                </div>
              </div>
            </div>

            <div className={`p-10 rounded-[3rem] border group transition-all duration-500 cursor-pointer overflow-hidden relative ${darkMode ? 'bg-indigo-600/10 border-indigo-500/20' : 'bg-indigo-600 text-white shadow-xl shadow-blue-600/20'}`}>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight mb-3 italic">Protocol V2.0</h3>
                <p className={`text-xs font-bold leading-relaxed mb-8 ${darkMode ? 'text-indigo-400' : 'text-indigo-100'}`}>
                  Every deployment requires valid CNIC and verified joining date for biometric automation.
                </p>
                <button className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all ${
                  darkMode ? 'border-indigo-500/30 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'border-white/30 bg-white/20 text-white hover:bg-white hover:text-indigo-600'
                }`}>
                  INITIALIZATION DOCS
                </button>
              </div>
              <Activity className={`absolute -right-12 -bottom-12 w-48 h-48 transition-transform duration-1000 group-hover:scale-125 opacity-[0.05] ${darkMode ? 'text-indigo-500' : 'text-white'}`} />
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
                          {u.createdAt ? (() => {
                            try {
                              const date = u.createdAt.seconds ? new Date(u.createdAt.seconds * 1000) : new Date(u.createdAt);
                              return date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
                            } catch {
                              return 'Format Error';
                            }
                          })() : 'Pending'}
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