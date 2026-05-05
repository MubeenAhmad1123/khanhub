// apps/web/src/app/hq/dashboard/superadmin/settings/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import type { HqSettings } from '@/lib/hq/superadmin/types';
import { updateHqSettings } from '@/app/hq/actions/settings';
import { InlineLoading } from '@/components/hq/superadmin/DataState';

const DEFAULT: HqSettings = {
  enabledDepartments: { rehab: true, spims: true, hq: true, hospital: false, sukoon: false, welfare: false, 'job-center': false },
  approvalThresholds: { requireProofOverPkr: 5000 },
  notificationPrefs: {
    txForwarded: true,
    txApproved: true,
    txRejected: true,
    reconciliationFlagged: true,
    salaryApproved: true,
  },
};

export default function SuperadminSettingsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [settings, setSettings] = useState<HqSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    setLoading(true);
    return onSnapshot(
      doc(db, 'hq_settings', 'superadmin'),
      (snap) => {
        setSettings({ ...DEFAULT, ...(snap.exists() ? (snap.data() as any) : {}) });
        setLoading(false);
      },
      (err) => {
        console.error('[Settings] onSnapshot error:', err);
        setLoading(false);
      }
    );
  }, [session]);

  const deptEntries = useMemo(() => Object.entries(settings.enabledDepartments || {}), [settings.enabledDepartments]);

  const toggleDept = (key: string) => {
    setSettings((s) => ({
      ...s,
      enabledDepartments: { ...(s.enabledDepartments || {}), [key]: !(s.enabledDepartments || {})[key] },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await updateHqSettings({ ...settings, changeNote: note });
      if (!res.success) throw new Error((res as any).error || 'Failed');
      setNote('');
    } catch (e: any) {
      alert(e?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFBF8] flex items-center justify-center">
        <InlineLoading label="Synchronizing Parameters..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-gray-900 py-20 px-8">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="flex items-center gap-6 mb-16">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-100 transition-transform hover:scale-105 duration-500">
            <div className="w-10 h-10 border-4 border-white/30 rounded-full border-t-white animate-[spin_3s_linear_infinite]" />
          </div>
          <div>
            <h1 className="text-6xl font-black tracking-tighter text-gray-900 uppercase leading-none">Settings</h1>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 italic pl-1">Global Architecture Control Matrix</p>
          </div>
        </div>

        <div className="rounded-[3rem] border border-gray-100 bg-white p-12 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)]">
          <h2 className="text-[12px] font-black text-gray-900 uppercase tracking-[0.3em] mb-10 flex items-center gap-4">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            Department Access Matrix
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {deptEntries.map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => toggleDept(k)}
                className={`group h-16 rounded-2xl border px-8 text-left text-[11px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden ${
                  v
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100 scale-[1.02]'
                    : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-indigo-200 hover:text-indigo-600'
                }`}
              >
                <div className="flex items-center justify-between relative z-10">
                  <span>{k}</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${v ? 'bg-white/20' : 'bg-gray-200 group-hover:bg-indigo-100'}`}>
                    <div className={`w-2 h-2 rounded-full ${v ? 'bg-white animate-pulse' : 'bg-gray-400 group-hover:bg-indigo-600'}`} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[3rem] border border-gray-100 bg-white p-12 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)]">
          <h2 className="text-[12px] font-black text-gray-900 uppercase tracking-[0.3em] mb-10 flex items-center gap-4">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            Governance Thresholds
          </h2>
          <div className="space-y-6">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 italic block mb-4">Cryptographic proof requirement boundary (PKR)</label>
            <div className="relative group">
               <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none">
                 <span className="text-gray-400 font-black text-lg">₨</span>
               </div>
               <input
                type="number"
                value={settings.approvalThresholds?.requireProofOverPkr ?? 5000}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    approvalThresholds: { ...(s.approvalThresholds || { requireProofOverPkr: 5000 }), requireProofOverPkr: Number(e.target.value || 0) },
                  }))
                }
                className="w-full h-20 pl-16 pr-8 rounded-[2rem] bg-gray-50 border border-gray-100 text-2xl font-black text-gray-900 outline-none focus:ring-8 focus:ring-indigo-600/5 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[3rem] border border-gray-100 bg-white p-12 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)]">
          <h2 className="text-[12px] font-black text-gray-900 uppercase tracking-[0.3em] mb-10 flex items-center gap-4">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            Surveillance & Intel Alerts
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(Object.entries(settings.notificationPrefs || {}) as Array<
              [keyof NonNullable<HqSettings['notificationPrefs']>, boolean]
            >).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    notificationPrefs: { ...(s.notificationPrefs || {}), [k]: !(s.notificationPrefs || {})[k] },
                  }))
                }
                className={`h-16 rounded-2xl border px-8 text-left text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                  v
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100'
                    : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-indigo-200 hover:text-indigo-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{k.replace(/([A-Z])/g, ' $1')}</span>
                  <span className={`text-[8px] px-3 py-1 rounded-full ${v ? 'bg-white/20' : 'bg-gray-200'}`}>{v ? 'ACTIVE' : 'MUTED'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[3.5rem] bg-gray-900 p-12 md:p-16 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Commit Vector</h2>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] italic mb-10">Verification note required for audit synchronization</p>
            
            <div className="space-y-8">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ENTER AUTHORIZED CHANGE NOTE..."
                className="w-full h-20 px-10 rounded-[2rem] bg-white/5 border border-white/10 text-[11px] font-black text-white uppercase tracking-[0.3em] outline-none focus:ring-8 focus:ring-indigo-500/20 transition-all placeholder:text-white/20"
              />
              
              <button
                type="button"
                disabled={saving || !note.trim()}
                onClick={save}
                className="w-full h-20 rounded-[2rem] bg-indigo-600 text-white text-[12px] font-black uppercase tracking-[0.5em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-indigo-500/20 disabled:opacity-20 flex items-center justify-center gap-6 group/btn"
              >
                {saving ? 'Synchronizing Core...' : 'Push Configuration Changes'}
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover/btn:rotate-12 transition-all">
                  <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

