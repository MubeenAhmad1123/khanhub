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

  if (sessionLoading || loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="animate-spin text-teal-500" /></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <User className="text-teal-500" size={32} />
            My Profile
          </h1>
          <p className="text-slate-400 mt-1 font-medium text-sm">Manage your master account settings and security</p>
        </div>

        {/* Feedback Message */}
        {message.text && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 border ${
            message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
          }`}>
            <Info size={20} />
            <p className="font-bold text-sm">{message.text}</p>
            <button onClick={() => setMessage({type:'', text:''})} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Info & Session */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl text-center backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-emerald-600" />
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-4xl font-black mx-auto mb-6 shadow-xl shadow-teal-900/20 group-hover:scale-105 transition-transform">
                {userData?.name?.charAt(0)}
              </div>
              <h2 className="text-xl font-black text-white">{userData?.name}</h2>
              <p className="text-teal-500 text-xs font-black uppercase tracking-[0.2em] mt-1 mb-6">Master Account</p>
              
              <div className="space-y-4 text-left">
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                  <Shield size={16} className="text-teal-500/50" />
                  <span className="font-mono text-xs font-bold">{userData?.customId}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                  <Mail size={16} className="text-teal-500/50" />
                  <span className="truncate">{userData?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                  <Calendar size={16} className="text-teal-500/50" />
                  <span>Joined {userData?.createdAt ? (userData.createdAt instanceof Timestamp ? userData.createdAt.toDate().toLocaleDateString() : new Date(userData.createdAt).toLocaleDateString()) : 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl backdrop-blur-sm">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock size={12} className="text-teal-500" />
                Session Info
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">Last Login</span>
                  <span className="text-xs font-black text-slate-300">
                    {session?.loginTime ? new Date(session.loginTime).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">Security Level</span>
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Level 3
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Settings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Display Name Section */}
            <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl backdrop-blur-sm">
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                <Edit2 size={20} className="text-teal-500" />
                Account Identity
              </h3>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Display Name</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input 
                    disabled={!editingName || actionLoading}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 font-bold text-white outline-none focus:ring-2 focus:ring-teal-500/50 transition-all disabled:opacity-50"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  {!editingName ? (
                    <button 
                      onClick={() => setEditingName(true)}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        disabled={actionLoading}
                        onClick={handleUpdateName}
                        className="flex-1 sm:flex-none bg-teal-600 hover:bg-teal-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                      >
                        {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Save
                      </button>
                      <button 
                        disabled={actionLoading}
                        onClick={() => { setEditingName(false); setNewName(userData.name); }}
                        className="flex-1 sm:flex-none bg-slate-700 hover:bg-slate-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl backdrop-blur-sm">
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                <Key size={20} className="text-teal-500" />
                Security Update
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-2">Current Password</label>
                  <EyePasswordInput 
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 font-bold text-white outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-2">New Password</label>
                    <EyePasswordInput 
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 font-bold text-white outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-2">Confirm New Password</label>
                    <EyePasswordInput 
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 font-bold text-white outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  disabled={actionLoading}
                  className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-teal-900/20 transition-all flex items-center justify-center gap-3"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                  Update Security Credentials
                </button>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-rose-500/5 border border-rose-500/20 p-8 rounded-3xl backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-6 text-rose-500">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-black uppercase tracking-widest">Account Terminal</h3>
              </div>
              <p className="text-slate-400 text-sm font-medium mb-6">
                Terminating your session will revoke access from this device immediately. 
                All cached data will be cleared.
              </p>
              <button 
                onClick={handleSignOut}
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-rose-900/20"
              >
                <LogOut size={18} />
                Terminate Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
