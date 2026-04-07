'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, updateDoc, doc, Timestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { createHqUserServer } from '@/app/hq/actions/createHqUser';
import EyePasswordInput from '@/components/spims/EyePasswordInput';
import Link from 'next/link';
import { 
  Loader2, Users, Plus, Search, Filter, Shield, 
  UserCheck, UserX, Trash2, Edit2, X, Check,
  MoreVertical, ShieldAlert, Briefcase, CreditCard, User as UserIcon, UserPlus
} from 'lucide-react';

type TabType = 'hq' | 'rehab' | 'spims';

export default function HqUserManagementPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [activeTab, setActiveTab] = useState<TabType>('hq');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Create HQ User Form State
  const [formData, setFormData] = useState({
    name: '',
    customId: '',
    role: 'manager' as 'manager' | 'cashier',
    password: '',
  });

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') {
      router.push('/hq/login');
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;

    setLoading(true);
    const collectionName = activeTab === 'hq' ? 'hq_users' : activeTab === 'rehab' ? 'rehab_users' : 'spims_users';
    
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));
      setUsers(userList);
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${activeTab} users:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab, session]);

  const toggleUserStatus = async (user: any) => {
    const collectionName = activeTab === 'hq' ? 'hq_users' : activeTab === 'rehab' ? 'rehab_users' : 'spims_users';
    try {
      await updateDoc(doc(db, collectionName, user.id), {
        isActive: !user.isActive
      });
    } catch (err) {
      console.error("Error toggling user status:", err);
      alert("Failed to update status");
    }
  };

  const handleCreateHqUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await createHqUserServer({
        ...formData,
        createdBy: session?.customId || 'superadmin'
      });

      if (res.success) {
        setMessage({ type: 'success', text: `HQ User ${formData.customId} created successfully!` });
        setShowCreateModal(false);
        setFormData({ name: '', customId: '', role: 'manager', password: '' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to create user' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    (user.name || user.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.customId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { color: string, icon: any }> = {
      superadmin: { color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: <ShieldAlert size={12} /> },
      admin: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: <Shield size={12} /> },
      manager: { color: 'bg-teal-500/10 text-teal-500 border-teal-500/20', icon: <Briefcase size={12} /> },
      cashier: { color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: <CreditCard size={12} /> },
      staff: { color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: <UserIcon size={12} /> },
      family: { color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', icon: <UserIcon size={12} /> },
    };

    const config = roles[role?.toLowerCase()] || roles.staff;
    return (
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${config.color}`}>
        {config.icon}
        {role}
      </span>
    );
  };

  if (sessionLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="animate-spin text-teal-500" /></div>;

  return (
    <div className="min-h-screen overflow-x-hidden w-full max-w-full bg-[#0f172a] text-slate-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                <Users className="text-teal-500" size={32} />
                User Management
              </h1>
              <Link 
                href="/hq/dashboard/manager/users/create"
                className="flex w-max items-center gap-2 px-5 py-3 rounded-2xl bg-teal-500 text-white 
                           text-[11px] font-black uppercase tracking-widest shadow-lg shadow-teal-500/20 
                           hover:bg-teal-600 active:scale-95 transition-all"
              >
                <UserPlus size={14} />
                Create User
              </Link>
            </div>
            <p className="text-slate-400 mt-2 font-medium text-sm">Control access across HQ, Rehab, and SPIMS</p>
          </div>
          {activeTab === 'hq' && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-teal-900/20"
            >
              <Plus size={18} />
              Create HQ User
            </button>
          )}
        </div>

        {/* Status Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border ${
            message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
          }`}>
            {message.type === 'success' ? <Check size={20} /> : <ShieldAlert size={20} />}
            <p className="font-bold text-sm">{message.text}</p>
            <button onClick={() => setMessage({type:'', text:''})} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tabs & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap p-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 w-full lg:w-fit">
            {(['hq', 'rehab', 'spims'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? 'bg-teal-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'hq' ? 'HQ Central' : tab === 'rehab' ? 'Rehab Center' : 'SPIMS College'}
              </button>
            ))}
          </div>

          <div className="relative group w-full lg:max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search by name or ID..."
              className="w-full bg-slate-800/50 border border-slate-700/50 focus:border-teal-500/50 rounded-2xl pl-12 pr-6 py-3 outline-none font-medium text-white transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Mobile Users List */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="px-6 py-16 text-center">
              <Loader2 className="animate-spin text-teal-500 mx-auto mb-3" size={28} />
              <p className="text-slate-500 font-bold text-sm">Synchronizing User Data...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-6 py-16 text-center opacity-40">
              <Users size={40} className="mx-auto mb-3" />
              <p className="font-bold">No users found in this system</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-teal-500 font-black border border-slate-700/50 shrink-0">
                    {(user.name || user.displayName || 'U').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{user.name || user.displayName}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email || 'No email provided'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <span className="font-mono text-xs font-bold bg-slate-900/80 px-2 py-2 rounded border border-slate-700/50 text-slate-400 truncate">
                    {user.customId}
                  </span>
                  <span className={`flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider rounded ${
                    user.isActive !== false ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-500 bg-slate-700/40'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${user.isActive !== false ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                    {user.isActive !== false ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  {getRoleBadge(user.role)}
                  <button
                    onClick={() => toggleUserStatus(user)}
                    className={`p-2 rounded-xl transition-all ${
                      user.isActive !== false
                        ? 'bg-rose-500/10 text-rose-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                    }`}
                    title={user.isActive !== false ? 'Disable User' : 'Enable User'}
                  >
                    {user.isActive !== false ? <UserX size={18} /> : <UserCheck size={18} />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Users Table */}
        <div className="hidden md:block bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto w-full scrollbar-none">
            <table className="min-w-[500px] w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-700/50">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hidden sm:table-cell">User Info</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] sm:hidden">User Info</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">System ID</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Role</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hidden md:table-cell">Joined</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-teal-500" size={32} />
                        <p className="text-slate-500 font-bold">Synchronizing User Data...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-30">
                        <Users size={48} />
                        <p className="text-lg font-bold">No users found in this system</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-700/30 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-teal-500 font-black border border-slate-700/50">
                            {(user.name || user.displayName || 'U').charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white leading-none mb-1">{user.name || user.displayName}</p>
                            <p className="text-xs text-slate-500">{user.email || 'No email provided'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-mono text-xs font-bold bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50 text-slate-400">
                          {user.customId}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${user.isActive !== false ? 'text-emerald-500' : 'text-slate-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${user.isActive !== false ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500'}`} />
                          {user.isActive !== false ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-5 hidden md:table-cell">
                        <p className="text-xs text-slate-500 font-bold">
                          {user.createdAt ? (user.createdAt instanceof Timestamp ? user.createdAt.toDate().toLocaleDateString() : new Date(user.createdAt).toLocaleDateString()) : 'N/A'}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleUserStatus(user)}
                            className={`p-2 rounded-xl transition-all ${
                              user.isActive !== false 
                                ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white' 
                                : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                            }`}
                            title={user.isActive !== false ? "Disable User" : "Enable User"}
                          >
                            {user.isActive !== false ? <UserX size={18} /> : <UserCheck size={18} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-xl font-black text-white">Create HQ Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateHqUser} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-2">Account Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['manager', 'cashier'] as const).map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormData({...formData, role})}
                        className={`py-3 rounded-2xl border font-black uppercase tracking-widest text-xs transition-all ${
                          formData.role === role 
                            ? 'bg-teal-600 border-teal-500 text-white shadow-lg' 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-2">Full Name</label>
                  <input 
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 font-bold text-white outline-none focus:ring-2 focus:ring-teal-500/50 transition-all placeholder:text-slate-600"
                    placeholder="e.g. Ahmad Khan"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-2">System ID</label>
                  <input 
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 font-mono font-bold text-teal-500 outline-none focus:ring-2 focus:ring-teal-500/50 transition-all placeholder:text-slate-600 uppercase"
                    placeholder="KHAN-MGR-XXX"
                    value={formData.customId}
                    onChange={e => setFormData({...formData, customId: e.target.value.toUpperCase()})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-2">Secure Password</label>
                  <EyePasswordInput
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 font-bold text-white outline-none focus:ring-2 focus:ring-teal-500/50 transition-all placeholder:text-slate-600"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <button
                disabled={actionLoading}
                className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-teal-900/20 transition-all flex items-center justify-center gap-3 mt-4"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <UserCheck size={20} />}
                Provision HQ Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
