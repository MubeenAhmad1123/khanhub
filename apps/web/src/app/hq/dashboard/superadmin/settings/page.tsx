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
      () => setLoading(false)
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
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 bg-white dark:bg-black min-h-screen">
        <InlineLoading label="Syncing HQ Parameters…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-10 min-h-screen bg-white dark:bg-black transition-colors duration-300">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-black dark:text-white uppercase">System Parameters</h1>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 italic">Department architecture • Protocol thresholds • Global notifications</p>
      </div>

      <div className="mt-8 rounded-[2.5rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-8 shadow-sm">
        <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-widest mb-6">Department Matrix</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {deptEntries.map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => toggleDept(k)}
              className={`h-14 rounded-2xl border px-6 text-left text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm ${
                v
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white transform scale-[1.02] z-10'
                  : 'bg-white dark:bg-black text-gray-300 dark:text-gray-600 border-gray-100 dark:border-white/10 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{k}</span>
                <span className="opacity-40">{v ? 'ENABLED' : 'OFFLINE'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[2.5rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-8 shadow-sm">
        <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-widest mb-6">Approval Governance</h2>
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 italic">Require cryptographic proof above amount (PKR)</label>
          <div className="mt-4 rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-6 py-4 transition-all focus-within:border-black dark:focus-within:border-white/40">
            <input
              type="number"
              value={settings.approvalThresholds?.requireProofOverPkr ?? 5000}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  approvalThresholds: { ...(s.approvalThresholds || { requireProofOverPkr: 5000 }), requireProofOverPkr: Number(e.target.value || 0) },
                }))
              }
              className="w-full bg-transparent text-sm font-black text-black dark:text-white outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[2.5rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-8 shadow-sm">
        <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-widest mb-6">Surveillance Alerts</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              className={`h-14 rounded-2xl border px-6 text-left text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm ${
                v
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                  : 'bg-white dark:bg-black text-gray-300 dark:text-gray-600 border-gray-100 dark:border-white/10 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{k.replace(/([A-Z])/g, ' $1')}</span>
                <span className="opacity-40">{v ? 'ACTIVE' : 'MUTED'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[2.5rem] border border-black dark:border-white bg-black dark:bg-white p-10 shadow-2xl">
        <h2 className="text-sm font-black text-white dark:text-black uppercase tracking-[0.2em]">Commit State</h2>
        <p className="mt-2 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">A descriptive change note is mandatory for audit compliance.</p>
        <div className="mt-6 rounded-2xl border border-white/10 dark:border-black/10 bg-white/5 dark:bg-black/5 px-6 py-4 transition-all focus-within:border-white dark:focus-within:border-black">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ENTER AUTHORIZED CHANGE NOTE..."
            className="w-full bg-transparent text-sm font-black text-white dark:text-black outline-none placeholder:text-gray-600 dark:placeholder:text-gray-400 uppercase tracking-widest text-[11px]"
          />
        </div>
        <button
          type="button"
          disabled={saving || !note.trim()}
          onClick={save}
          className="mt-6 inline-flex h-16 w-full items-center justify-center rounded-2xl bg-white dark:bg-black text-[11px] font-black uppercase tracking-[0.3em] text-black dark:text-white disabled:opacity-30 active:scale-95 transition-all shadow-xl"
        >
          {saving ? 'UPDATING CORE...' : 'COMMIT CHANGES'}
        </button>
      </div>
    </div>
  );
}

