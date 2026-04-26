// apps/web/src/app/hq/dashboard/superadmin/users/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  KeyRound, 
  ToggleLeft, 
  ToggleRight, 
  User, 
  Search, 
  BadgeCheck, 
  ShieldCheck, 
  ShieldAlert, 
  ChevronRight,
  Fingerprint,
  Activity
} from 'lucide-react';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { subscribePortalUsers, type Portal, type PortalUserRow } from '@/lib/hq/superadmin/users';
import { ProfileDrawer } from '@/components/hq/superadmin/ProfileDrawer';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { resetPortalUserPassword } from '@/app/hq/actions/resetPortalUserPassword';
import { toggleUserActive } from '@/lib/hq/superadmin/users';
import { cn } from '@/lib/utils';

import { getDeptCollection, type StaffDept } from '@/lib/hq/superadmin/staff';

const ALL_PORTALS: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];

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
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0A0A0A] py-16 transition-colors duration-500">
      <div className="mx-auto max-w-7xl px-6">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 mb-16">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-black dark:bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-black/20 dark:shadow-white/10">
              <Fingerprint className="text-white dark:text-black" size={40} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tighter text-black dark:text-white uppercase leading-none">Identity Matrix</h1>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 italic pl-1">
                Central Authentication • Global Access Control
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/10 backdrop-blur-xl overflow-x-auto no-scrollbar shadow-xl shadow-black/5">
            {ALL_PORTALS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0",
                  tab === t 
                    ? 'bg-black text-white shadow-2xl dark:bg-white dark:text-black' 
                    : 'text-gray-400 hover:text-black dark:hover:text-white'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group mb-16">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, role or identifier..."
            className="w-full h-20 pl-16 pr-8 rounded-[3rem] border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-bold text-black dark:text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-2xl shadow-black/5"
          />
          <div className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={28} strokeWidth={3} />
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center">
            <InlineLoading label="Synchronizing Identity Registry..." />
          </div>
        ) : !filtered.length ? (
          <div className="py-20">
            <EmptyState title="No Identities Found" message="No user records match your current search criteria." />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="group relative flex flex-col bg-white dark:bg-[#121212] rounded-[3.5rem] border border-black/5 dark:border-white/5 overflow-hidden shadow-2xl shadow-black/5 hover:shadow-black/10 hover:-translate-y-2 transition-all duration-500"
              >
                <div className="p-10 space-y-10">
                  <div className="flex items-start justify-between">
                    <button type="button" onClick={() => setSelected(u)} className="flex-1 text-left">
                      <h3 className="text-3xl font-black text-black dark:text-white tracking-tighter leading-none mb-4 group-hover:text-primary transition-colors">
                        {u.name}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                          {u.role}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                          ID: {u.customId || u.uid.slice(0, 8)}
                        </span>
                      </div>
                    </button>
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all group-hover:scale-110",
                      u.isActive ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'
                    )}>
                      {u.isActive ? <BadgeCheck size={28} /> : <ShieldAlert size={28} />}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setResetTarget(u)}
                      className="h-16 rounded-[1.5rem] bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center justify-center gap-3 shadow-sm group/btn"
                    >
                      <KeyRound size={18} className="group-hover/btn:rotate-12 transition-transform" />
                      Override
                    </button>
                    <button
                      type="button"
                      disabled={busyUid === u.uid}
                      onClick={() => onToggleActive(u)}
                      className={cn(
                        "h-16 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg",
                        u.isActive 
                          ? 'bg-rose-500 text-white shadow-rose-500/20' 
                          : 'bg-emerald-500 text-white shadow-emerald-500/20'
                      )}
                    >
                      {u.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      {u.isActive ? 'Suspend' : 'Reinstate'}
                    </button>
                  </div>
                </div>

                {/* Footer Status */}
                <div className={cn(
                  "h-12 border-t border-black/5 dark:border-white/5 flex items-center px-10 text-[9px] font-black uppercase tracking-[0.2em] transition-colors",
                  u.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                )}>
                  <div className={cn("w-2 h-2 rounded-full mr-3", u.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')} />
                  {u.isActive ? 'Authorized Matrix Access' : 'Credential Lock Active'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile Drawer */}
      <ProfileDrawer open={!!selected} onClose={() => setSelected(null)} title="Access Dossier">
        {selected && (
          <div className="space-y-10 p-4">
            <div className="p-10 rounded-[3rem] bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-2xl shadow-black/5">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-4 block">Primary Identity</span>
              <p className="text-4xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">{selected.name}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="p-8 rounded-[2.5rem] bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-xl shadow-black/5">
                <div className="flex items-center gap-3 mb-4">
                  <Activity size={16} className="text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Role</span>
                </div>
                <p className="text-lg font-black text-black dark:text-white uppercase tracking-tight">{selected.role}</p>
              </div>
              <div className="p-8 rounded-[2.5rem] bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-xl shadow-black/5">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck size={16} className="text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Portal</span>
                </div>
                <p className="text-lg font-black text-black dark:text-white uppercase tracking-tight">{selected.portal}</p>
              </div>
            </div>

            <div className="p-10 rounded-[3rem] bg-black dark:bg-white text-white dark:text-black shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-4 block">Universal System UID</span>
                <p className="text-xs font-mono font-bold break-all opacity-80 leading-relaxed">{selected.uid}</p>
              </div>
            </div>
          </div>
        )}
      </ProfileDrawer>

      <ProfileDrawer open={!!resetTarget} onClose={() => setResetTarget(null)} title="Credential Override">
        <div className="space-y-10 p-4">
          <div className="p-8 bg-amber-400 dark:bg-amber-500 rounded-[2.5rem] shadow-2xl shadow-amber-500/20">
            <p className="text-[11px] font-black text-black dark:text-black uppercase tracking-widest leading-relaxed">
              <ShieldAlert className="w-6 h-6 mb-3" strokeWidth={3} />
              Caution: Overriding credentials will immediately revoke all existing sessions in the matrix. Security protocol requires minimum 6 characters.
            </p>
          </div>
          
          <div className="relative">
            <input
              value={newPassword}
              type="password"
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="ENTER NEW SECURITY SEQUENCE"
              className="w-full h-20 px-10 rounded-[2.5rem] bg-gray-100 dark:bg-white/5 border border-transparent text-sm font-black text-black dark:text-white uppercase tracking-[0.3em] outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
            />
          </div>

          <button
            type="button"
            disabled={!resetTarget || newPassword.length < 6 || !!busyUid}
            onClick={onReset}
            className="w-full h-20 rounded-[2.5rem] bg-black dark:bg-white text-white dark:text-black text-[11px] font-black uppercase tracking-[0.4em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/20 flex items-center justify-center gap-4 group"
          >
            Authorize Sequence Reset
            <ChevronRight size={20} strokeWidth={4} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </ProfileDrawer>
    </div>
  );
}
