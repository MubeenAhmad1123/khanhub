'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createItUserServer, markItSetupComplete } from '../actions/createItUser';
import EyePasswordInput from '@/components/job-center/EyePasswordInput';

export default function ItSetupPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [alreadySetup, setAlreadySetup] = useState(false);

  const [superAdminId, setSuperAdminId] = useState('IT-SA-001');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cashierId, setCashierId] = useState('IT-CSH-001');
  const [cashierPassword, setCashierPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    async function checkSetup() {
      try {
        const snap = await getDoc(doc(db, 'it_meta', 'setup'));
        if (snap.exists() && snap.data()?.completed === true) {
          setAlreadySetup(true);
        }
      } catch (e) {
      } finally {
        setChecking(false);
      }
    }
    checkSetup();
  }, [mounted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (superAdminPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (superAdminPassword.length < 8 || cashierPassword.length < 8) {
      setError('Passwords must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const saResult = await createItUserServer(
        superAdminId, superAdminPassword, 'superadmin', 'IT Super Admin'
      );
      if (!saResult.success) throw new Error(saResult.error || 'Failed to create super admin');

      const cshResult = await createItUserServer(
        cashierId, cashierPassword, 'cashier', 'IT Cashier'
      );
      if (!cshResult.success) throw new Error(cshResult.error || 'Failed to create cashier');

      const metaResult = await markItSetupComplete(superAdminId, cashierId);
      if (!metaResult.success) throw new Error(metaResult.error || 'Failed to mark setup complete');

      setSuccess(true);
      setTimeout(() => router.push('/departments/it/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!mounted || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm animate-pulse">Checking system status...</p>
      </div>
    );
  }

  if (alreadySetup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-700 font-medium text-xl font-display">IT System already initialized.</p>
        <button onClick={() => router.push('/departments/it/login')}
           className="text-indigo-600 underline font-bold uppercase tracking-widest text-xs">Go to Login</button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-green-600 font-black text-2xl font-display text-center">
          IT System initialized successfully!<br />
          <span className="text-sm font-medium text-gray-500">Redirecting to login...</span>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#f8fafc]">
      <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-xl p-12 border border-indigo-50">
        <h1 className="text-5xl font-black text-center text-gray-900 mb-2 tracking-tight font-display">IT Setup</h1>
        <p className="text-[10px] text-center tracking-[0.4em] text-indigo-600 font-black uppercase mb-12">
          Initialize Department Portal
        </p>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 
                          rounded-3xl px-8 py-4 text-sm mb-10 font-bold text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          <div>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 border-b border-gray-50 pb-3 ml-2">Master Super Admin</h2>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] 
                                  text-gray-400 block mb-2 ml-6">Admin Identity ID</label>
                <input
                  type="text"
                  value={superAdminId}
                  onChange={e => setSuperAdminId(e.target.value)}
                  required
                  className="w-full bg-gray-50 border-none rounded-[30px] px-8 
                             py-5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] 
                                    text-gray-400 block mb-2 ml-6">Password</label>
                  <EyePasswordInput
                    value={superAdminPassword}
                    onChange={e => setSuperAdminPassword(e.target.value)}
                    required
                    className="bg-gray-50 border-none rounded-[30px] px-8 py-5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-none"
                  />
                </div>
                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] 
                                    text-gray-400 block mb-2 ml-6">Confirm</label>
                  <EyePasswordInput
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    className="bg-gray-50 border-none rounded-[30px] px-8 py-5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 border-b border-gray-50 pb-3 ml-2">Department Cashier</h2>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] 
                                  text-gray-400 block mb-2 ml-6">Cashier Identity ID</label>
                <input
                  type="text"
                  value={cashierId}
                  onChange={e => setCashierId(e.target.value)}
                  required
                  className="w-full bg-gray-50 border-none rounded-[30px] px-8 
                             py-5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div className="relative">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] 
                                  text-gray-400 block mb-2 ml-6">Cashier Password</label>
                <EyePasswordInput
                  value={cashierPassword}
                  onChange={e => setCashierPassword(e.target.value)}
                  required
                  className="bg-gray-50 border-none rounded-[30px] px-8 py-5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-black text-white 
                       font-black py-6 rounded-[35px] text-lg shadow-2xl shadow-indigo-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50">
            {loading ? 'Bootstrapping System...' : 'Initialize IT Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}
