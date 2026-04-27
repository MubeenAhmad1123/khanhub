'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, User, Phone, Save, LogOut, ArrowLeft } from 'lucide-react';

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
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] p-4 md:p-8 pb-24 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-lg mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2.5 hover:bg-zinc-100 rounded-2xl transition-all active:scale-95 text-zinc-400 hover:text-zinc-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">Account Settings</h1>
        </div>

        <div className="flex flex-col items-center gap-4 py-8 bg-white rounded-[3rem] border border-zinc-100 shadow-sm">
          <div className="w-28 h-28 rounded-full bg-indigo-50 border-4 border-white shadow-xl flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity" />
            <span className="text-indigo-600 font-black text-4xl">
              {(name || session?.name || 'C')[0].toUpperCase()}
            </span>
          </div>
          <div className="text-center">
            <p className="text-zinc-900 font-black text-2xl">{name || session?.name}</p>
            <div className="flex items-center gap-2 justify-center mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">{session?.role} · {session?.customId}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] p-8 border border-zinc-100 shadow-sm space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-zinc-400 text-[10px] font-black uppercase tracking-widest block mb-2 px-1">Display Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-4 py-4 text-zinc-900 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="text-zinc-400 text-[10px] font-black uppercase tracking-widest block mb-2 px-1">Phone Contact</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-4 py-4 text-zinc-900 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-400 text-[10px] font-black uppercase tracking-widest block mb-2 px-1">Identifier</label>
                <div className="px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-400 text-sm font-black uppercase">
                  {session?.customId || 'N/A'}
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-[10px] font-black uppercase tracking-widest block mb-2 px-1">Email Address</label>
                <div className="px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-400 text-sm font-bold truncate">
                  {userData?.email || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <button
            disabled={saving || !name.trim()}
            onClick={() => { void handleSave(); }}
            className={`w-full font-black text-xs uppercase tracking-widest py-4.5 rounded-2xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 shadow-xl ${saved ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-indigo-600 hover:bg-zinc-900 text-white shadow-indigo-100 disabled:opacity-50'}`}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : saved ? '✓ Profile Updated' : <><Save size={18} /> Save Preferences</>}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-white hover:bg-rose-50 border border-zinc-100 hover:border-rose-100 text-zinc-400 hover:text-rose-600 font-black text-xs uppercase tracking-widest py-4.5 rounded-[2rem] transition-all duration-300 flex items-center justify-center gap-3 shadow-sm"
        >
          <LogOut size={18} /> End Session
        </button>
      </div>
    </div>
  );
}
