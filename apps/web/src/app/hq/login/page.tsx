'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { provisionSuperadminAndSetSession, loginHqUser, setHqSessionCookieFromIdToken } from '@/app/hq/actions/auth';
import EyePasswordInput from '@/components/spims/EyePasswordInput';
import type { HqSession, HqRole } from '@/types/hq';
import { loginUniversal } from '@/lib/hq/auth/universalAuth';
import { Spinner } from '@/components/ui';

const SESSION_KEY = 'hq_session';
const SESSION_TIMEOUT = 604800000; // 7 days in milliseconds

export default function HqLoginPage() {
  const [customId, setCustomId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  const normalizeRole = (role: unknown): HqRole | null => {
    const r = String(role || '').trim().toLowerCase();
    if (r === 'superadmin' || r === 'manager' || r === 'cashier') return r as HqRole;
    return null;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw || !user) {
          localStorage.removeItem(SESSION_KEY);
          setChecking(false);
          return;
        }

        const parsed: HqSession = JSON.parse(raw);
        if (user.uid !== parsed.uid) {
          localStorage.removeItem(SESSION_KEY);
          void signOut(auth);
          setChecking(false);
          return;
        }

        const elapsed = Date.now() - parsed.loginTime;
        if (elapsed < SESSION_TIMEOUT) {
          const roleRoutes: Record<HqRole, string> = {
            superadmin: '/hq/dashboard/superadmin',
            manager: '/hq/dashboard/manager',
            cashier: '/hq/dashboard/cashier',
          };
          const normalized = normalizeRole(parsed.role) || 'cashier';
          router.push(roleRoutes[normalized] || '/hq/login');
          return;
        }

        localStorage.removeItem(SESSION_KEY);
      } catch {
        localStorage.removeItem(SESSION_KEY);
      } finally {
        setChecking(false);
      }
    });
    return () => unsub();
  }, [router]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await loginHqUser({ customId, password });

      if (!result.success) {
        setError(result.error || 'Authentication failed.');
        setLoading(false);
        return;
      }

      if (result.customToken && result.uid) {
        // 1. Sign into Firebase Auth so Firestore rules work
        const userCred = await signInWithCustomToken(auth, result.customToken);
        
        // 2. Set HQ Session Cookie (Server Action)
        const idToken = await userCred.user.getIdToken();
        await setHqSessionCookieFromIdToken(idToken);

        // 3. Set Local Session for client-side persistence
        const session: HqSession = {
          uid: result.uid,
          customId: result.user.customId,
          name: result.user.name,
          role: result.user.role,
          loginTime: Date.now(),
          ...result.user
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        localStorage.setItem('hq_login_time', Date.now().toString());

        // 4. Redirect based on role
        const roleRoutes: Record<HqRole, string> = {
          superadmin: '/hq/dashboard/superadmin',
          manager: '/hq/dashboard/manager',
          cashier: '/hq/dashboard/cashier',
        };
        const dest = roleRoutes[result.user.role as HqRole] || '/hq/dashboard';
        window.location.href = dest;
      } else {
        setError('Login failed: No authentication token received.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[HQ Login] Error:', err);
      setError(err.message || 'Something went wrong. Try again.');
      setLoading(false);
    }
  };

  const SUPERADMIN_EMAILS = [
    'mk.rana.0301@gmail.com',
    'mubeenahma1123@gmail.com',
    'khanhubnetwork@gmail.com',
    'dilshad4408@gmail.com',
  ];

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email || !SUPERADMIN_EMAILS.includes(user.email.toLowerCase())) {
        await signOut(auth);
        setError('Unauthorized email. Superadmin access denied.');
        setLoading(false);
        return;
      }

      // Provision user and set session cookie via Server Action (Safe from permission errors)
      const idToken = await user.getIdToken();
      const provisionResult = await provisionSuperadminAndSetSession(idToken);

      if (!provisionResult.success) {
        await signOut(auth);
        setError(provisionResult.error || 'Failed to initialize superadmin session.');
        setLoading(false);
        return;
      }

      // Set Local Session for client-side persistence
      if (provisionResult.session) {
        localStorage.setItem('hq_session', JSON.stringify(provisionResult.session));
        localStorage.setItem('hq_login_time', Date.now().toString());
      }

      window.location.href = '/hq/dashboard/superadmin';
    } catch (err: any) {
      console.error('[HQ Google Login] Error:', err);
      setError(err.message || 'Google Sign-in failed.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white p-12 rounded-[50px] shadow-2xl shadow-gray-200/50 border border-gray-100 flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center">
          <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-3">Khan Hub Master Panel</h1>
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
            {loading ? <Spinner size="sm" showText={false} /> : 'Enter Dashboard'}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase">Or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="bg-white border-2 border-gray-200 text-gray-700 rounded-[30px] py-5 font-black text-base shadow-sm hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
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
