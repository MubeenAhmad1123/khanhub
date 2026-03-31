'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createHqUserServer, checkHqSetupStatus, markHqSetupComplete } from '../actions/createHqUser';
import EyePasswordInput from '@/components/spims/EyePasswordInput';

export default function HqSetupPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [alreadySetup, setAlreadySetup] = useState(false);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
        const isCompleted = await checkHqSetupStatus();
        setAlreadySetup(isCompleted);
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

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await createHqUserServer({
        customId: 'KHAN-SA-001',
        name,
        role: 'superadmin',
        password,
        createdBy: 'system',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create super admin');
      }

      await markHqSetupComplete(result.uid!);

      setSuccess(true);
      setTimeout(() => router.push('/hq/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!mounted || checking) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-gray-500 text-sm animate-pulse">Checking system status...</p>
      </div>
    );
  }

  try {
    if (alreadySetup) {
      return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <p className="text-gray-700 font-medium">Setup already complete.</p>
          <button onClick={() => router.push('/hq/login')}
             className="text-teal-600 underline text-sm">Go to Login</button>
        </div>
      );
    }

    if (success) {
      return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <p className="text-green-600 font-medium text-lg">
            Setup complete! Redirecting to login...
          </p>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl p-10 border border-gray-100">
          <h1 className="text-4xl font-black text-center text-gray-900 mb-2 tracking-tight">KhanHub HQ</h1>
          <p className="text-xs text-center tracking-[0.3em] text-gray-400 font-black uppercase mb-10">
            System Setup
          </p>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-6 py-4 text-sm mb-8">
            <p className="text-amber-800 font-bold text-center">
              ⚠️ This page will be disabled after setup is complete.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 
                            rounded-2xl px-6 py-4 text-sm mb-8 font-bold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <h2 className="text-lg font-black text-gray-800 mb-4 border-b border-gray-50 pb-2">Super Admin Account</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] 
                                    text-gray-400 block mb-1 ml-2">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 
                               py-4 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] 
                                    text-gray-400 block mb-1 ml-2">Admin ID</label>
                  <input
                    type="text"
                    value="KHAN-SA-001"
                    readOnly
                    className="w-full bg-gray-100 border border-gray-200 rounded-2xl px-6 
                               py-4 text-sm font-bold text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] 
                                      text-gray-400 block mb-1 ml-2">Password</label>
                    <EyePasswordInput
                      value={password}
                      onChange={e => setPassword(e.target.value)}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white 
                         font-black py-5 rounded-[2rem] text-lg shadow-2xl transition disabled:opacity-50">
              {loading ? 'Setting up...' : 'Initialize System'}
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