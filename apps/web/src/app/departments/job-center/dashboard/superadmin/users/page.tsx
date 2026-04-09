'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';
import { createRehabUserServer, deactivateRehabUser, resetRehabPassword } from '../../../actions/createJobCenterUser';
import EyePasswordInput from '@/components/rehab/EyePasswordInput';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RehabUser } from '@/types/rehab';

export default function SuperAdminUserManagement() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useRehabSession();
  const [admins, setAdmins] = useState<RehabUser[]>([]);
  const [cashier, setCashier] = useState<RehabUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states
  const [adminForm, setAdminForm] = useState({ name: '', id: 'REHAB-ADM-001', pass: '' });
  const [cashierForm, setCashierForm] = useState({ id: 'REHAB-CSH-001', pass: '' });

  const fetchData = async () => {
    try {
      const qAdmins = query(collection(db, 'rehab_users'), where('role', '==', 'admin'));
      const qCashier = query(collection(db, 'rehab_users'), where('role', '==', 'cashier'), where('isActive', '==', true));
      
      const [snapAdmins, snapCashier] = await Promise.all([getDocs(qAdmins), getDocs(qCashier)]);
      
      setAdmins(snapAdmins.docs.map(doc => ({ uid: doc.id, ...doc.data() } as RehabUser)));
      setCashier(snapCashier.docs.length > 0 ? ({ uid: snapCashier.docs[0].id, ...snapCashier.docs[0].data() } as RehabUser) : null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading) {
      if (!user || user.role !== 'superadmin') {
        router.push('/departments/rehab/login');
      } else {
        fetchData();
      }
    }
  }, [user, sessionLoading, router]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const res = await createRehabUserServer(adminForm.id, adminForm.pass, 'admin', adminForm.name);
    if (res.success) {
      setMessage({ type: 'success', text: `Admin ${adminForm.id} created!` });
      setAdminForm({ name: '', id: 'REHAB-ADM-001', pass: '' });
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
    const res = await createRehabUserServer(cashierForm.id, cashierForm.pass, 'cashier', 'Portal Cashier');
    if (res.success) {
      setMessage({ type: 'success', text: 'Cashier created successfully!' });
      setCashierForm({ id: 'REHAB-CSH-001', pass: '' });
      fetchData();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to create cashier' });
    }
    setActionLoading(false);
  };

  const handleDeactivate = async (uid: string) => {
    if (!confirm('Are you sure? This user will lose all access.')) return;
    setActionLoading(true);
    const res = await deactivateRehabUser(uid);
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
    const res = await resetRehabPassword(uid, newPass);
    if (res.success) setMessage({ type: 'success', text: 'Password reset successful' });
    setActionLoading(false);
  };

  if (sessionLoading || loading) return <div className="p-20 text-center animate-pulse font-black text-gray-300 tracking-widest uppercase">Initializing Interface...</div>;

  return (
    <div className="space-y-12 pb-20 max-w-6xl mx-auto">
      <div>
        <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-2">Authority Center</h1>
        <p className="text-gray-400 font-bold uppercase text-xs tracking-[0.3em]">Master User & Role Distribution</p>
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
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-sm">🛡️</div>
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Provision Admin</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Managers</p>
            </div>
          </div>
          <form onSubmit={handleCreateAdmin} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2 space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Full Name</label>
                 <input required className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-100 placeholder:text-gray-200" placeholder="e.g. Administrator Ahmad" value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Custom ID</label>
                 <input required className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-100" value={adminForm.id} onChange={e => setAdminForm({...adminForm, id: e.target.value})} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Access Secret</label>
                 <EyePasswordInput 
                   required 
                   className="bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-100 placeholder:text-gray-200" 
                   value={adminForm.pass} 
                   onChange={e => setAdminForm({...adminForm, pass: e.target.value})} 
                 />
               </div>
            </div>
            <button disabled={actionLoading} className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-blue-600/20 hover:scale-[1.02] transition-all disabled:opacity-50 uppercase tracking-widest text-sm">Create Admin Account</button>
          </form>
        </section>

        {/* SECTION B: Cashier Management */}
        <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
          <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
            <div className="w-12 h-12 bg-[#1D9E75]/10 text-[#1D9E75] rounded-2xl flex items-center justify-center text-xl shadow-sm">💰</div>
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Cashier Control</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Financial Operatives</p>
            </div>
          </div>
          
          {cashier ? (
            <div className="bg-[#1D9E75]/5 p-8 rounded-3xl border border-[#1D9E75]/10 flex flex-col gap-6">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="text-2xl font-black text-gray-900">{cashier.displayName}</p>
                    <p className="text-[10px] font-black text-[#1D9E75] uppercase tracking-widest mt-1">ID: {cashier.customId}</p>
                  </div>
                  <span className="bg-[#1D9E75] text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Active</span>
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
                   <input required className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-[#1D9E75]/10" value={cashierForm.id} onChange={e => setCashierForm({...cashierForm, id: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Initial Secret</label>
                   <EyePasswordInput 
                     required 
                     className="bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-[#1D9E75]/10" 
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
      <section className="bg-white rounded-[2rem] sm:rounded-[4rem] border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-6 sm:p-10 border-b border-gray-50">
           <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight uppercase">Administrative Roster</h2>
        </div>

        {/* Mobile View: Cards */}
        <div className="lg:hidden divide-y divide-gray-50">
          {admins.map((adm) => (
            <div key={adm.uid} className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black text-lg text-gray-900 uppercase leading-tight">{adm.displayName}</p>
                  <p className="text-[10px] font-black text-gray-400 tracking-widest mt-0.5">{adm.customId}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  adm.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {adm.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleResetPass(adm.uid)} className="flex-1 bg-gray-50 text-gray-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Reset</button>
                {adm.isActive && (
                  <button onClick={() => handleDeactivate(adm.uid)} className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Deactivate</button>
                )}
              </div>
            </div>
          ))}
          {admins.length === 0 && <p className="text-center py-10 text-gray-300 font-bold uppercase tracking-widest text-[10px]">No administrative staff found</p>}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden lg:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Identity</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">System ID</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admins.map((adm) => (
                <tr key={adm.uid} className="hover:bg-gray-50/50 transition-all group">
                  <td className="px-10 py-8">
                    <p className="font-black text-lg text-gray-900 group-hover:text-blue-600 transition-colors uppercase">{adm.displayName}</p>
                  </td>
                  <td className="px-10 py-8 font-black text-xs text-gray-400 tracking-widest">{adm.customId}</td>
                  <td className="px-10 py-8">
                    <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      adm.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {adm.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleResetPass(adm.uid)} className="px-5 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all">Reset</button>
                      {adm.isActive && (
                        <button onClick={() => handleDeactivate(adm.uid)} className="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Deactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
