'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginUniversal } from '@/lib/hq/auth/universalAuth';
import { Eye, EyeOff, Lock, User, Terminal, Sparkles } from 'lucide-react';

export default function SocialMediaLoginPage() {
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
        if (hqSession && (hqSession.role === 'superadmin' || hqSession.role === 'manager')) {
          router.push('/departments/social-media/dashboard/admin');
        }
      } catch (e) {}
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await loginUniversal(customId, password);
      if (!result.success) {
        setError(result.error || 'Identity verification failed.');
        setLoading(false);
        return;
      }
      // Redirection to dashboard handled by loginUniversal
    } catch (err: any) {
      console.error('[Media Login] Error:', err);
      setError('System authentication error. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070913] text-white flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Ambient background glows */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/30 via-[#070913]/10 to-transparent pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-violet-500/[0.02] rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="w-full max-w-lg bg-white/[0.02] backdrop-blur-3xl p-12 rounded-[2.5rem] border border-white/[0.06] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
        
        {/* Top Logo Section */}
        <div className="text-center relative">
          <div className="w-14 h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center justify-center text-violet-400 mx-auto mb-4 shadow-inner">
            <Terminal size={24} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">Media Gateway</h1>
          <p className="text-violet-400 font-black uppercase text-[10px] tracking-[0.35em] mt-2 flex items-center justify-center gap-1.5 pl-3">
            <Sparkles size={11} className="animate-pulse" />
            Access Authentication
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 text-rose-400 px-6 py-4 rounded-2xl text-sm font-bold border border-rose-500/20 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          
          {/* Identity ID */}
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-5">User Credentials ID</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="e.g. MEDIA-ADM-001"
                required
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-2xl px-6 py-5 pl-14 text-white font-bold focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/40 outline-none transition-all placeholder:text-slate-600 text-sm"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
              />
              <User size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-5">Secret Security Key</label>
            <div className="relative">
              <EyePasswordInput
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-2xl px-6 py-5 pl-14 pr-16 text-white font-bold focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/40 outline-none transition-all placeholder:text-slate-600 text-sm"
              />
              <Lock size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          {/* Authenticate Button */}
          <button 
            type="submit"
            disabled={loading}
            className="mt-4 w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl py-5 font-black text-base shadow-xl shadow-indigo-950/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 border border-indigo-400/20"
          >
            {loading ? 'Verifying Credentials...' : 'Authenticate & Enter'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
          Authorized personnel only.<br />
          Contact system administrator for access.
        </p>
      </div>

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom-8 { from { transform: translateY(2rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: fade-in 0.6s ease-out, slide-in-from-bottom-8 0.6s ease-out; }
      `}</style>
    </div>
  );
}

// Local, self-contained interactive eye-password input to prevent module lookup errors
function EyePasswordInput({ value, onChange, placeholder = '••••••••••••', required = true, className = '' }: any) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative w-full">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={className}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
