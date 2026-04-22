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
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-black dark:text-white" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300 py-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-black text-black dark:text-white flex items-center gap-4 uppercase tracking-tighter">
            <div className="p-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black shadow-xl">
              <User size={32} />
            </div>
            Command Profile
          </h1>
          <p className="text-black dark:text-black mt-4 text-[10px] font-black uppercase tracking-[0.2em] italic">Identity orchestration • Central security nodes</p>
        </div>

        {/* Feedback Message */}
        {message.text && (
          <div className={`mb-10 p-6 rounded-[2rem] flex items-center gap-4 border shadow-xl animate-in fade-in slide-in-from-top-4 duration-500 ${
            message.type === 'success' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border-gray-200 dark:border-white/20'
          }`}>
            <Info size={24} />
            <p className="font-black text-xs uppercase tracking-widest">{message.text}</p>
            <button onClick={() => setMessage({type:'', text:''})} className="ml-auto hover:scale-125 transition-transform">
              <X size={20} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Info & Session */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/10 p-10 rounded-[2.5rem] text-center shadow-xl relative overflow-hidden group">
              <div className="w-24 h-24 rounded-[2rem] bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-4xl font-black mx-auto mb-8 shadow-2xl transition-all duration-500 group-hover:scale-110">
                {userData?.name?.charAt(0)}
              </div>
              <h2 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">{userData?.name}</h2>
              <p className="text-black dark:text-black text-[9px] font-black uppercase tracking-[0.3em] mt-2 mb-8 italic">Master Authentication Node</p>
              
              <div className="space-y-5 text-left pt-8 border-t border-gray-50 dark:border-white/5">
                <div className="flex items-center gap-4 text-black">
                  <Shield size={18} className="text-black dark:text-white opacity-40" />
                  <span className="font-black text-[10px] uppercase tracking-widest">{userData?.customId}</span>
                </div>
                <div className="flex items-center gap-4 text-black">
                  <Mail size={18} className="text-black dark:text-white opacity-40" />
                  <span className="truncate text-[10px] font-bold uppercase tracking-widest">{userData?.email}</span>
                </div>
                <div className="flex items-center gap-4 text-black">
                  <Calendar size={18} className="text-black dark:text-white opacity-40" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Enrolled {userData?.createdAt ? formatDateDMY(userData.createdAt instanceof Timestamp ? userData.createdAt.toDate() : userData.createdAt) : 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/10 p-8 rounded-[2rem] shadow-sm">
              <h3 className="text-[10px] font-black text-black dark:text-black uppercase tracking-widest mb-6 flex items-center gap-3 italic">
                <Clock size={14} className="text-black dark:text-white" />
                Connectivity Status
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-black uppercase tracking-widest">Last Auth</span>
                  <span className="text-[10px] font-black text-black dark:text-white uppercase">
                    {session?.loginTime ? new Date(session.loginTime).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-black uppercase tracking-widest">Security Clearance</span>
                  <span className="text-[9px] font-black text-white dark:text-black uppercase tracking-[0.2em] bg-black dark:bg-white px-3 py-1 rounded-lg">
                    Level Alpha
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Settings */}
          <div className="lg:col-span-2 space-y-10">
            {/* Identity Modulation */}
            <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/10 p-10 rounded-[2.5rem] shadow-sm">
              <h3 className="text-xl font-black text-black dark:text-white mb-8 flex items-center gap-4 uppercase tracking-tight">
                <Edit2 size={24} className="text-black dark:text-white opacity-40" />
                Identity Modulation
              </h3>
              <div className="space-y-6">
                <label className="text-[10px] font-black text-black dark:text-black uppercase tracking-[0.2em] ml-1 block italic">Display Identity String</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input 
                    disabled={!editingName || actionLoading}
                    className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-8 py-5 font-black text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white/40 transition-all disabled:opacity-30 uppercase tracking-widest"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  {!editingName ? (
                    <button 
                      onClick={() => setEditingName(true)}
                      className="bg-black dark:bg-white text-white dark:text-black px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 shadow-xl active:scale-95"
                    >
                      Modify
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button 
                        disabled={actionLoading}
                        onClick={handleUpdateName}
                        className="flex-1 sm:flex-none bg-black dark:bg-white text-white dark:text-black px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
                      >
                        {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Commit
                      </button>
                      <button 
                        disabled={actionLoading}
                        onClick={() => { setEditingName(false); setNewName(userData.name); }}
                        className="flex-1 sm:flex-none px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-gray-100 dark:border-white/10 text-black hover:text-black dark:hover:text-white"
                      >
                        Abort
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/10 p-10 rounded-[2.5rem] shadow-sm">
              <h3 className="text-xl font-black text-black dark:text-white mb-8 flex items-center gap-4 uppercase tracking-tight">
                <Key size={24} className="text-black dark:text-white opacity-40" />
                Security Synchronization
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-black dark:text-black uppercase tracking-[0.2em] ml-1 block mb-4 italic">Active Authorization Key</label>
                  <EyePasswordInput 
                    required
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-8 py-5 font-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white/40 shadow-sm uppercase tracking-widest text-sm"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <label className="text-[10px] font-black text-black dark:text-black uppercase tracking-[0.2em] ml-1 block mb-4 italic">Target Key</label>
                    <EyePasswordInput 
                      required
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-8 py-5 font-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white/40 shadow-sm uppercase tracking-widest text-sm"
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-black dark:text-black uppercase tracking-[0.2em] ml-1 block mb-4 italic">Verify Target Key</label>
                    <EyePasswordInput 
                      required
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-8 py-5 font-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white/40 shadow-sm uppercase tracking-widest text-sm"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  disabled={actionLoading}
                  className="w-full h-16 bg-black dark:bg-white hover:scale-[1.01] disabled:opacity-30 text-white dark:text-black rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-95"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={24} /> : <ShieldCheck size={24} />}
                  <span>Rotate Security Keys</span>
                </button>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-10 rounded-[2.5rem] shadow-sm">
              <div className="flex items-center gap-5 mb-6 text-black dark:text-white">
                <AlertTriangle size={32} />
                <h3 className="text-xl font-black uppercase tracking-[0.2em]">Sovereign Terminal</h3>
              </div>
              <p className="text-black dark:text-black text-[10px] font-black uppercase tracking-widest mb-8 leading-relaxed italic border-l-2 border-black dark:border-white pl-4">
                TERMINATING THIS MASTER SESSION WILL REVOKE ALL ACCESS PRIVILEGES FROM THIS NODE IMMEDIATELY. ALL LOCAL CACHES WILL BE WIPED FOR SECURITY COMPLIANCE.
              </p>
              <button 
                onClick={handleSignOut}
                className="w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 hover:scale-105"
              >
                <LogOut size={20} />
                Terminate Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
