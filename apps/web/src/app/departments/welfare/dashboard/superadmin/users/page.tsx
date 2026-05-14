'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWelfareSession } from '@/hooks/welfare/useWelfareSession';
import { createWelfareUserServer, deactivateWelfareUser, resetWelfarePassword } from '../../../actions/createWelfareUser';
import EyePasswordInput from '@/components/welfare/EyePasswordInput';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WelfareUser } from '@/types/welfare';
import { Shield, Wallet, UserX, KeyRound, Plus, Loader2 } from 'lucide-react';

export default function SuperAdminUserManagement() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useWelfareSession();
  const [admins, setAdmins] = useState<WelfareUser[]>([]);
  const [cashier, setCashier] = useState<WelfareUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states
  const [adminForm, setAdminForm] = useState({ name: '', id: 'WELFARE-ADM-001', pass: '' });
  const [cashierForm, setCashierForm] = useState({ id: 'WELFARE-CSH-001', pass: '' });

  const fetchData = async () => {
    try {
      const qAdmins = query(collection(db, 'welfare_users'), where('role', '==', 'admin'));
      const qCashier = query(collection(db, 'welfare_users'), where('role', '==', 'cashier'), where('isActive', '==', true));
      
      const [snapAdmins, snapCashier] = await Promise.all([getDocs(qAdmins), getDocs(qCashier)]);
      
      setAdmins(snapAdmins.docs.map(doc => ({ uid: doc.id, ...doc.data() } as WelfareUser)));
      setCashier(snapCashier.docs.length > 0 ? ({ uid: snapCashier.docs[0].id, ...snapCashier.docs[0].data() } as WelfareUser) : null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading) {
      if (!user || user.role !== 'superadmin') {
        router.push('/departments/welfare/login');
      } else {
        fetchData();
      }
    }
  }, [user, sessionLoading, router]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const res = await createWelfareUserServer(adminForm.id, adminForm.pass, 'admin', adminForm.name);
    if (res.success) {
      setMessage({ type: 'success', text: `Admin ${adminForm.id} created successfully!` });
      setAdminForm({ name: '', id: 'WELFARE-ADM-001', pass: '' });
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
    const res = await createWelfareUserServer(cashierForm.id, cashierForm.pass, 'cashier', 'Portal Cashier');
    if (res.success) {
      setMessage({ type: 'success', text: 'Cashier account has been provisioned.' });
      setCashierForm({ id: 'WELFARE-CSH-001', pass: '' });
      fetchData();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to create cashier' });
    }
    setActionLoading(false);
  };

  const handleDeactivate = async (uid: string) => {
    if (!confirm('Are you sure? This user will instantly lose all dashboard access.')) return;
    setActionLoading(true);
    const res = await deactivateWelfareUser(uid);
    if (res.success) {
      setMessage({ type: 'success', text: 'User successfully deactivated.' });
      fetchData();
    }
    setActionLoading(false);
  };

  const handleResetPass = async (uid: string) => {
    const newPass = prompt('Enter a new password (minimum 6 characters):');
    if (!newPass || newPass.length < 6) return;
    setActionLoading(true);
    const res = await resetWelfarePassword(uid, newPass);
    if (res.success) setMessage({ type: 'success', text: 'Credentials have been reset.' });
    setActionLoading(false);
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm font-light">Syncing directory...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-medium text-slate-900 tracking-tight">Directory Control</h1>
        <p className="text-sm text-slate-500 font-light mt-1">Provision administrative access and manage operator credentials.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border text-sm transition-all ${
          message.type === 'success' 
            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          <div className="flex items-center gap-2 font-medium">
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-current"></span>
            {message.text}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Section A: Provision Admin */}
        <section className="bg-white border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] rounded-2xl flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-base font-medium text-slate-900">Provision Admin</h2>
              <p className="text-xs text-slate-400 font-light">Add system administrators</p>
            </div>
          </div>
          <form onSubmit={handleCreateAdmin} className="p-6 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Full Name</label>
                <input 
                  required 
                  className="w-full bg-slate-50/50 border border-slate-100 focus:border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300" 
                  placeholder="e.g. Mohammad Ahmad" 
                  value={adminForm.name} 
                  onChange={e => setAdminForm({...adminForm, name: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Username/ID</label>
                  <input 
                    required 
                    className="w-full bg-slate-50/50 border border-slate-100 focus:border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none transition-all" 
                    value={adminForm.id} 
                    onChange={e => setAdminForm({...adminForm, id: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Password</label>
                  <EyePasswordInput 
                    required 
                    className="w-full bg-slate-50/50 border border-slate-100 focus:border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none transition-all" 
                    value={adminForm.pass} 
                    onChange={e => setAdminForm({...adminForm, pass: e.target.value})} 
                  />
                </div>
              </div>
            </div>
            <button 
              disabled={actionLoading} 
              className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Plus size={15} />
              Create Admin Profile
            </button>
          </form>
        </section>

        {/* Section B: Cashier Control */}
        <section className="bg-white border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] rounded-2xl flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet size={18} />
            </div>
            <div>
              <h2 className="text-base font-medium text-slate-900">Cashier Control</h2>
              <p className="text-xs text-slate-400 font-light">Manage active financial cashier</p>
            </div>
          </div>
          
          <div className="p-6 flex-1 flex flex-col justify-center">
            {cashier ? (
              <div className="bg-slate-50/75 rounded-xl border border-slate-100 p-5 space-y-5 animate-in fade-in duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{cashier.displayName}</h3>
                    <p className="text-xs text-emerald-600 font-medium font-mono mt-0.5">ID: {cashier.customId}</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider">Active</span>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleResetPass(cashier.uid)} 
                    className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  >
                    <KeyRound size={13} /> Password
                  </button>
                  <button 
                    onClick={() => handleDeactivate(cashier.uid)} 
                    className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                  >
                    <UserX size={13} /> Deactivate
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateCashier} className="space-y-4 w-full">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Cashier ID</label>
                  <input 
                    required 
                    className="w-full bg-slate-50/50 border border-slate-100 focus:border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none transition-all" 
                    value={cashierForm.id} 
                    onChange={e => setCashierForm({...cashierForm, id: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Initial Password</label>
                  <EyePasswordInput 
                    required 
                    className="w-full bg-slate-50/50 border border-slate-100 focus:border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none transition-all" 
                    value={cashierForm.pass} 
                    onChange={e => setCashierForm({...cashierForm, pass: e.target.value})} 
                  />
                </div>
                <button 
                  disabled={actionLoading} 
                  className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus size={15} /> Provision Cashier Account
                </button>
              </form>
            )}
          </div>
        </section>
      </div>

      {/* Section C: Admin Roster */}
      <section className="space-y-4 pt-4">
        <div className="flex items-end justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-medium text-slate-900">Administrative Directory</h2>
            <p className="text-xs text-slate-400 font-light">Review and update active administrator status.</p>
          </div>
          <div className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
            {admins.length} Active Profiles
          </div>
        </div>

        {admins.length === 0 ? (
          <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm font-light">No administrators registered in the system directory.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {admins.map((adm) => (
              <div key={adm.uid} className="bg-white border border-slate-100 shadow-[0_2px_6px_-2px_rgba(0,0,0,0.04)] rounded-2xl p-5 flex flex-col justify-between space-y-5 group hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.08)] transition-shadow">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-semibold ${
                    adm.isActive ? 'bg-slate-100 text-slate-700' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {adm.displayName?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border ${
                    adm.isActive 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-slate-50 text-slate-500 border-slate-100'
                  }`}>
                    {adm.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-slate-800 truncate">
                    {adm.displayName}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 font-mono">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">ID:</span>
                    <span className="text-[10px] font-medium text-slate-600">{adm.customId}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex gap-2">
                  <button 
                    onClick={() => handleResetPass(adm.uid)}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 py-1.5 rounded-lg text-xs font-medium transition-all"
                  >
                    Reset Creds
                  </button>
                  {adm.isActive && (
                    <button 
                      onClick={() => handleDeactivate(adm.uid)}
                      className="flex-1 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 text-rose-600 py-1.5 rounded-lg text-xs font-medium transition-all"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

