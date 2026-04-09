// apps/web/src/app/departments/spims/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginSpims } from '@/lib/spims/spimsAuth';
import EyePasswordInput from '@/components/spims/EyePasswordInput';

export default function SpimsLoginPage() {
  const [customId, setCustomId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userData = await loginSpims(customId, password);

      const studentId = userData.studentId ?? userData.patientId ?? null;

      const session = {
        uid: userData.uid,
        customId: userData.customId,
        role: userData.role,
        displayName: userData.displayName || userData.name || '',
        studentId,
        patientId: studentId,
      };

      localStorage.setItem('spims_session', JSON.stringify(session));
      localStorage.setItem('spims_login_time', Date.now().toString());

      if (userData.role === 'student') {
        if (!studentId) {
          setError('Student profile is not linked to this account.');
          setLoading(false);
          return;
        }
        router.push(`/departments/spims/dashboard/student/${studentId}`);
      } else if (userData.role === 'staff') {
        router.push('/departments/spims/dashboard/staff');
      } else if (userData.role === 'cashier') {
        router.push('/departments/spims/dashboard/cashier');
      } else if (userData.role === 'admin') {
        router.push('/departments/spims/dashboard/admin');
      } else if (userData.role === 'superadmin') {
        router.push('/departments/spims/dashboard/superadmin');
      } else {
        setError('Unknown role: ' + userData.role);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white p-12 rounded-[50px] shadow-2xl shadow-gray-200/50 border border-gray-100 flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center">
          <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-3">SPIMS Portal</h1>
          <p className="text-[#1D9E75] font-black uppercase text-xs tracking-[0.4em] ml-1">College access</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-6 py-4 rounded-3xl text-sm font-bold border border-red-100 text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Login ID</label>
            <input
              type="text"
              placeholder="e.g. STU-36322"
              required
              className="bg-gray-50 border-none rounded-[30px] px-8 py-6 text-gray-700 font-bold focus:ring-4 focus:ring-[#1D9E75]/10 outline-none transition-all placeholder:text-gray-300"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Password</label>
            <EyePasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-gray-50 border-none rounded-[30px] px-8 py-6 text-gray-700 font-bold focus:ring-4 focus:ring-[#1D9E75]/10 outline-none transition-all placeholder:text-gray-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 bg-gray-900 text-white rounded-[30px] py-6 font-black text-lg shadow-2xl shadow-gray-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Enter dashboard'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
          Authorized personnel only.
          <br />
          Contact administration for access.
        </p>
      </div>
    </div>
  );
}
