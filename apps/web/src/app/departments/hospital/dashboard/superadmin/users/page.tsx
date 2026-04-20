'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHospitalSession } from '@/hooks/hospital/useHospitalSession';
import { createHospitalUserServer, deactivateHospitalUser, resetHospitalPassword } from '../../../actions/createHospitalUser';
import EyePasswordInput from '@/components/hospital/EyePasswordInput';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { HospitalUser } from '@/types/hospital';

export default function SuperAdminUserManagement() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useHospitalSession();
  const [admins, setAdmins] = useState<HospitalUser[]>([]);
  const [cashier, setCashier] = useState<HospitalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states
  const [adminForm, setAdminForm] = useState({ name: '', id: 'HOS-ADM-001', pass: '' });
  const [cashierForm, setCashierForm] = useState({ id: 'HOS-CSH-001', pass: '' });

  const fetchData = async () => {
    try {
      const qAdmins = query(collection(db, 'hospital_users'), where('role', '==', 'admin'));
      const qCashier = query(collection(db, 'hospital_users'), where('role', '==', 'cashier'), where('isActive', '==', true));
      
      const [snapAdmins, snapCashier] = await Promise.all([getDocs(qAdmins), getDocs(qCashier)]);
      
      setAdmins(snapAdmins.docs.map(doc => ({ uid: doc.id, ...doc.data() } as HospitalUser)));
      setCashier(snapCashier.docs.length > 0 ? ({ uid: snapCashier.docs[0].id, ...snapCashier.docs[0].data() } as HospitalUser) : null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading) {
      if (!user || user.role !== 'superadmin') {
        router.push('/departments/hospital/login');
      } else {
        fetchData();
      }
    }
  }, [user, sessionLoading, router]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const res = await createHospitalUserServer(adminForm.id, adminForm.pass, 'admin', adminForm.name);
    if (res.success) {
      setMessage({ type: 'success', text: `Admin ${adminForm.id} created!` });
      setAdminForm({ name: '', id: 'HOS-ADM-001', pass: '' });
      fetchData();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to create admin' });
    }
    setActionLoading(false);
  };

  const handleCreateCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cashier) return;
    setActionLoading(true);
    const res = await createHospitalUserServer(cashierForm.id, cashierForm.pass, 'cashier', 'Portal Cashier');
    if (res.success) {
      setMessage({ type: 'success', text: 'Cashier created successfully!' });
      setCashierForm({ id: 'HOS-CSH-001', pass: '' });
      fetchData();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to create cashier' });
    }
    setActionLoading(false);
  };

  const handleDeactivate = async (uid: string) => {
    if (!confirm('Are you sure? This user will lose all access.')) return;
    setActionLoading(true);
    const res = await deactivateHospitalUser(uid);
    if (res.success) {
      setMessage({ type: 'success', text: 'User deactivated successfully' });
      fetchData();
    }
    setActionLoading(false);
  };

  const handleResetPass = async (uid: string) => {
    const newPass = prompt('Enter new password (min 6 chars):');
    if (!newPass || newPass.length < 6) return;
    setActionLoading(true);
    const res = await resetHospitalPassword(uid, newPass);
    if (res.success) setMessage({ type: 'success', text: 'Password reset successful' });
    setActionLoading(false);
  };

  if (sessionLoading || loading) return <div className="p-20 text-center animate-pulse font-black text-gray-300 tracking-widest uppercase">Initializing Interface...</div>;

  return (
    <div className="space-y-12 pb-20 max-w-6xl mx-auto">
      <div>
        <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-2">Authority Center</h1>
        <p className="text-gray-400 font-bold uppercase text-xs tracking-[0.3em]">Hospital Master User & Role Distribution</p>
      </div>

      {message.text && (
        <div className={`p-6 rounded-[2rem] border font-bold flex items-center gap-4 animate-in fade-in slide-in-from-top-4 ${
          message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
        }`}>
          <span className="w-8 h-8 rounded-xl bg-white/50 flex items-center justify-center text-sm">{message.type === 'success' ? '✓' : '!'}</span>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* SECTION A: Admin Creation */}
        <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
          <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl shadow-sm">🛡️</div>
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Provision Admin</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Managers</p>
            </div>
          </div>
          <form onSubmit={handleCreateAdmin} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2 space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Full Name</label>
                 <input required className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-emerald-100 placeholder:text-gray-200" placeholder="e.g. Administrator Ahmad" value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Custom ID</label>
                 <input required className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-emerald-100" value={adminForm.id} onChange={e => setAdminForm({...adminForm, id: e.target.value})} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Access Secret</label>
                 <EyePasswordInput 
                   required 
                   className="bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-emerald-100 placeholder:text-gray-200" 
                   value={adminForm.pass} 
                   onChange={e => setAdminForm({...adminForm, pass: e.target.value})} 
                 />
               </div>
            </div>
            <button disabled={actionLoading} className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-emerald-600/20 hover:scale-[1.02] transition-all disabled:opacity-50 uppercase tracking-widest text-sm">Create Admin Account</button>
          </form>
        </section>

        {/* SECTION B: Cashier Management */}
        <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
          <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-xl shadow-sm">💰</div>
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Cashier Control</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Financial Operatives</p>
            </div>
          </div>
          
          {cashier ? (
            <div className="bg-orange-50/5 p-8 rounded-3xl border border-orange-200 flex flex-col gap-6">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="text-2xl font-black text-gray-900">{cashier.displayName}</p>
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1">ID: {cashier.customId}</p>
                  </div>
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Active</span>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => handleResetPass(cashier.uid)} className="flex-1 bg-white border border-gray-100 text-gray-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all">Password</button>
                  <button onClick={() => handleDeactivate(cashier.uid)} className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Deactivate</button>
               </div>
            </div>
          ) : (
            <form onSubmit={handleCreateCashier} className="space-y-6 animate-in slide-in-from-right-4">
               <div className="space-y-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Cashier ID</label>
                   <input required className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-orange-100" value={cashierForm.id} onChange={e => setCashierForm({...cashierForm, id: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Initial Secret</label>
                   <EyePasswordInput 
                     required 
                     className="bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-orange-100" 
                     value={cashierForm.pass} 
                     onChange={e => setCashierForm({...cashierForm, pass: e.target.value})} 
                   />
                 </div>
               </div>
               <button disabled={actionLoading} className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 uppercase tracking-widest text-sm">Create Cashier Account</button>
            </form>
          )}
        </section>
      </div>

      {/* SECTION C: Admin Roster */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Administrative Roster</h2>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-1">Manage system administrators and their security status</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-2xl border border-gray-100 dark:border-white/5">
             <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{admins.length} Total Admins</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {admins.map((adm) => (
            <div key={adm.uid} className="group relative bg-white dark:bg-black border border-gray-100 dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              {/* Background Accent */}
              <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${adm.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
              
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${
                    adm.isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-red-50 dark:bg-red-500/10 text-red-600'
                  }`}>
                    {adm.displayName?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    adm.isActive 
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-100 dark:border-emerald-500/20' 
                      : 'bg-red-50 dark:bg-red-500/10 text-red-600 border-red-100 dark:border-red-500/20'
                  }`}>
                    {adm.isActive ? '• Active' : '• Inactive'}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-600 transition-colors truncate">
                    {adm.displayName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">System ID:</span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md">{adm.customId}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50 dark:border-white/5 flex gap-3">
                  <button 
                    onClick={() => handleResetPass(adm.uid)}
                    className="flex-1 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Reset Secret
                  </button>
                  {adm.isActive && (
                    <button 
                      onClick={() => handleDeactivate(adm.uid)}
                      className="flex-1 bg-red-50 dark:bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm hover:shadow-lg hover:shadow-red-500/20"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {admins.length === 0 && (
            <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-white/5 rounded-[3rem] border border-dashed border-gray-200 dark:border-white/10">
              <p className="text-gray-300 dark:text-gray-600 font-black uppercase tracking-widest">No Administrative Accounts Discovered</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
