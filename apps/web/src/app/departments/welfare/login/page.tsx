'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginWelfare } from '@/lib/welfare/welfareAuth';
import EyePasswordInput from '@/components/welfare/EyePasswordInput';

export default function WelfareLoginPage() {
  const [customId, setCustomId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const hqSessionStr = localStorage.getItem('hq_session');
    if (hqSessionStr) {
      try {
        const hqSession = JSON.parse(hqSessionStr);
        if (hqSession && hqSession.role === 'superadmin') {
          router.push('/departments/welfare/dashboard/admin');
        }
      } catch (e) {}
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting login with ID:', customId);
      
      // loginWelfare already handles Firestore fetch + isActive check
      const userData = await loginWelfare(customId, password);
      console.log('Login success, user data:', userData);

      const session = {
        uid: userData.uid,
        customId: userData.customId,
        role: userData.role,
        displayName: userData.displayName,
        patientId: userData.patientId || null
      };

      localStorage.setItem('welfare_session', JSON.stringify(session));
      localStorage.setItem('welfare_login_time', Date.now().toString());
      console.log('Redirecting to role:', userData.role);

      if (userData.role === 'family') {
        router.push(`/departments/welfare/dashboard/family/${userData.patientId}`);
      } else if (userData.role === 'staff') {
        router.push('/departments/welfare/dashboard/staff');
      } else if (userData.role === 'cashier') {
        router.push('/departments/welfare/dashboard/cashier');
      } else if (userData.role === 'admin') {
        router.push('/departments/welfare/dashboard/admin');
      } else if (userData.role === 'superadmin') {
        router.push('/departments/welfare/dashboard/superadmin');
      } else {
        setError('Unknown role: ' + userData.role);
      }
    } catch (err: any) {
      console.error('Login error full object:', err);
      console.error('Login error code:', err.code);
      console.error('Login error message:', err.message);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white p-12 rounded-[50px] shadow-2xl shadow-gray-200/50 border border-gray-100 flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center">
          <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-3">Welfare Portal</h1>
          <p className="text-[#1D9E75] font-black uppercase text-xs tracking-[0.4em] ml-1">Access Authentication</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-6 py-4 rounded-3xl text-sm font-bold border border-red-100 text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">User Identity</label>
            <input 
              type="text" 
              placeholder="e.g. WEL-ADM-001"
              required
              className="bg-gray-50 border-none rounded-[30px] px-8 py-6 text-gray-700 font-bold focus:ring-4 focus:ring-[#1D9E75]/10 outline-none transition-all placeholder:text-gray-300"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Secret Password</label>
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
            {loading ? 'Authenticating...' : 'Enter Dashboard'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
          Authorized personnel only.<br />Contact system administrator for access.
        </p>
      </div>
    </div>
  );
}
