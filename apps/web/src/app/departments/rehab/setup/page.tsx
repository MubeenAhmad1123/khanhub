'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createRehabUserServer, markSetupComplete } from '../actions/createRehabUser';
import EyePasswordInput from '@/components/rehab/EyePasswordInput';

export default function SetupPage() {
  const router = useRouter();

  // mounted prevents any render before hydration
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [alreadySetup, setAlreadySetup] = useState(false);

  // form state
  const [superAdminId, setSuperAdminId] = useState('REHAB-SA-001');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cashierId, setCashierId] = useState('REHAB-CSH-001');
  const [cashierPassword, setCashierPassword] = useState('');

  // submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Step 1: set mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    import('../actions/createRehabUser').then(m => {
      m.debugEnvVars().then(result => {
        console.log('ENV CHECK:', result);
      });
    });
  }, [mounted]);

  // Step 2: check Firestore only after mounted
  useEffect(() => {
    if (!mounted) return;
    async function checkSetup() {
      try {
        const snap = await getDoc(doc(db, 'rehab_meta', 'setup'));
        if (snap.exists() && snap.data()?.completed === true) {
          setAlreadySetup(true);
        }
      } catch (e) {
        // If read fails, allow setup to continue
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
      // 1. Create super admin
      const saResult = await createRehabUserServer(
        superAdminId, superAdminPassword, 'superadmin', 'Super Admin'
      );
      if (!saResult.success) throw new Error(saResult.error || 'Failed to create super admin');

      // 2. Create cashier
      const cshResult = await createRehabUserServer(
        cashierId, cashierPassword, 'cashier', 'Cashier'
      );
      if (!cshResult.success) throw new Error(cshResult.error || 'Failed to create cashier');

      // 3. Mark setup as completed via server action (bypasses client rules)
      const metaResult = await markSetupComplete(superAdminId, cashierId);
      if (!metaResult.success) throw new Error(metaResult.error || 'Failed to mark setup complete');

      setSuccess(true);
      setTimeout(() => router.push('/departments/rehab/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Render nothing until mounted (prevents hydration mismatch)
  if (!mounted || checking) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-gray-500 text-sm animate-pulse">Checking system status...</p>
      </div>
    );
  }

  // STEP 5: Wrap JSX in try-catch pattern (using conditional return for error state if any)
  try {
    if (alreadySetup) {
      return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <p className="text-gray-700 font-medium">System already initialized.</p>
          <button onClick={() => router.push('/departments/rehab/login')}
             className="text-teal-600 underline text-sm">Go to Login</button>
        </div>
      );
    }

    if (success) {
      return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <p className="text-green-600 font-medium text-lg">
            System initialized successfully! Redirecting to login...
          </p>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl p-10 border border-gray-100">
          <h1 className="text-4xl font-black text-center text-gray-900 mb-2 tracking-tight">System Setup</h1>
          <p className="text-xs text-center tracking-[0.3em] text-gray-400 font-black uppercase mb-10">
            Initialize Rehab Portal
          </p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 
                            rounded-2xl px-6 py-4 text-sm mb-8 font-bold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <h2 className="text-lg font-black text-gray-800 mb-4 border-b border-gray-50 pb-2">Master Super Admin</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] 
                                    text-gray-400 block mb-1 ml-2">Admin ID</label>
                  <input
                    type="text"
                    value={superAdminId}
                    onChange={e => setSuperAdminId(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 
                               py-4 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] 
                                      text-gray-400 block mb-1 ml-2">Password</label>
                    <EyePasswordInput
                      value={superAdminPassword}
                      onChange={e => setSuperAdminPassword(e.target.value)}
                      required
                      className="bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all shadow-none"
                    />
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] 
                                      text-gray-400 block mb-1 ml-2">Confirm</label>
                    <EyePasswordInput
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      className="bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all shadow-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-black text-gray-800 mb-4 border-b border-gray-50 pb-2">Single Cashier Account</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] 
                                    text-gray-400 block mb-1 ml-2">Cashier ID</label>
                  <input
                    type="text"
                    value={cashierId}
                    onChange={e => setCashierId(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 
                               py-4 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                  />
                </div>
                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] 
                                    text-gray-400 block mb-1 ml-2">Cashier Password</label>
                  <EyePasswordInput
                    value={cashierPassword}
                    onChange={e => setCashierPassword(e.target.value)}
                    required
                    className="bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all shadow-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white 
                         font-black py-5 rounded-[2rem] text-lg shadow-2xl transition disabled:opacity-50">
              {loading ? 'Bootstrapping System...' : 'Initialize System'}
            </button>
          </form>
        </div>
      </div>
    );
  } catch (err: any) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-red-50 p-8 rounded-3xl border border-red-100 text-red-700 font-bold max-w-md text-center">
          Render error: {err.message}
        </div>
      </div>
    );
  }
}
