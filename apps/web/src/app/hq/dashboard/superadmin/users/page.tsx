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
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-black dark:text-black italic">Central user directory • Global Authentication Control</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        {(['hq', 'rehab', 'spims'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${tab === t
                ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white transform scale-105 z-10'
                : 'bg-white dark:bg-black text-black dark:text-black border-gray-100 dark:border-white/10 hover:border-black dark:hover:border-white'
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
          className="w-full bg-transparent text-sm font-black text-black dark:text-white outline-none placeholder:text-black dark:placeholder:text-black uppercase tracking-widest text-[11px]"
        />
      </div>

      <div className="mt-5">
        {loading ? (
          <InlineLoading label="Loading users…" />
        ) : !filtered.length ? (
          <EmptyState title="No users" message="No users match your search." />
        ) : (
          <div className="mt-5">
            {loading ? (
              <InlineLoading label="Loading users…" />
            ) : !filtered.length ? (
              <EmptyState title="No users" message="No users match your search." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filtered.map((u) => (
                  <div
                    key={u.id}
                    className="group relative rounded-[2.5rem] border border-gray-100 dark:border-white/5 bg-white dark:bg-black p-8 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/5 dark:hover:shadow-white/5 overflow-hidden"
                  >
                    {/* Visual Accent */}
                    <div className={`absolute -top-12 -right-12 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${u.isActive ? 'bg-primary-500' : 'bg-rose-500'}`} />

                    <div className="relative z-10 flex flex-col h-full space-y-6">
                      <div className="flex justify-between items-start">
                        <button type="button" onClick={() => setSelected(u)} className="flex items-center gap-4 group/btn">
                          <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 group-hover/btn:border-black dark:group-hover/btn:border-white transition-colors shadow-inner">
                            <User className="h-8 w-8 text-black dark:text-black group-hover/btn:text-black dark:group-hover/btn:text-white transition-colors" />
                          </div>
                          <div className="text-left">
                            <p className="text-xl font-black text-black dark:text-white uppercase tracking-tight leading-none">{u.name}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-[9px] font-black text-black dark:text-black uppercase tracking-widest">{u.role}</span>
                              <span className="text-[9px] font-bold text-black dark:text-black">/</span>
                              <span className="text-[9px] font-bold text-black dark:text-black tracking-wider truncate max-w-[100px]">{u.customId || u.uid.slice(0, 8)}</span>
                            </div>
                          </div>
                        </button>

                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${u.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-100 dark:border-emerald-500/20'
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 border-rose-100 dark:border-rose-500/20'
                          }`}>
                          {u.isActive ? 'Active' : 'Locked'}
                        </div>
                      </div>

                      <div className="pt-6 border-t border-gray-50 dark:border-white/5 flex gap-3">
                        <button
                          type="button"
                          onClick={() => setResetTarget(u)}
                          className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-black dark:border-white/10 dark:bg-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all active:scale-95 shadow-sm"
                        >
                          <KeyRound className="h-4 w-4" />
                          Reset
                        </button>
                        <button
                          type="button"
                          disabled={busyUid === u.uid}
                          onClick={() => onToggleActive(u)}
                          className={`flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50 ${u.isActive
                              ? 'bg-black text-white dark:bg-white dark:text-black'
                              : 'bg-rose-500 text-white'
                            }`}
                        >
                          {u.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                          {u.isActive ? 'Suspend' : 'Unlock'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ProfileDrawer open={!!selected} onClose={() => setSelected(null)} title="Identity Profile">
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-gray-50 bg-white p-6 dark:border-white/5 dark:bg-black shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-black mb-2">Authenticated Name</div>
              <div className="text-xl font-black text-black dark:text-white uppercase tracking-tight">{selected.name}</div>
            </div>
            <div className="rounded-[2rem] border border-gray-50 bg-white p-6 dark:border-white/5 dark:bg-black shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-black mb-2">Access Role</div>
              <div className="text-lg font-black text-black dark:text-white uppercase">{selected.role}</div>
            </div>
            <div className="rounded-[2rem] border border-gray-50 bg-white p-6 dark:border-white/5 dark:bg-black shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-black mb-2">System Identifier</div>
              <div className="text-xs font-mono font-bold text-black dark:text-black break-all">{selected.uid}</div>
            </div>
          </div>
        ) : null}
      </ProfileDrawer>

      <ProfileDrawer open={!!resetTarget} onClose={() => setResetTarget(null)} title="Credential Reset">
        <div className="space-y-6">
          <p className="text-sm font-bold text-black dark:text-black italic">
            Override security credentials. Minimum 6 characters required for compliance.
          </p>
          <div className="rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black px-6 py-4 transition-all shadow-sm focus-within:border-black dark:focus-within:border-white/40">
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Set new credentials…"
              className="w-full bg-transparent text-sm font-black text-black outline-none placeholder:text-black dark:text-white"
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

