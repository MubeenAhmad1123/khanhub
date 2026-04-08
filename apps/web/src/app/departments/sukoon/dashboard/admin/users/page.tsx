'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createRehabUserServer } from '@/app/departments/rehab/actions/createRehabUser';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY } from '@/lib/utils';
import { 
  Users, UserPlus, User, Heart, UserCog, 
  Shield, CreditCard, Eye, EyeOff, Loader2, 
  CheckCircle, XCircle, Search 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function UserManagementPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Data State
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'family' | 'staff' | 'all'>('family');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [customId, setCustomId] = useState('');
  const [password, setPassword] = useState('');
  const [patientId, setPatientId] = useState('');
  const [modalError, setModalError] = useState('');

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
        collection(db, 'rehab_users'),
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

  const handleCreateFamilyUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!fullName || !customId || !password || !patientId) {
      setModalError('All fields are required');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await createRehabUserServer(
        customId.toUpperCase(),
        password,
        'family',
        fullName,
        patientId
      );

      if (result.success) {
        toast.success('Family user created ✓');
        setIsModalOpen(false);
        // Reset form
        setFullName('');
        setCustomId('');
        setPassword('');
        setPatientId('');
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
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

  const familyCount = users.filter(u => u.role === 'family').length;
  const staffCount = users.filter(u => u.role === 'staff').length;
  const adminCount = users.filter(u => u.role === 'admin' || u.role === 'superadmin').length;

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'family': return <span className="flex items-center gap-1 bg-green-50 text-green-700 font-medium px-2.5 py-1 rounded text-xs tracking-wider uppercase border border-green-200"><Heart className="w-3 h-3"/> Family</span>;
      case 'staff': return <span className="flex items-center gap-1 bg-teal-50 text-teal-700 font-medium px-2.5 py-1 rounded text-xs tracking-wider uppercase border border-teal-200"><UserCog className="w-3 h-3"/> Staff</span>;
      case 'admin': return <span className="flex items-center gap-1 bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded text-xs tracking-wider uppercase border border-blue-200"><Shield className="w-3 h-3"/> Admin</span>;
      case 'cashier': return <span className="flex items-center gap-1 bg-amber-50 text-amber-700 font-medium px-2.5 py-1 rounded text-xs tracking-wider uppercase border border-amber-200"><CreditCard className="w-3 h-3"/> Cashier</span>;
      case 'superadmin': return <span className="flex items-center gap-1 bg-purple-50 text-purple-700 font-medium px-2.5 py-1 rounded text-xs tracking-wider uppercase border border-purple-200"><Shield className="w-3 h-3"/> Super Admin</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded text-xs uppercase">{role}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-teal-600" />
              User Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage portal access for families and staff</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Create Family User
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0 font-black tracking-tighter shadow-sm"><Heart className="w-5 h-5"/></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Family</div><div className="text-xl font-black text-gray-900">{familyCount}</div></div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 font-black tracking-tighter shadow-sm"><UserCog className="w-5 h-5"/></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Staff</div><div className="text-xl font-black text-gray-900">{staffCount}</div></div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 sm:col-span-2 lg:col-span-1">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-black tracking-tighter shadow-sm"><Shield className="w-5 h-5"/></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Admins</div><div className="text-xl font-black text-gray-900">{adminCount}</div></div>
          </div>
        </div>

        {/* Filter / Search */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab('family')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'family' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >Family</button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'staff' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >Staff</button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'all' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >All Users</button>
          </div>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* User List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No users found matching the criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map(user => (
                <div key={user.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4 font-black tracking-tight">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-black text-lg flex-shrink-0 border border-teal-100 shadow-sm">
                      {(user.displayName || user.customId || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-gray-900 text-sm sm:text-base flex flex-wrap items-center gap-2 truncate uppercase">
                        {user.displayName}
                        {user.isActive ? (
                          <span className="flex items-center gap-1 text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] uppercase font-black tracking-widest border border-green-100 shadow-sm animate-pulse-slow">
                            <CheckCircle className="w-3 h-3"/> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] uppercase font-black tracking-widest border border-red-100 shadow-sm">
                            <XCircle className="w-3 h-3"/> Inactive
                          </span>
                        )}
                      </h4>
                      <div className="text-[10px] sm:text-xs font-black text-gray-400 mt-0.5 sm:mt-1 uppercase tracking-widest truncate">{user.customId}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4 min-w-[150px] border-t sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0">
                    <div className="font-black">
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest whitespace-nowrap">
                      {formatDateDMY(user.createdAt?.toDate?.() ? user.createdAt.toDate() : user.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create Family User */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-teal-600" />
                  Create Family User
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-lg transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateFamilyUser} className="p-6 space-y-4">
                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 focus:bg-white"
                    placeholder="e.g. Ali Khan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom ID (Login ID) *</label>
                  <input
                    type="text"
                    value={customId}
                    onChange={e => setCustomId(e.target.value.toUpperCase())}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 focus:bg-white font-mono uppercase"
                    placeholder="e.g. REHAB-FAM-001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 focus:bg-white"
                      placeholder="Min 6 characters"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID *</label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={e => setPatientId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 focus:bg-white font-mono"
                    placeholder="Paste from Patients list"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Find the patient doc ID from the Patients page</p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Create User
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

// Added this strictly for error usage above
import { AlertCircle } from 'lucide-react';
