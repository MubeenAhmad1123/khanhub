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
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FCFBF8] pb-16 font-sans selection:bg-indigo-100 selection:text-indigo-900 px-2 sm:px-0">
      <div className="max-w-xl mx-auto space-y-12">
        <header className="flex items-center justify-between px-2 sm:px-0">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.back()}
              className="p-3 hover:bg-zinc-50 rounded-2xl transition-all active:scale-95 text-zinc-400 hover:text-zinc-900 border border-transparent hover:border-zinc-100 shadow-sm bg-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">Profile</h1>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em] mt-1">Update your personal information</p>
            </div>
          </div>
        </header>

        <div className="relative group w-full">
            <div className="absolute inset-0 bg-indigo-600/5 rounded-[2rem] sm:rounded-[3rem] md:rounded-[4rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="relative flex flex-col items-center gap-6 py-8 px-6 sm:py-12 bg-white rounded-[2rem] sm:rounded-[3rem] md:rounded-[4rem] border border-zinc-100 shadow-2xl shadow-zinc-200/50 overflow-hidden w-full">
                <div className="w-32 h-32 rounded-full bg-zinc-50 border-8 border-white shadow-2xl flex items-center justify-center relative overflow-hidden group/avatar mx-auto">
                    <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover/avatar:opacity-10 transition-opacity" />
                    <span className="text-zinc-900 font-black text-4xl">
                    {(name || session?.name || 'C')[0].toUpperCase()}
                    </span>
                </div>
                <div className="text-center space-y-2">
                    <p className="text-zinc-900 font-black text-2xl sm:text-3xl tracking-tighter">{name || session?.name}</p>
                    <div className="flex items-center gap-3 justify-center">
                        <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">
                            <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                              {session?.role ? (session.role.charAt(0).toUpperCase() + session.role.slice(1).toLowerCase()) : 'Cashier'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border border-zinc-100 shadow-2xl shadow-zinc-200/30 space-y-10 w-full">
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-4 w-full">
              <label className="text-zinc-900 text-[11px] font-black uppercase tracking-[0.2em] block px-1">Full Name</label>
              <div className="relative group w-full">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-[1.5rem] sm:rounded-[2rem] pl-14 pr-6 py-4 sm:py-5 min-h-[48px] text-zinc-900 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 focus:shadow-xl focus:shadow-indigo-100/50 transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-4 w-full">
              <label className="text-zinc-900 text-[11px] font-black uppercase tracking-[0.2em] block px-1">Phone Number</label>
              <div className="relative group w-full">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-[1.5rem] sm:rounded-[2rem] pl-14 pr-6 py-4 sm:py-5 min-h-[48px] text-zinc-900 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 focus:shadow-xl focus:shadow-indigo-100/50 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-4 w-full">
              <div className="p-4 sm:p-6 bg-zinc-50/50 border border-zinc-200 md:border-zinc-100 rounded-[1.5rem] sm:rounded-[2rem] space-y-2 w-full">
                <label className="text-zinc-400 text-[9px] font-black uppercase tracking-widest block">Role</label>
                <p className="text-sm font-black text-zinc-900 uppercase">
                  {session?.role ? (session.role.charAt(0).toUpperCase() + session.role.slice(1).toLowerCase()) : 'Cashier'}
                </p>
              </div>
              <div className="p-4 sm:p-6 bg-zinc-50/50 border border-zinc-200 md:border-zinc-100 rounded-[1.5rem] sm:rounded-[2rem] space-y-2 w-full">
                <label className="text-zinc-400 text-[9px] font-black uppercase tracking-widest block">Email</label>
                <p className="text-sm font-bold text-zinc-900 truncate">{userData?.email || 'N/A'}</p>
              </div>
            </div>
          </div>

          <button
            disabled={saving || !name.trim()}
            onClick={() => { void handleSave(); }}
            className={cn(
              "w-full font-black text-xs uppercase tracking-[0.2em] py-5 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] transition-all duration-500 active:scale-95 flex items-center justify-center gap-4 shadow-2xl mb-4",
              saved 
                ? "bg-emerald-500 text-white shadow-emerald-200" 
                : "bg-indigo-600 hover:bg-zinc-900 text-white shadow-indigo-200 disabled:opacity-50"
            )}
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : saved ? 'Profile Updated' : <><Save size={20} /> Save</>}
          </button>
        </div>

        <div className="pt-2 w-full">
          <button
            onClick={handleLogout}
            className="w-full bg-white hover:bg-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 text-rose-600 font-black text-xs uppercase tracking-[0.3em] py-5 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] transition-all duration-500 flex items-center justify-center gap-4 shadow-sm hover:shadow-2xl hover:shadow-rose-100 active:scale-95 group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" /> 
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
