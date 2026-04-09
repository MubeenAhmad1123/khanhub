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
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <InlineLoading label="Loading settings…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Department toggles, thresholds, and notifications.</p>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="text-sm font-black text-gray-900 dark:text-white">Departments</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {deptEntries.map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => toggleDept(k)}
              className={`h-12 rounded-2xl border px-4 text-left text-sm font-black transition ${
                v
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'border-gray-200 bg-gray-50 text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-gray-200'
              }`}
            >
              {k} {v ? '(enabled)' : '(disabled)'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="text-sm font-black text-gray-900 dark:text-white">Approval thresholds</h2>
        <div className="mt-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Require proof over (PKR)</label>
          <div className="mt-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <input
              type="number"
              value={settings.approvalThresholds?.requireProofOverPkr ?? 5000}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  approvalThresholds: { ...(s.approvalThresholds || { requireProofOverPkr: 5000 }), requireProofOverPkr: Number(e.target.value || 0) },
                }))
              }
              className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="text-sm font-black text-gray-900 dark:text-white">Notifications</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
              className={`h-12 rounded-2xl border px-4 text-left text-sm font-black transition ${
                v
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'border-gray-200 bg-gray-50 text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-gray-200'
              }`}
            >
              {k} {v ? '(on)' : '(off)'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="text-sm font-black text-gray-900 dark:text-white">Save</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">A change note is required for auditing.</p>
        <div className="mt-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Enable SPIMS + raise proof threshold"
            className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
          />
        </div>
        <button
          type="button"
          disabled={saving || !note.trim()}
          onClick={save}
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-gray-900 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}

