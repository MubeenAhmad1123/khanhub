'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createItUserServer } from '@/app/departments/it/actions/createItUser';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY } from '@/lib/utils';
import { 
  Users, UserPlus, User, GraduationCap, UserCog, 
  Shield, CreditCard, Eye, EyeOff, Loader2, 
  CheckCircle, XCircle, Search, AlertCircle 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ITUserManagementPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Data State
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'student' | 'staff' | 'all'>('student');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [customId, setCustomId] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    const sessionData = localStorage.getItem('it_session');
    if (!sessionData) {
      router.push('/departments/it/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/it/login');
      return;
    }
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    fetchUsers();
  }, [session]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'it_users'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    } catch (error) {
      console.error("Fetch users error:", error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudentUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!fullName || !customId || !password || !studentId) {
      setModalError('All fields are required');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await createItUserServer(
        customId.toUpperCase(),
        password,
        'student',
        fullName,
        studentId
      );

      if (result.success) {
        toast.success('Student user created ✓');
        setIsModalOpen(false);
        // Reset form
        setFullName('');
        setCustomId('');
        setPassword('');
        setStudentId('');
        // Refresh list
        fetchUsers();
      } else {
        setModalError(result.error || 'Failed to create user');
      }
    } catch (error: any) {
      console.error("Create error", error);
      setModalError(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Filter users by tab and search
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.customId || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = 
      activeTab === 'all' ? true : u.role === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const studentCount = users.filter(u => u.role === 'student').length;
  const staffCount = users.filter(u => u.role === 'staff').length;
  const adminCount = users.filter(u => u.role === 'admin' || u.role === 'superadmin').length;

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'student': return <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 font-medium px-2.5 py-1 rounded text-xs tracking-wider uppercase border border-indigo-200"><GraduationCap className="w-3 h-3"/> Student</span>;
      case 'staff': return <span className="flex items-center gap-1 bg-orange-50 text-orange-700 font-medium px-2.5 py-1 rounded text-xs tracking-wider uppercase border border-orange-200"><UserCog className="w-3 h-3"/> Staff</span>;
      case 'admin': return <span className="flex items-center gap-1 bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded text-xs tracking-wider uppercase border border-blue-200"><Shield className="w-3 h-3"/> Admin</span>;
      case 'cashier': return <span className="flex items-center gap-1 bg-amber-50 text-amber-700 font-medium px-2.5 py-1 rounded text-xs tracking-wider uppercase border border-amber-200"><CreditCard className="w-3 h-3"/> Cashier</span>;
      case 'superadmin': return <span className="flex items-center gap-1 bg-purple-50 text-purple-700 font-medium px-2.5 py-1 rounded text-xs tracking-wider uppercase border border-purple-200"><Shield className="w-3 h-3"/> Super Admin</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded text-xs uppercase">{role}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
              <Users className="w-6 h-6 text-indigo-600" />
              IT User Management
            </h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Manage portal access for students and staff</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-black text-white px-8 py-4 rounded-[2rem] font-black text-sm shadow-2xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            Create Student User
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-black/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0"><GraduationCap className="w-6 h-6"/></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Students</div><div className="text-2xl font-black text-black">{studentCount}</div></div>
          </div>
          <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-black/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0"><UserCog className="w-6 h-6"/></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Staff</div><div className="text-2xl font-black text-black">{staffCount}</div></div>
          </div>
          <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-black/5 flex items-center gap-4 sm:col-span-2 lg:col-span-1">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><Shield className="w-6 h-6"/></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Admins</div><div className="text-2xl font-black text-black">{adminCount}</div></div>
          </div>
        </div>

        {/* Filter / Search */}
        <div className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-black/5 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-gray-50 p-1 rounded-2xl w-full md:w-auto">
            <button
              onClick={() => setActiveTab('student')}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'student' ? 'bg-black text-white shadow-xl' : 'text-gray-400 hover:text-black'}`}
            >Student</button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-black text-white shadow-xl' : 'text-gray-400 hover:text-black'}`}
            >Staff</button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-black text-white shadow-xl' : 'text-gray-400 hover:text-black'}`}
            >All</button>
          </div>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-6 py-4 bg-gray-50 border border-black/5 rounded-[2rem] text-sm font-bold outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* User List */}
        <div className="bg-white rounded-[3rem] shadow-sm border border-black/5 overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-20 text-center border-none">
              <Users className="w-16 h-16 text-gray-100 mx-auto mb-6" />
              <h3 className="text-xl font-black text-black">No users found</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {filteredUsers.map(user => (
                <div key={user.id} className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl flex-shrink-0 border border-indigo-100 shadow-sm">
                      {(user.displayName || user.customId || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-black text-base sm:text-lg flex flex-wrap items-center gap-3 truncate uppercase leading-tight">
                        {user.displayName}
                        {user.isActive ? (
                          <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-lg text-[8px] uppercase font-black tracking-widest border border-green-100">
                            <CheckCircle className="w-3 h-3"/> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-1 rounded-lg text-[8px] uppercase font-black tracking-widest border border-red-100">
                            <XCircle className="w-3 h-3"/> Inactive
                          </span>
                        )}
                      </h4>
                      <div className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-widest truncate">{user.customId}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-6 sm:pt-0">
                    <div>
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest whitespace-nowrap">
                      {formatDateDMY(user.createdAt?.toDate?.() ? user.createdAt.toDate() : user.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create Student User */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-black/10">
              <div className="p-8 border-b border-black/5 flex items-center justify-between bg-gray-50/50">
                <h2 className="text-xl font-black text-black flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-indigo-600" />
                  New Student User
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="bg-white text-gray-400 hover:text-black p-2 rounded-2xl border border-black/5 transition-all shadow-sm">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateStudentUser} className="p-8 space-y-6">
                {modalError && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all"
                    placeholder="Ali Khan"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Login ID *</label>
                  <input
                    type="text"
                    value={customId}
                    onChange={e => setCustomId(e.target.value.toUpperCase())}
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all font-mono uppercase"
                    placeholder="IT-STD-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all"
                      placeholder="Min 6 characters"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Student Doc ID *</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all font-mono"
                    placeholder="Get from Intern Registry"
                    required
                  />
                </div>

                <div className="pt-6 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black hover:bg-gray-50 rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-indigo-600 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
