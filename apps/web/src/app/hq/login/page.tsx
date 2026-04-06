'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import EyePasswordInput from '@/components/spims/EyePasswordInput';
import type { HqSession, HqRole } from '@/types/hq';

const SESSION_KEY = 'hq_session';
const SESSION_TIMEOUT = 43200000;

export default function HqLoginPage() {
  const [customId, setCustomId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed: HqSession = JSON.parse(raw);
        const elapsed = Date.now() - parsed.loginTime;
        if (elapsed < SESSION_TIMEOUT) {
          const roleRoutes: Record<HqRole, string> = {
            superadmin: '/hq/dashboard/superadmin',
            manager: '/hq/dashboard/manager',
            cashier: '/hq/dashboard/cashier',
          };
          router.push(roleRoutes[parsed.role] || '/hq/login');
          return;
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    } finally {
      setChecking(false);
    }
  }, [router]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // FIX: if user accidentally types full email, use it as-is, otherwise append domain
      const rawId = customId.toLowerCase().replace(/\s+/g, '');
      const loginEmail = rawId.includes('@') ? rawId : `${rawId}@hq.khanhub.com`;

      // Try signing in first
      try {
        await signInWithEmailAndPassword(auth, loginEmail, password);
      } catch (authErr: any) {
        if (
          authErr.code === 'auth/user-not-found' ||
          authErr.code === 'auth/invalid-credential' ||
          authErr.code === 'auth/invalid-email'
        ) {
          // First time: create Firebase Auth account for this HQ user
          // Validate password against Firestore first
          const validateQ = query(
            collection(db, 'hq_users'),
            where('customId', '==', customId)
          );
          const validateSnap = await getDocs(validateQ);
          if (validateSnap.empty) {
            setError('Invalid credentials.');
            setLoading(false);
            return;
          }
          const userData = validateSnap.docs[0].data();
          if (userData.password !== password) {
            setError('Invalid ID or password.');
            setLoading(false);
            return;
          }
          // Create Firebase Auth account then sign in
          const { createUserWithEmailAndPassword } = await import('firebase/auth');
          await createUserWithEmailAndPassword(auth, loginEmail, password);
          await signInWithEmailAndPassword(auth, loginEmail, password);
        } else {
          throw authErr;
        }
      }

      // Firebase Auth success — now read session from Firestore
      const q = query(collection(db, 'hq_users'), where('customId', '==', customId));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError('Account not found in system.');
        setLoading(false);
        return;
      }

      const docSnap = snap.docs[0];
      const data = docSnap.data();

      if (data.isActive === false) {
        setError('Account is disabled. Contact administrator.');
        setLoading(false);
        return;
      }

      const session: HqSession = {
        uid: docSnap.id,
        customId: data.customId,
        name: data.name,
        role: data.role as HqRole,
        loginTime: Date.now(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const routes: Record<HqRole, string> = {
        superadmin: '/hq/dashboard/superadmin',
        manager: '/hq/dashboard/manager',
        cashier: '/hq/dashboard/cashier',
      };
      router.push(routes[data.role as HqRole] || '/hq/login');

    } catch (err: any) {
      if (err.code === 'auth/wrong-password') setError('Incorrect password.');
      else if (err.code === 'auth/too-many-requests') setError('Too many attempts. Try later.');
      else setError('Login failed. Check credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm animate-pulse">Checking session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white p-12 rounded-[50px] shadow-2xl shadow-gray-200/50 border border-gray-100 flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center">
          <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-3">KhanHub HQ Portal</h1>
          <p className="text-[#1D9E75] font-black uppercase text-xs tracking-[0.4em] ml-1">Superadmin · Manager · Cashier</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-6 py-4 rounded-3xl text-sm font-bold border border-red-100 text-center animate-shake">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">User ID</label>
            <input
              type="text"
              placeholder="e.g. M-Khan"
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
            onClick={() => handleLogin()}
            disabled={loading}
            className="mt-4 bg-gray-900 text-white rounded-[30px] py-6 font-black text-lg shadow-2xl shadow-gray-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Enter Dashboard'}
          </button>
        </div>

        <p className="text-center text-gray-400 text-xs font-black uppercase tracking-widest leading-relaxed">
          Authorized personnel only.<br />Contact system administrator for access.
        </p>

        <a href="/" className="text-center text-[#1D9E75] text-xs font-bold uppercase tracking-widest hover:underline">
          ← Back to main site
        </a>
      </div>
    </div>
  );
}