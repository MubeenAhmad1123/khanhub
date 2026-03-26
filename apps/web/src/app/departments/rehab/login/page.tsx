'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginRehab } from '@/lib/rehab/rehabAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function RehabLoginPage() {
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
      console.log('Attempting login with ID:', customId);
      const user = await loginRehab(customId, password);
      console.log('Firebase auth success, uid:', user.uid);
      
      // Step 3 Security Fix: Verify from Firestore
      const docSnap = await getDoc(doc(db, 'rehab_users', user.uid));
      
      if (!docSnap.exists() || !docSnap.data().isActive) {
        await signOut(auth);
        setError('Account is inactive or not found.');
        return;
      }

      const userData = docSnap.data();
      console.log('Firestore user data:', userData);
      const session = {
        uid: user.uid,
        customId: userData.customId,
        role: userData.role,
        displayName: userData.displayName,
        patientId: userData.patientId || null
      };

      localStorage.setItem('rehab_session', JSON.stringify(session));

      // Role-based redirects
      const role = userData.role;
      console.log('Redirecting to role:', role);
      if (role === 'family') {
        router.push(`/departments/rehab/dashboard/family/${userData.patientId}`);
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
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white p-12 rounded-[50px] shadow-2xl shadow-gray-200/50 border border-gray-100 flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center">
          <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-3">Rehab Portal</h1>
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
              placeholder="e.g. REHAB-ADM-001"
              required
              className="bg-gray-50 border-none rounded-[30px] px-8 py-6 text-gray-700 font-bold focus:ring-4 focus:ring-[#1D9E75]/10 outline-none transition-all placeholder:text-gray-300"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Secret Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              required
              className="bg-gray-50 border-none rounded-[30px] px-8 py-6 text-gray-700 font-bold focus:ring-4 focus:ring-[#1D9E75]/10 outline-none transition-all placeholder:text-gray-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
