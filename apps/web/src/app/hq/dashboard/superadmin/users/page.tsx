// apps/web/src/app/hq/dashboard/superadmin/users/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ToggleLeft, ToggleRight, User, Search, BadgeCheck, ShieldCheck } from 'lucide-react';
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
    <div className="min-h-screen bg-[#FCFBF4] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-black uppercase">Institutional Identity</h1>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-black/60 italic">
              Central User Directory • Global Authentication Matrix
            </p>
          </div>
          
          <div className="flex items-center gap-2 p-1.5 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {(['hq', 'rehab', 'spims'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  tab === t 
                    ? 'bg-black text-white' 
                    : 'text-black/40 hover:text-black'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group mb-10">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, role or identifier..."
            className="w-full h-16 pl-14 pr-8 rounded-[2rem] border-4 border-black bg-white text-sm font-black uppercase tracking-widest text-black outline-none transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:translate-x-1 focus:translate-y-1 focus:shadow-none"
          />
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-black">
            <Search size={24} strokeWidth={3} />
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20">
            <InlineLoading label="Synchronizing Identity Registry..." />
          </div>
        ) : !filtered.length ? (
          <EmptyState title="No Identities Found" message="No user records match your current search criteria." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="group relative flex flex-col bg-white rounded-[3rem] border-4 border-black overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-300"
              >
                <div className="p-8 space-y-8">
                  <div className="flex items-start justify-between">
                    <button type="button" onClick={() => setSelected(u)} className="flex-1 text-left">
                      <h3 className="text-2xl font-black text-black leading-tight group-hover:italic transition-all">
                        {u.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-3 py-1 bg-black text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full">
                          {u.role}
                        </span>
                        <span className="text-[9px] font-bold text-black/40 uppercase tracking-widest">
                          ID: {u.customId || u.uid.slice(0, 8)}
                        </span>
                      </div>
                    </button>
                    <div className={`w-12 h-12 rounded-2xl border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                      u.isActive ? 'bg-emerald-400 text-black' : 'bg-rose-500 text-black'
                    }`}>
                      {u.isActive ? <BadgeCheck size={20} /> : <ShieldCheck size={20} />}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setResetTarget(u)}
                      className="h-14 rounded-2xl border-2 border-black bg-white text-[9px] font-black uppercase tracking-widest text-black hover:bg-black hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm"
                    >
                      <KeyRound size={16} />
                      Reset Creds
                    </button>
                    <button
                      type="button"
                      disabled={busyUid === u.uid}
                      onClick={() => onToggleActive(u)}
                      className={`h-14 rounded-2xl border-2 border-black text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm ${
                        u.isActive 
                          ? 'bg-black text-white hover:bg-white hover:text-black' 
                          : 'bg-emerald-400 text-black border-emerald-600'
                      }`}
                    >
                      {u.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      {u.isActive ? 'Suspend' : 'Reinstate'}
                    </button>
                  </div>
                </div>

                {/* Footer Status */}
                <div className={`h-10 border-t-2 border-black flex items-center px-8 text-[8px] font-black uppercase tracking-widest ${
                  u.isActive ? 'bg-emerald-400 text-black' : 'bg-rose-500 text-black'
                }`}>
                  System Status: {u.isActive ? 'Authorized Matrix Access' : 'Credential Lock Active'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer Components remain functional but styled to match */}
      <ProfileDrawer open={!!selected} onClose={() => setSelected(null)} title="Access Dossier">
        {selected && (
          <div className="space-y-6">
            <div className="p-8 rounded-[2.5rem] border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Primary Identity</span>
              <p className="text-3xl font-black text-black uppercase mt-2">{selected.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl border-2 border-black bg-white">
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Role</span>
                <p className="text-sm font-black text-black mt-1 uppercase">{selected.role}</p>
              </div>
              <div className="p-6 rounded-3xl border-2 border-black bg-white">
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Portal</span>
                <p className="text-sm font-black text-black mt-1 uppercase">{selected.portal}</p>
              </div>
            </div>
            <div className="p-8 rounded-[2.5rem] border-4 border-black bg-black text-white">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">System UID</span>
              <p className="text-xs font-mono font-bold mt-2 break-all opacity-80">{selected.uid}</p>
            </div>
          </div>
        )}
      </ProfileDrawer>

      <ProfileDrawer open={!!resetTarget} onClose={() => setResetTarget(null)} title="Credential Override">
        <div className="space-y-8">
          <div className="p-6 bg-amber-400 border-4 border-black rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-[10px] font-black text-black uppercase tracking-widest leading-relaxed">
              Caution: Overriding credentials will immediately revoke existing sessions. Matrix protocol requires minimum 6 characters.
            </p>
          </div>
          <div className="relative">
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="ENTER NEW SECURITY SEQUENCE"
              className="w-full h-16 px-8 rounded-2xl border-4 border-black bg-white text-sm font-black uppercase tracking-[0.2em] outline-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            />
          </div>
          <button
            type="button"
            disabled={!resetTarget || newPassword.length < 6 || !!busyUid}
            onClick={onReset}
            className="w-full h-16 rounded-[2rem] bg-black text-white text-xs font-black uppercase tracking-[0.3em] hover:bg-white hover:text-black border-4 border-black transition-all shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
          >
            Authorize Reset
          </button>
        </div>
      </ProfileDrawer>
    </div>
  );
}


