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
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 transition-colors duration-300">
      <div className="flex items-start justify-between gap-3 mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-black dark:text-white uppercase">Identity Hub</h1>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 italic">Central user directory • Global Authentication Control</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        {(['hq', 'rehab', 'spims'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${
              tab === t 
                ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white transform scale-105 z-10' 
                : 'bg-white dark:bg-black text-gray-400 dark:text-gray-500 border-gray-100 dark:border-white/10 hover:border-black dark:hover:border-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-black px-6 py-4 transition-all shadow-sm focus-within:border-black dark:focus-within:border-white/40 group">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search identity sequence…"
          className="w-full bg-transparent text-sm font-black text-black dark:text-white outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 uppercase tracking-widest text-[11px]"
        />
      </div>

      <div className="mt-5">
        {loading ? (
          <InlineLoading label="Loading users…" />
        ) : !filtered.length ? (
          <EmptyState title="No users" message="No users match your search." />
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="rounded-[2rem] border border-gray-50 bg-white p-5 shadow-sm transition-all hover:translate-x-1 hover:border-black dark:hover:border-white dark:border-white/[0.02] dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => setSelected(u)} className="min-w-0 text-left group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10">
                        <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-black text-black dark:text-white group-hover:text-primary-500 transition-colors uppercase tracking-tight">{u.name}</p>
                        <p className="mt-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                          {u.role} <span className="mx-1 text-gray-200 dark:text-gray-800">/</span> {u.customId || u.email || u.uid}
                        </p>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setResetTarget(u)}
                      className="inline-flex h-12 items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-black dark:border-white/10 dark:bg-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all active:scale-95 shadow-sm"
                    >
                      <KeyRound className="h-4 w-4" />
                      Reset
                    </button>
                    <button
                      type="button"
                      disabled={busyUid === u.uid}
                      onClick={() => onToggleActive(u)}
                      className={`inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 ${
                        u.isActive 
                          ? 'bg-black text-white dark:bg-white dark:text-black' 
                          : 'bg-rose-500 text-white border-rose-500'
                      }`}
                    >
                      {u.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                      {u.isActive ? 'Active' : 'Locked'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProfileDrawer open={!!selected} onClose={() => setSelected(null)} title="Identity Profile">
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-gray-50 bg-white p-6 dark:border-white/5 dark:bg-black shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Authenticated Name</div>
              <div className="text-xl font-black text-black dark:text-white uppercase tracking-tight">{selected.name}</div>
            </div>
            <div className="rounded-[2rem] border border-gray-50 bg-white p-6 dark:border-white/5 dark:bg-black shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Access Role</div>
              <div className="text-lg font-black text-black dark:text-white uppercase">{selected.role}</div>
            </div>
            <div className="rounded-[2rem] border border-gray-50 bg-white p-6 dark:border-white/5 dark:bg-black shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">System Identifier</div>
              <div className="text-xs font-mono font-bold text-gray-600 dark:text-gray-400 break-all">{selected.uid}</div>
            </div>
          </div>
        ) : null}
      </ProfileDrawer>

      <ProfileDrawer open={!!resetTarget} onClose={() => setResetTarget(null)} title="Credential Reset">
        <div className="space-y-6">
          <p className="text-sm font-bold text-gray-400 dark:text-gray-500 italic">
            Override security credentials. Minimum 6 characters required for compliance.
          </p>
          <div className="rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black px-6 py-4 transition-all shadow-sm focus-within:border-black dark:focus-within:border-white/40">
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Set new credentials…"
              className="w-full bg-transparent text-sm font-black text-black outline-none placeholder:text-gray-300 dark:text-white"
            />
          </div>
          <button
            type="button"
            disabled={!resetTarget || newPassword.length < 6 || !!busyUid}
            onClick={onReset}
            className="inline-flex h-14 w-full items-center justify-center rounded-[2rem] bg-black text-[11px] font-black uppercase tracking-[0.2em] text-white disabled:opacity-50 dark:bg-white dark:text-black shadow-xl active:scale-95 transition-all"
          >
            Authenticate Reset
          </button>
        </div>
      </ProfileDrawer>
    </div>
  );
}

