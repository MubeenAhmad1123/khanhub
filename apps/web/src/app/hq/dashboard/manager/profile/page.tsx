'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, User, Phone, Save, LogOut } from 'lucide-react';

export default function ManagerProfilePage() {
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
    if (!session || !['manager', 'superadmin'].includes(session.role)) router.push('/hq/login');
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
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8 pb-24">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">My Profile</h1>

        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
            <span className="text-amber-500 font-black text-3xl">
              {(name || session?.name || 'M')[0].toUpperCase()}
            </span>
          </div>
          <div className="text-center">
            <p className="text-white font-black text-xl">{session?.name}</p>
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mt-1">Manager · {session?.customId}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/8 rounded-3xl p-6 space-y-4">
          <div>
            <label className="text-black text-[10px] font-black uppercase tracking-widest block mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-black" size={14} />
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-black text-[10px] font-black uppercase tracking-widest block mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-black" size={14} />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-black text-[10px] font-black uppercase tracking-widest block mb-2">Employee ID</label>
            <input
              value={session?.customId || ''}
              disabled
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-black text-sm font-bold outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-black text-[10px] font-black uppercase tracking-widest block mb-2">Email</label>
            <input
              value={userData?.email || ''}
              disabled
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-black text-sm font-bold outline-none cursor-not-allowed"
            />
          </div>

          <button
            disabled={saving || !name.trim()}
            onClick={() => { void handleSave(); }}
            className={`w-full font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${saved ? 'bg-emerald-500 text-white' : 'bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black shadow-lg shadow-amber-500/20'}`}
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : saved ? '✓ Saved!' : <><Save size={14} /> Save Changes</>}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-white/5 hover:bg-rose-500/10 border border-white/8 hover:border-rose-500/20 text-black hover:text-rose-400 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}
