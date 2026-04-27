'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, User, Phone, Save, LogOut, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CashierProfilePage() {
  const router = useRouter();
  const { session, loading: sessionLoading, clearSession } = useHqSession();
  const [userData, setUserData] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'cashier') router.push('/hq/login');
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session) return;
    getDoc(doc(db, 'hq_users', session.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setUserData(d);
        setName(d.name || '');
        setPhone(d.phone || '');
      }
      setLoading(false);
    });
  }, [session]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await updateDoc(doc(db, 'hq_users', session!.uid), {
      name: name.trim(),
      phone: phone.trim(),
    });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogout = () => {
    clearSession();
    router.push('/hq/login');
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFBF8]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Loading Preferences</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] p-4 md:p-8 pb-32 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-xl mx-auto space-y-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.back()}
              className="p-3 hover:bg-zinc-50 rounded-2xl transition-all active:scale-95 text-zinc-400 hover:text-zinc-900 border border-transparent hover:border-zinc-100 shadow-sm bg-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Security & Profile</h1>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Personnel Authentication Node</p>
            </div>
          </div>
        </header>

        <div className="relative group">
            <div className="absolute inset-0 bg-indigo-600/5 rounded-[4rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative flex flex-col items-center gap-6 py-12 bg-white rounded-[4rem] border border-zinc-100 shadow-2xl shadow-zinc-200/50 overflow-hidden">
                <div className="w-32 h-32 rounded-full bg-zinc-50 border-8 border-white shadow-2xl flex items-center justify-center relative overflow-hidden group/avatar">
                    <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover/avatar:opacity-10 transition-opacity" />
                    <span className="text-zinc-900 font-black text-4xl">
                    {(name || session?.name || 'C')[0].toUpperCase()}
                    </span>
                </div>
                <div className="text-center space-y-2">
                    <p className="text-zinc-900 font-black text-3xl tracking-tighter">{name || session?.name}</p>
                    <div className="flex items-center gap-3 justify-center">
                        <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">
                            <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">{session?.role}</p>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">{session?.customId}</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-[3.5rem] p-10 border border-zinc-100 shadow-2xl shadow-zinc-200/30 space-y-10">
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-4">
              <label className="text-zinc-900 text-[11px] font-black uppercase tracking-[0.2em] block px-1">Personal Identity</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Official Name"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-[2rem] pl-14 pr-6 py-5 text-zinc-900 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 focus:shadow-xl focus:shadow-indigo-100/50 transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-zinc-900 text-[11px] font-black uppercase tracking-[0.2em] block px-1">Contact Channel</label>
              <div className="relative group">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Primary Phone"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-[2rem] pl-14 pr-6 py-5 text-zinc-900 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 focus:shadow-xl focus:shadow-indigo-100/50 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="p-6 bg-zinc-50/50 border border-zinc-100 rounded-[2rem] space-y-2">
                <label className="text-zinc-400 text-[9px] font-black uppercase tracking-widest block">Access ID</label>
                <p className="text-sm font-black text-zinc-900 uppercase">{session?.customId || 'N/A'}</p>
              </div>
              <div className="p-6 bg-zinc-50/50 border border-zinc-100 rounded-[2rem] space-y-2">
                <label className="text-zinc-400 text-[9px] font-black uppercase tracking-widest block">Email Link</label>
                <p className="text-sm font-bold text-zinc-900 truncate">{userData?.email || 'N/A'}</p>
              </div>
            </div>
          </div>

          <button
            disabled={saving || !name.trim()}
            onClick={() => { void handleSave(); }}
            className={cn(
              "w-full font-black text-xs uppercase tracking-[0.2em] py-6 rounded-[2rem] transition-all duration-500 active:scale-95 flex items-center justify-center gap-4 shadow-2xl",
              saved 
                ? "bg-emerald-500 text-white shadow-emerald-200" 
                : "bg-indigo-600 hover:bg-zinc-900 text-white shadow-indigo-200 disabled:opacity-50"
            )}
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : saved ? 'Authentication Updated' : <><Save size={20} /> Commit Changes</>}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-white hover:bg-rose-500 hover:text-white border border-zinc-100 text-zinc-400 font-black text-xs uppercase tracking-[0.3em] py-6 rounded-[3rem] transition-all duration-500 flex items-center justify-center gap-4 shadow-sm hover:shadow-2xl hover:shadow-rose-100 active:scale-95 group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          Terminate Session
        </button>

        <footer className="pt-20 text-center">
            <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.5em] italic">Secure Personnel Management Node</p>
        </footer>
      </div>
    </div>
  );
}
