'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginRehab } from '@/lib/rehab/rehabAuth';

export default function RehabLoginPage() {
  const router = useRouter();
  const [customId, setCustomId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await loginRehab(customId, password);
      localStorage.setItem('rehab_session', JSON.stringify(user));
      
      const role = user.role;
      if (role === 'family') {
        router.push(`/departments/rehab/dashboard/family/${user.patientId}`);
      } else if (role === 'staff') {
        router.push('/departments/rehab/dashboard/staff');
      } else if (role === 'cashier') {
        router.push('/departments/rehab/dashboard/cashier');
      } else if (role === 'admin') {
        router.push('/departments/rehab/dashboard/admin');
      } else if (role === 'superadmin') {
        router.push('/departments/rehab/dashboard/superadmin');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 p-10 border border-gray-100 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl mx-auto mb-6 flex items-center justify-center border border-gray-100">
            <img src="/logo.webp" alt="KhanHub" className="w-12 h-12 rounded-xl" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Rehab Portal</h1>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">KhanHub Management System</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 text-sm font-bold border border-red-100 flex items-center gap-3">
             <span className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center text-xs">!</span>
             {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-2">User ID</label>
            <input
              type="text"
              required
              placeholder="e.g. REHAB-FAM-001"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-700 font-bold focus:ring-4 focus:ring-[#1D9E75]/10 focus:border-[#1D9E75] outline-none transition-all placeholder:text-gray-300"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-2">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-700 font-bold focus:ring-4 focus:ring-[#1D9E75]/10 focus:border-[#1D9E75] outline-none transition-all placeholder:text-gray-300"
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-[#1D9E75] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-[#1D9E75]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4 h-16"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Logging in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-10 text-xs font-bold text-gray-400 uppercase tracking-widest">
          Secure Access Protocol v1.0
        </p>
      </div>
    </div>
  );
}
