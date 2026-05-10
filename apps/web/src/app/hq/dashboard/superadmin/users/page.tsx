// apps/web/src/app/hq/dashboard/superadmin/users/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  BadgeCheck,
  Search,
  KeyRound,
  Fingerprint,
  ToggleRight,
  ToggleLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((u) => {
              const deptColor = {
                rehab: 'border-rose-200 bg-rose-50 text-rose-700',
                spims: 'border-sky-200 bg-sky-50 text-sky-700',
                sukoon: 'border-teal-200 bg-teal-50 text-teal-700',
                hospital: 'border-blue-200 bg-blue-50 text-blue-700',
                'job-center': 'border-amber-200 bg-amber-50 text-amber-700',
                welfare: 'border-emerald-200 bg-emerald-50 text-emerald-700',
                'social-media': 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
                hq: 'border-indigo-200 bg-indigo-50 text-indigo-700',
                it: 'border-slate-200 bg-slate-50 text-slate-700',
              }[u.portal as string] || 'border-gray-200 bg-gray-50 text-gray-700';

              return (
                <Link
                  href={`/hq/dashboard/superadmin/staff/${u.id}`}
                  key={u.id}
                  className="group relative flex flex-col bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                          {u.name}
                        </h3>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 truncate">
                          ID: {u.customId || u.uid.slice(0, 8)}
                        </p>
                      </div>
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border",
                        u.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                      )}>
                        {u.isActive ? <BadgeCheck size={20} /> : <ShieldAlert size={20} />}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-6">
                      <span className={cn("px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border", deptColor)}>
                        {u.portal}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-gray-200">
                        {u.role}
                      </span>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setResetTarget(u); }}
                        className="flex items-center justify-center gap-2 h-10 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                      >
                        <KeyRound size={14} />
                        Password
                      </button>
                      <button
                        type="button"
                        disabled={busyUid === u.uid}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleActive(u); }}
                        className={cn(
                          "flex items-center justify-center gap-2 h-10 rounded-xl border text-xs font-bold transition-colors",
                          u.isActive 
                            ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' 
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                        )}
                      >
                        {u.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {u.isActive ? 'Suspend' : 'Active'}
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>


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
