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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-gray-900" />
          <p className="text-gray-900 text-[10px] font-black uppercase tracking-[0.3em]">Loading Profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 md:p-8 pb-24 text-gray-900">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">My Profile</h1>

        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-24 h-24 rounded-full bg-gray-50 border-2 border-gray-100 flex items-center justify-center">
            <span className="text-indigo-600 font-black text-3xl">
              {(name || session?.name || 'M')[0].toUpperCase()}
            </span>
          </div>
          <div className="text-center">
            <p className="text-gray-900 font-black text-xl">{session?.name}</p>
            <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mt-1">Manager · {session?.customId}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
          <div>
            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3.5 text-gray-800 text-sm font-bold outline-none focus:border-indigo-500/30 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3.5 text-gray-800 text-sm font-bold outline-none focus:border-indigo-500/30 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-2">Employee ID</label>
            <input
              value={session?.customId || ''}
              disabled
              className="w-full bg-gray-50 border border-gray-100/50 rounded-2xl px-4 py-3.5 text-gray-500 text-sm font-bold outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-2">Email</label>
            <input
              value={userData?.email || ''}
              disabled
              className="w-full bg-gray-50 border border-gray-100/50 rounded-2xl px-4 py-3.5 text-gray-500 text-sm font-bold outline-none cursor-not-allowed"
            />
          </div>

          <button
            disabled={saving || !name.trim()}
            onClick={() => { void handleSave(); }}
            className={`w-full font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 border border-transparent ${saved ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-sm'}`}
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : saved ? '✓ Saved!' : <><Save size={14} /> Save Changes</>}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-white hover:bg-rose-50 border border-gray-100 hover:border-rose-100 text-gray-700 hover:text-rose-600 font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}
