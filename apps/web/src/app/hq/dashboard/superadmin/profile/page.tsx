'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { 
  reauthenticateWithCredential, 
  EmailAuthProvider, 
  updatePassword,
  signOut 
} from 'firebase/auth';
import { useHqSession } from '@/hooks/hq/useHqSession';
import EyePasswordInput from '@/components/spims/EyePasswordInput';
import { formatDateDMY } from '@/lib/utils';
import { 
  Loader2, User, Shield, Mail, Calendar, 
  CheckCircle, Edit2, Key, LogOut, AlertTriangle,
  Clock, ShieldCheck, Save, X, Info
} from 'lucide-react';

export default function HqProfilePage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Password State
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') {
      router.push('/hq/login');
      return;
    }

    const fetchUserData = async () => {
      try {
        const docRef = doc(db, 'hq_users', session.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setNewName(data.name);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [session, sessionLoading, router]);

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === userData.name) {
      setEditingName(false);
      return;
    }

    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'hq_users', session!.uid), {
        name: newName
      });
      setUserData({ ...userData, name: newName });
      
      // Update local session
      const hqSession = JSON.parse(localStorage.getItem('hq_session') || '{}');
      hqSession.name = newName;
      localStorage.setItem('hq_session', JSON.stringify(hqSession));
      
      setMessage({ type: 'success', text: 'Display name updated successfully' });
      setEditingName(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setActionLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('User not authenticated');

      const credential = EmailAuthProvider.credential(user.email, passwordForm.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordForm.new);

      setMessage({ type: 'success', text: 'Password changed successfully' });
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('hq_session');
      router.push('/hq/login');
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FCFBF8] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-gray-900 transition-colors duration-500 py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl font-black text-gray-900 flex items-center gap-6 uppercase tracking-tighter leading-none">
            <div className="p-5 rounded-[2rem] bg-white text-indigo-600 shadow-2xl shadow-gray-200/50 border border-gray-100">
              <User size={40} strokeWidth={2.5} />
            </div>
            Command Profile
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 mt-6 italic ml-2">Identity orchestration • Central security nodes</p>
        </div>

        {message.text && (
          <div className={`mb-12 p-8 rounded-[2.5rem] flex items-center gap-6 border shadow-2xl shadow-gray-200/50 animate-in fade-in slide-in-from-top-6 duration-700 ${
            message.type === 'success' ? 'bg-white text-indigo-600 border-indigo-100' : 'bg-white text-rose-600 border-rose-100'
          }`}>
            <div className={cn("p-4 rounded-2xl", message.type === 'success' ? 'bg-indigo-50' : 'bg-rose-50')}>
              <Info size={28} />
            </div>
            <p className="font-black text-xs uppercase tracking-widest leading-relaxed">{message.text}</p>
            <button onClick={() => setMessage({type:'', text:''})} className="ml-auto hover:scale-125 transition-transform">
              <X size={20} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Info & Session */}
          <div className="lg:col-span-1 space-y-10">
            <div className="bg-white border border-gray-100 p-12 rounded-[3rem] text-center shadow-2xl shadow-gray-200/50 relative overflow-hidden group">
              <div className="w-28 h-28 rounded-[2.5rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-5xl font-black mx-auto mb-10 shadow-inner transition-all duration-700 group-hover:scale-110 group-hover:rotate-6">
                {userData?.name?.charAt(0)}
              </div>
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight leading-none">{userData?.name}</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mt-4 mb-10 italic">Master Authentication Node</p>
              
              <div className="space-y-6 text-left pt-10 border-t border-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                    <Shield size={18} strokeWidth={2.5} />
                  </div>
                  <span className="font-black text-[10px] uppercase tracking-widest text-gray-900">{userData?.customId}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                    <Mail size={18} strokeWidth={2.5} />
                  </div>
                  <span className="truncate text-[10px] font-bold uppercase tracking-widest text-gray-900">{userData?.email}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                    <Calendar size={18} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-900 leading-tight">Enrolled {userData?.createdAt ? formatDateDMY(userData.createdAt instanceof Timestamp ? userData.createdAt.toDate() : userData.createdAt) : 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-10 rounded-[2.5rem] shadow-2xl shadow-gray-200/50">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-4 italic">
                <Clock size={16} className="text-indigo-600" />
                Connectivity Status
              </h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Auth</span>
                  <span className="text-[10px] font-black text-gray-900 uppercase">
                    {session?.loginTime ? new Date(session.loginTime).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Security Clearance</span>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                    Level Alpha
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Settings */}
          <div className="lg:col-span-2 space-y-10">
            {/* Identity Modulation */}
            <div className="bg-white border border-gray-100 p-12 rounded-[3rem] shadow-2xl shadow-gray-200/50">
              <h3 className="text-2xl font-black text-gray-900 mb-10 flex items-center gap-5 uppercase tracking-tighter">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                  <Edit2 size={24} strokeWidth={2.5} />
                </div>
                Identity Modulation
              </h3>
              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block mb-4 italic">Display Identity String</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                      disabled={!editingName || actionLoading}
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 font-black text-sm text-gray-900 outline-none focus:border-indigo-600 transition-all disabled:opacity-30 uppercase tracking-widest placeholder:text-gray-300 shadow-inner"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    {!editingName ? (
                      <button 
                        onClick={() => setEditingName(true)}
                        className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 shadow-xl shadow-indigo-600/30 active:scale-95"
                      >
                        Modify
                      </button>
                    ) : (
                      <div className="flex gap-3">
                        <button 
                          disabled={actionLoading}
                          onClick={handleUpdateName}
                          className="flex-1 sm:flex-none bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 active:scale-95"
                        >
                          {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                          Commit
                        </button>
                        <button 
                          disabled={actionLoading}
                          onClick={() => { setEditingName(false); setNewName(userData.name); }}
                          className="flex-1 sm:flex-none px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-gray-100 text-gray-400 hover:text-gray-900 hover:bg-gray-50"
                        >
                          Abort
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="bg-white border border-gray-100 p-12 rounded-[3rem] shadow-2xl shadow-gray-200/50">
              <h3 className="text-2xl font-black text-gray-900 mb-10 flex items-center gap-5 uppercase tracking-tighter">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                  <Key size={24} strokeWidth={2.5} />
                </div>
                Security Synchronization
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-10">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block mb-4 italic">Active Authorization Key</label>
                  <EyePasswordInput 
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 font-black text-gray-900 outline-none focus:border-indigo-600 shadow-inner uppercase tracking-widest text-sm"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block mb-4 italic">Target Key</label>
                    <EyePasswordInput 
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 font-black text-gray-900 outline-none focus:border-indigo-600 shadow-inner uppercase tracking-widest text-sm"
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 block mb-4 italic">Verify Target Key</label>
                    <EyePasswordInput 
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 font-black text-gray-900 outline-none focus:border-indigo-600 shadow-inner uppercase tracking-widest text-sm"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  disabled={actionLoading}
                  className="w-full h-20 bg-gray-900 hover:bg-black disabled:opacity-30 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl transition-all flex items-center justify-center gap-6 active:scale-95"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={28} /> : <ShieldCheck size={28} strokeWidth={2.5} />}
                  <span>Rotate Security Keys</span>
                </button>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-rose-50 border border-rose-100 p-12 rounded-[3rem] shadow-2xl shadow-rose-200/20">
              <div className="flex items-center gap-6 mb-8 text-rose-600">
                <AlertTriangle size={40} strokeWidth={2.5} />
                <h3 className="text-2xl font-black uppercase tracking-[0.2em]">Sovereign Terminal</h3>
              </div>
              <p className="text-rose-900/60 text-[10px] font-black uppercase tracking-[0.3em] mb-10 leading-relaxed italic border-l-2 border-rose-200 pl-6">
                TERMINATING THIS MASTER SESSION WILL REVOKE ALL ACCESS PRIVILEGES FROM THIS NODE IMMEDIATELY. ALL LOCAL CACHES WILL BE WIPED FOR SECURITY COMPLIANCE.
              </p>
              <button 
                onClick={handleSignOut}
                className="w-full sm:w-auto bg-rose-600 text-white px-14 py-6 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 shadow-xl shadow-rose-600/30 active:scale-95 hover:scale-105"
              >
                <LogOut size={22} />
                Terminate Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
