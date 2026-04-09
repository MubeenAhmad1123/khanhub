// apps/web/src/app/hq/dashboard/superadmin/users/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ToggleLeft, ToggleRight, User } from 'lucide-react';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { subscribePortalUsers, type Portal, type PortalUserRow } from '@/lib/hq/superadmin/users';
import { ProfileDrawer } from '@/components/hq/superadmin/ProfileDrawer';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { resetPortalUserPassword } from '@/app/hq/actions/resetPortalUserPassword';
import { toggleUserActive } from '@/lib/hq/superadmin/users';

export default function SuperadminUsersPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [tab, setTab] = useState<Portal>('hq');
  const [rows, setRows] = useState<PortalUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<PortalUserRow | null>(null);
  const [resetTarget, setResetTarget] = useState<PortalUserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [busyUid, setBusyUid] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    setLoading(true);
    const unsub = subscribePortalUsers(
      tab,
      (r) => {
        setRows(r);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [session, tab]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((u) => {
      const hay = `${u.name} ${u.role} ${u.email || ''} ${u.customId || ''}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  const onToggleActive = async (u: PortalUserRow) => {
    setBusyUid(u.uid);
    try {
      await toggleUserActive(tab, u.uid, !u.isActive);
    } finally {
      setBusyUid(null);
    }
  };

  const onReset = async () => {
    if (!resetTarget) return;
    setBusyUid(resetTarget.uid);
    try {
      const res = await resetPortalUserPassword(resetTarget.uid, tab, newPassword);
      if (!res.success) throw new Error(res.error || 'Failed to reset');
      setResetTarget(null);
      setNewPassword('');
    } catch (e: any) {
      alert(e?.message || 'Failed');
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">All Users</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">HQ + Rehab + SPIMS user directory.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md">
        {(['hq', 'rehab', 'spims'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-11 rounded-2xl text-xs font-black uppercase tracking-widest transition ${
              tab === t ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name / role / email / ID…"
          className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
        />
      </div>

      <div className="mt-5">
        {loading ? (
          <InlineLoading label="Loading users…" />
        ) : !filtered.length ? (
          <EmptyState title="No users" message="No users match your search." />
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => setSelected(u)} className="min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <p className="truncate text-sm font-black text-gray-900 dark:text-white">{u.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {u.role} • {u.customId || u.email || u.uid}
                    </p>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setResetTarget(u)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-black uppercase tracking-widest text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      <KeyRound className="h-4 w-4" />
                      Reset
                    </button>
                    <button
                      type="button"
                      disabled={busyUid === u.uid}
                      onClick={() => onToggleActive(u)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-gray-900 px-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
                    >
                      {u.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      {u.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProfileDrawer open={!!selected} onClose={() => setSelected(null)} title="User profile">
        {selected ? (
          <div className="space-y-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Name</div>
              <div className="mt-1 text-sm font-black text-gray-900 dark:text-white">{selected.name}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Role</div>
              <div className="mt-1 text-sm font-black text-gray-900 dark:text-white">{selected.role}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">UID</div>
              <div className="mt-1 text-xs font-mono text-gray-700 dark:text-gray-200 break-all">{selected.uid}</div>
            </div>
          </div>
        ) : null}
      </ProfileDrawer>

      <ProfileDrawer open={!!resetTarget} onClose={() => setResetTarget(null)} title="Reset password">
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Set a new password (min 6 chars). Passwords are stored only in Firebase Auth.
          </p>
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password…"
              className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
            />
          </div>
          <button
            type="button"
            disabled={!resetTarget || newPassword.length < 6 || !!busyUid}
            onClick={onReset}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-gray-900 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            Reset now
          </button>
        </div>
      </ProfileDrawer>
    </div>
  );
}

