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
  History
} from 'lucide-react';
import { createRehabUserServer, createStaffMemberServer } from '@/app/departments/rehab/actions/createRehabUser';

type TabType = 'admin' | 'staff' | 'family';

const DEPARTMENTS = [
  { id: 'rehab', name: 'Rehab Center', color: 'blue' },
  { id: 'spims', name: 'SPIMS Academy', color: 'purple' },
  { id: 'hospital', name: 'Khan Hospital', color: 'emerald' },
  { id: 'jobs', name: 'Job Center', color: 'orange' },
  { id: 'school', name: 'School Center', color: 'pink' },
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
    staffRole: 'Worker',
    phone: '',
    salary: '',
    gender: 'male',
    department: 'rehab',
    patientId: '',
  });

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

  useEffect(() => {
    if (!session || session.role !== 'manager') return;
    fetchUsers();
  }, [session]);

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
    if (!formData.customId || !formData.displayName || !formData.password || !formData.staffRole) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await createStaffMemberServer(
        formData.customId,
        formData.password,
        formData.displayName,
        formData.staffRole,
        formData.phone,
        Number(formData.salary) || 0,
        formData.gender,
        [], // duties
        '08:00', // start
        '17:00', // end
        '', // photo
        formData.department
      );

      if (res.success) {
        setMessage({ type: 'success', text: `Staff account ${formData.customId} created successfully.` });
        setFormData({ ...formData, customId: '', displayName: '', password: '', phone: '', salary: '' });
        fetchUsers();
      } else {
        throw new Error(res.error || 'Failed to create staff');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
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

                {/* Specific Fields: Staff */}
                {activeTab === 'staff' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 ml-1">Department</label>
                      <div className="relative group">
                        <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                        <select
                          value={formData.department}
                          onChange={e => setFormData({ ...formData, department: e.target.value })}
                          className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-bold transition-all outline-none appearance-none ${
                            darkMode ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                          }`}
                        >
                          {DEPARTMENTS.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 ml-1">Clinical/Staff Role</label>
                      <div className="relative group">
                        <Briefcase className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                        <input
                          type="text"
                          placeholder="e.g. Psychologist, Doctor, Admin"
                          value={formData.staffRole}
                          onChange={e => setFormData({ ...formData, staffRole: e.target.value })}
                          className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-bold transition-all outline-none ${
                            darkMode ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 ml-1">Contact Number</label>
                      <div className="relative group">
                        <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                        <input
                          type="text"
                          placeholder="03xx-xxxxxxx"
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-bold transition-all outline-none ${
                            darkMode ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 ml-1">Monthly Salary (PKR)</label>
                      <div className="relative group">
                        <DollarSign className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                        <input
                          type="number"
                          placeholder="Amount in PKR"
                          value={formData.salary}
                          onChange={e => setFormData({ ...formData, salary: e.target.value })}
                          className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-bold transition-all outline-none ${
                            darkMode ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Specific Fields: Family */}
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

              </div>

              <div className="mt-10 flex items-center justify-between gap-4">
                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 font-bold">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  All data encrypted end-to-end
                </div>
                <button
                  disabled={submitting}
                  onClick={activeTab === 'admin' ? handleAdminSubmit : activeTab === 'staff' ? handleStaffSubmit : handleFamilySubmit}
                  className={`px-10 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 disabled:opacity-50 ${
                    activeTab === 'admin' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 text-white' :
                    activeTab === 'staff' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 text-white' :
                    'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white'
                  }`}
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  {submitting ? 'Confirming...' : `Initialize ${activeTab}`}
                </button>
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