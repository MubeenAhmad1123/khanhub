// apps/web/src/app/hq/dashboard/superadmin/users/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Activity, BadgeCheck, Building2, ClipboardList, CreditCard, 
  Users2, UserPlus, TrendingUp, Search, ShieldCheck, ChevronRight,
  KeyRound, ToggleLeft, ToggleRight, Fingerprint, ShieldAlert
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
    <div className="min-h-screen bg-[#FCFBF8] py-20">
      <div className="mx-auto max-w-7xl px-8">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-12 mb-20">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 bg-black rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-gray-200">
              <Fingerprint className="text-white" size={44} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-6xl font-black tracking-tighter text-black uppercase leading-none">Identity</h1>
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.6em] text-gray-400 pl-1">
                Central Authentication Control
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-x-auto no-scrollbar">
            {ALL_PORTALS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0",
                  tab === t 
                    ? 'bg-black text-white shadow-xl scale-105' 
                    : 'text-gray-400 hover:text-black hover:bg-gray-50'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group mb-20">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, role or identifier..."
            className="w-full h-24 pl-20 pr-10 rounded-[3rem] border border-gray-100 bg-white text-base font-bold text-black outline-none focus:ring-8 focus:ring-black/5 transition-all shadow-2xl shadow-gray-200/50"
          />
          <div className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-300">
            <Search size={32} strokeWidth={3} />
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-40 flex flex-col items-center justify-center">
            <InlineLoading label="Synchronizing Identity Registry..." />
          </div>
        ) : !filtered.length ? (
          <div className="py-20">
            <EmptyState title="No Identities Found" message="No user records match your current search criteria." />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="group relative flex flex-col bg-white rounded-[3.5rem] border border-gray-100 overflow-hidden shadow-2xl shadow-gray-200/50 hover:shadow-gray-300/50 hover:-translate-y-3 transition-all duration-700"
              >
                <div className="p-12 space-y-12">
                  <div className="flex items-start justify-between">
                    <button type="button" onClick={() => setSelected(u)} className="flex-1 text-left">
                      <h3 className="text-4xl font-black text-black tracking-tighter leading-none mb-4 group-hover:text-indigo-600 transition-colors">
                        {u.name}
                      </h3>
                      <div className="flex items-center gap-4">
                        <span className="px-5 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                          {u.role}
                        </span>
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                          ID: {u.customId || u.uid.slice(0, 8)}
                        </span>
                      </div>
                    </button>
                    <div className={cn(
                      "w-16 h-16 rounded-[1.8rem] flex items-center justify-center shadow-2xl transition-all group-hover:scale-110",
                      u.isActive ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                    )}>
                      {u.isActive ? <BadgeCheck size={32} /> : <ShieldAlert size={32} />}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setResetTarget(u)}
                      className="h-20 rounded-[2rem] bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-black hover:bg-black hover:text-white transition-all flex items-center justify-center gap-3 group/btn"
                    >
                      <KeyRound size={20} className="group-hover/btn:rotate-12 transition-transform" />
                      Override
                    </button>
                    <button
                      type="button"
                      disabled={busyUid === u.uid}
                      onClick={() => onToggleActive(u)}
                      className={cn(
                        "h-20 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg",
                        u.isActive 
                          ? 'bg-rose-500 text-white shadow-rose-200' 
                          : 'bg-emerald-500 text-white shadow-emerald-200'
                      )}
                    >
                      {u.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      {u.isActive ? 'Suspend' : 'Reinstate'}
                    </button>
                  </div>
                </div>

                {/* Footer Status */}
                <div className={cn(
                  "h-16 border-t border-gray-50 flex items-center px-12 text-[10px] font-black uppercase tracking-[0.25em] transition-colors",
                  u.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                )}>
                  <div className={cn("w-3 h-3 rounded-full mr-4", u.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')} />
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
          <div className="space-y-12 p-6">
            <div className="p-12 rounded-[3.5rem] bg-gray-50 border border-gray-100 shadow-2xl shadow-gray-200/50">
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 mb-6 block">Primary Identity</span>
              <p className="text-5xl font-black text-black uppercase tracking-tighter leading-none">{selected.name}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="p-10 rounded-[2.5rem] bg-white border border-gray-100 shadow-xl shadow-gray-200/50">
                <div className="flex items-center gap-4 mb-5">
                  <Activity size={18} className="text-indigo-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Role</span>
                </div>
                <p className="text-xl font-black text-black uppercase tracking-tight">{selected.role}</p>
              </div>
              <div className="p-10 rounded-[2.5rem] bg-white border border-gray-100 shadow-xl shadow-gray-200/50">
                <div className="flex items-center gap-4 mb-5">
                  <ShieldCheck size={18} className="text-indigo-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Portal</span>
                </div>
                <p className="text-xl font-black text-black uppercase tracking-tight">{selected.portal}</p>
              </div>
            </div>

            <div className="p-12 rounded-[3.5rem] bg-black text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <span className="text-[11px] font-black uppercase tracking-[0.4em] opacity-40 mb-6 block">Universal System UID</span>
                <p className="text-sm font-mono font-bold break-all opacity-80 leading-relaxed">{selected.uid}</p>
              </div>
            </div>
          </div>
        )}
      </ProfileDrawer>

      <ProfileDrawer open={!!resetTarget} onClose={() => setResetTarget(null)} title="Credential Override">
        <div className="space-y-12 p-6">
          <div className="p-10 bg-amber-400 rounded-[3rem] shadow-2xl shadow-amber-200">
            <p className="text-[12px] font-black text-black uppercase tracking-widest leading-relaxed">
              <ShieldAlert className="w-8 h-8 mb-4" strokeWidth={3} />
              Caution: Overriding credentials will immediately revoke all existing sessions in the matrix. Security protocol requires minimum 6 characters.
            </p>
          </div>
          
          <div className="relative">
            <input
              value={newPassword}
              type="password"
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="ENTER NEW SECURITY SEQUENCE"
              className="w-full h-24 px-12 rounded-[3rem] bg-gray-50 border border-gray-100 text-base font-black text-black uppercase tracking-[0.4em] outline-none focus:ring-8 focus:ring-amber-400/20 transition-all shadow-inner"
            />
          </div>

          <button
            type="button"
            disabled={!resetTarget || newPassword.length < 6 || !!busyUid}
            onClick={onReset}
            className="w-full h-24 rounded-[3rem] bg-black text-white text-[12px] font-black uppercase tracking-[0.5em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/20 flex items-center justify-center gap-6 group"
          >
            Authorize Sequence Reset
            <ChevronRight size={24} strokeWidth={4} className="group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </ProfileDrawer>
    </div>
  );
}
