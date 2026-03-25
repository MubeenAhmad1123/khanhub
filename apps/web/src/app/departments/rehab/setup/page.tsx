'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createRehabUserServer } from '../actions/createRehabUser';

export default function RehabSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    superAdminId: 'REHAB-SA-001',
    superAdminPass: '',
    confirmPass: '',
    cashierId: 'REHAB-CSH-001',
    cashierPass: ''
  });

  useEffect(() => {
    const checkSetup = async () => {
      const snap = await getDoc(doc(db, 'rehab_meta', 'setup'));
      if (snap.exists() && snap.data().completed) {
        setIsCompleted(true);
      }
      setLoading(false);
    };
    checkSetup();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.superAdminPass !== formData.confirmPass) {
      setError('Passwords do not match');
      return;
    }
    
    setSubmitting(true);
    setError('');

    try {
      // 1. Create Super Admin
      const saResult = await createRehabUserServer(formData.superAdminId, formData.superAdminPass, 'superadmin', 'Super Admin');
      if (!saResult.success) throw new Error(`Super Admin error: ${saResult.error}`);

      // 2. Create Cashier
      const csResult = await createRehabUserServer(formData.cashierId, formData.cashierPass, 'cashier', 'Cashier');
      if (!csResult.success) throw new Error(`Cashier error: ${csResult.error}`);

      // 3. Mark setup as completed
      await setDoc(doc(db, 'rehab_meta', 'setup'), {
        completed: true,
        completedAt: new Date(),
        superAdminCustomId: formData.superAdminId,
        cashierCustomId: formData.cashierId
      });

      router.push('/departments/rehab/login');
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center animate-pulse" />;

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 text-center max-w-md">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">System Initialized</h1>
          <p className="text-gray-500 mb-8">The Rehab ERP system has already been set up. Please use your credentials to log in.</p>
          <button 
            onClick={() => router.push('/departments/rehab/login')}
            className="w-full bg-[#1D9E75] text-white py-4 rounded-2xl font-black shadow-lg shadow-[#1D9E75]/20 hover:scale-[1.02] transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-gray-100 max-w-2xl w-full space-y-10 animate-in fade-in zoom-in duration-700">
        <div className="text-center">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">System Setup</h1>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-[0.3em]">Initialize Rehab Portal</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 font-bold text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-lg font-black text-gray-900 border-b border-gray-50 pb-2">Master Super Admin</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Admin ID</label>
               <input disabled value={formData.superAdminId} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-400 cursor-not-allowed" />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Password</label>
               <input type="password" required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-[#1D9E75]/10" value={formData.superAdminPass} onChange={e => setFormData({...formData, superAdminPass: e.target.value})} />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Confirm</label>
               <input type="password" required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-[#1D9E75]/10" value={formData.confirmPass} onChange={e => setFormData({...formData, confirmPass: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-gray-50">
          <h2 className="text-lg font-black text-gray-900 border-b border-gray-50 pb-2">Single Cashier Account</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Cashier ID</label>
               <input disabled value={formData.cashierId} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-400 cursor-not-allowed" />
            </div>
            <div className="col-span-2 space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Cashier Password</label>
               <input type="password" required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-[#1D9E75]/10" value={formData.cashierPass} onChange={e => setFormData({...formData, cashierPass: e.target.value})} />
            </div>
          </div>
        </div>

        <button 
          disabled={submitting}
          className="w-full bg-gray-900 text-white py-6 rounded-[2rem] font-black text-lg shadow-2xl hover:bg-gray-800 transition-all disabled:opacity-50"
        >
          {submitting ? 'Initializing...' : 'Bootstrap System'}
        </button>
      </form>
    </div>
  );
}
