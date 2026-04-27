'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, Eye, EyeOff, Copy, Check, Shield, ArrowLeft, Key, Lock, Search } from 'lucide-react';
import Link from 'next/link';
import { resetPortalUserPassword } from '@/app/hq/actions/resetPortalUserPassword';
import { logoutPortalUser } from '@/app/hq/actions/logoutPortalUser';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

type CredentialUser = {
  id: string;
  name: string;
  customId: string;
  password: string;
  role: string;
  portal: 'hq' | 'rehab' | 'spims' | 'hospital' | 'sukoon' | 'job-center' | 'welfare';
};

const PORTAL_LABELS: Record<CredentialUser['portal'], string> = {
  hq: 'HQ',
  rehab: 'Rehab',
  spims: 'SPIMS',
  hospital: 'Hospital',
  sukoon: 'Sukoon',
  'job-center': 'Job Center',
  welfare: 'Welfare',
};

export default function HqPasswordsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [users, setUsers] = useState<CredentialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<string>('all');
  const [activePortal, setActivePortal] = useState<'all' | CredentialUser['portal']>('all');
  const [search, setSearch] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [loggingOutId, setLoggingOutId] = useState<string | null>(null);

  useEffect(() => {
    const isDark = localStorage.getItem('hq_dark_mode') === 'true';
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;

    const fetchUsers = async () => {
      try {
        const hqSnap = await getDocs(collection(db, 'hq_users'));
        const depts = ['rehab', 'spims', 'hospital', 'sukoon', 'job-center', 'welfare'] as const;
        const deptSnaps = await Promise.all(depts.map(d => getDocs(collection(db, `${d}_users`))));

        const hqUsers = hqSnap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: `hq_${d.id}`,
            name: data.name || data.displayName || 'Unknown',
            customId: data.customId || '-',
            password: data.password || '',
            role: data.role || 'unknown',
            portal: 'hq' as const,
          };
        });

        const deptUsers = depts.flatMap((dept, i) => {
          return deptSnaps[i].docs.map((d) => {
            const data = d.data() as any;
            return {
              id: `${dept}_${d.id}`,
              name: data.displayName || data.name || 'Unknown',
              customId: data.customId || '-',
              password: data.password || '',
              role: data.role || 'unknown',
              portal: dept,
            };
          });
        });

        const merged = [...hqUsers, ...deptUsers] as CredentialUser[];
        merged.sort((a, b) => a.name.localeCompare(b.name));
        setUsers(merged);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchUsers();
  }, [session]);

  const roleOptions = useMemo(() => {
    const roles = Array.from(new Set(users.map((u) => u.role))).sort();
    return ['all', ...roles];
  }, [users]);

  const togglePassword = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (id: string, customId: string, password: string) => {
    const text = `ID: ${customId} | Pass: ${password || '-'}`;
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetPassword = async (u: CredentialUser) => {
    const uid = u.id.includes('_') ? u.id.split('_').slice(1).join('_') : u.id;
    const next = window.prompt(`Enter new password for ${u.customId} (${u.portal.toUpperCase()})`);
    if (!next) return;
    if (next.length < 6) {
      window.alert('Password must be at least 6 characters.');
      return;
    }

    try {
      setResettingId(u.id);
      const res = await resetPortalUserPassword(uid, u.portal, next);
      if (!res.success) {
        window.alert(res.error || 'Failed to reset password.');
        return;
      }
      setUsers((prev) => prev.map((row) => (row.id === u.id ? { ...row, password: next } : row)));
      setVisiblePasswords((prev) => ({ ...prev, [u.id]: true }));
      window.alert('Password reset successful.');
    } catch {
      window.alert('Failed to reset password.');
    } finally {
      setResettingId(null);
    }
  };

  const handleLogout = async (u: CredentialUser) => {
    const uid = u.id.includes('_') ? u.id.split('_').slice(1).join('_') : u.id;
    
    // Safety check: Prevent self-logout from the hub
    if (uid === session?.uid && u.portal === 'hq') {
      window.alert("Security Guard: You cannot remotely log out your own active session from the Credential Hub. Please use the standard logout button if you wish to exit.");
      return;
    }

    if (!window.confirm(`Force logout user ${u.name} (${u.customId})? This will revoke all their active sessions immediately.`)) return;

    try {
      setLoggingOutId(u.id);
      const res = await logoutPortalUser(uid, u.portal);
      if (!res.success) {
        window.alert(res.error || 'Failed to logout user.');
        return;
      }
      window.alert('User tokens revoked successfully. They will be logged out on their next action.');
    } catch {
      window.alert('Failed to logout user.');
    } finally {
      setLoggingOutId(null);
    }
  };

  const filtered = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole = activeRole === 'all' || u.role === activeRole;
      const matchesPortal = activePortal === 'all' || u.portal === activePortal;
      const matchesSearch =
        !searchValue ||
        `${u.name} ${u.customId} ${u.role} ${u.portal}`.toLowerCase().includes(searchValue);
      return matchesRole && matchesPortal && matchesSearch;
    });
  }, [users, activeRole, activePortal, search]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FCFBF8] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" strokeWidth={3} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-gray-900 py-20 px-8">
      <div className="mx-auto max-w-[1400px] space-y-12">
        
        {/* Back Navigation */}
        <Link 
          href="/hq/dashboard/superadmin" 
          className="group inline-flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 hover:text-indigo-600 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          Back to Command Hub
        </Link>

        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-12 mb-20">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-100 relative overflow-hidden group">
              <Shield className="text-white relative z-10 group-hover:scale-110 transition-transform" size={44} strokeWidth={2.5} />
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <h1 className="text-6xl font-black tracking-tighter text-gray-900 uppercase leading-none">Security</h1>
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.6em] text-gray-400 pl-1 italic">
                Centralized Credential Matrix
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 p-4 bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
              <Lock className="w-6 h-6 text-rose-500 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-900">Protocol Active</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Extraction restriction engaged</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          <div className="lg:col-span-5 relative group">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH CREDENTIAL NODE..."
              className="w-full h-24 pl-20 pr-10 rounded-[3rem] border border-gray-100 bg-white text-base font-bold text-gray-900 outline-none focus:ring-8 focus:ring-indigo-600/5 transition-all shadow-2xl shadow-gray-200/50 uppercase tracking-widest placeholder:text-gray-300"
            />
            <div className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-300">
              <Search size={32} strokeWidth={3} />
            </div>
          </div>
          
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex flex-wrap gap-3 p-3 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-x-auto no-scrollbar">
              {roleOptions.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveRole(f)}
                  className={cn(
                    "px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    activeRole === f 
                      ? 'bg-indigo-600 text-white shadow-xl scale-105' 
                      : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                  )}
                >
                  {f === 'all' ? 'All Roles' : f}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 p-3 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-x-auto no-scrollbar">
              {(['all', 'hq', 'rehab', 'spims', 'hospital', 'sukoon', 'job-center', 'welfare'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setActivePortal(p)}
                  className={cn(
                    "px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    activePortal === p 
                      ? 'bg-gray-900 text-white shadow-xl scale-105' 
                      : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {p === 'all' ? 'All Portals' : PORTAL_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Credentials Grid (Desktop) */}
        <div className="hidden xl:block rounded-[3rem] border border-gray-100 bg-white overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-12 py-10 text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 italic">Operator Identity</th>
                <th className="px-10 py-10 text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 italic text-center">Domain</th>
                <th className="px-10 py-10 text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 italic text-center">Rank</th>
                <th className="px-10 py-10 text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 italic">Security ID</th>
                <th className="px-10 py-10 text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 italic">Encryption Key</th>
                <th className="px-12 py-10 text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 italic text-right">Directives</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="group hover:bg-indigo-50/20 transition-colors">
                  <td className="px-12 py-8">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-xl shadow-lg group-hover:scale-110 transition-transform">
                        {u.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xl font-black text-gray-900 uppercase tracking-tighter">{u.name}</span>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1 opacity-60 group-hover:opacity-100 transition-opacity">Active Node</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <span className="px-6 py-2 bg-gray-100 rounded-full text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">
                      {PORTAL_LABELS[u.portal]}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <span className="px-6 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-3 font-black text-[11px] text-gray-900 uppercase tracking-widest">
                      <Shield size={16} className="text-gray-300" />
                      {u.customId}
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 font-mono text-base font-black tracking-[0.2em] text-gray-900 bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100">
                        {visiblePasswords[u.id] ? u.password : '••••••••••••'}
                      </div>
                      <button
                        onClick={() => togglePassword(u.id)}
                        className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all active:scale-95 shadow-sm"
                      >
                        {visiblePasswords[u.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-12 py-8 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <button
                        onClick={() => copyToClipboard(u.id, u.customId, u.password)}
                        className={cn(
                          "h-14 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg active:scale-95",
                          copiedId === u.id
                            ? 'bg-emerald-500 text-white shadow-emerald-100'
                            : 'bg-indigo-600 text-white shadow-indigo-100 hover:scale-105'
                        )}
                      >
                        {copiedId === u.id ? <Check size={16} strokeWidth={4} /> : <Copy size={16} strokeWidth={3} />}
                        {copiedId === u.id ? 'Secured' : 'Extract'}
                      </button>
                      <button
                        onClick={() => handleLogout(u)}
                        disabled={loggingOutId === u.id}
                        className="h-14 px-6 rounded-2xl border border-rose-100 bg-rose-50 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100 transition-all flex items-center gap-3 disabled:opacity-50"
                      >
                        {loggingOutId === u.id ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} strokeWidth={3} />}
                        Revoke
                      </button>
                      <button
                        onClick={() => handleResetPassword(u)}
                        disabled={resettingId === u.id}
                        className="h-14 px-6 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center min-w-[100px] disabled:opacity-50"
                      >
                        {resettingId === u.id ? <Loader2 size={16} className="animate-spin" /> : 'Override'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filtered.length === 0 && (
            <div className="py-40 text-center">
              <p className="text-xl font-black uppercase tracking-[0.5em] text-gray-200">No Authorized Nodes Found</p>
            </div>
          )}
        </div>

        {/* Mobile View (Grid) */}
        <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-8">
          {filtered.map((u) => (
            <div key={u.id} className="p-10 rounded-[3.5rem] border border-gray-100 bg-white shadow-2xl shadow-gray-200/50 flex flex-col gap-10">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[2rem] bg-gray-900 text-white flex items-center justify-center font-black text-3xl shadow-xl">
                  {u.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">{u.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full">{u.role}</span>
                    <span className="px-4 py-1.5 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-full">{PORTAL_LABELS[u.portal]}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-6 rounded-[2rem] bg-gray-50 border border-gray-100">
                   <div className="flex items-center justify-between mb-4">
                     <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Security ID</span>
                     <span className="text-[12px] font-black uppercase tracking-widest text-gray-900">{u.customId}</span>
                   </div>
                   <div className="h-px bg-gray-200 w-full mb-4" />
                   <div className="flex items-center justify-between gap-4">
                     <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Encryption Key</span>
                     <div className="flex items-center gap-3">
                       <span className="font-mono font-black text-gray-900">
                         {visiblePasswords[u.id] ? u.password : '••••••••'}
                       </span>
                       <button onClick={() => togglePassword(u.id)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                         {visiblePasswords[u.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                       </button>
                     </div>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => copyToClipboard(u.id, u.customId, u.password)}
                  className={cn(
                    "h-16 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg",
                    copiedId === u.id ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'
                  )}
                >
                  {copiedId === u.id ? <Check size={18} /> : <Copy size={18} />}
                  {copiedId === u.id ? 'Done' : 'Extract'}
                </button>
                <button
                  onClick={() => handleLogout(u)}
                  disabled={loggingOutId === u.id}
                  className="h-16 rounded-[1.5rem] border border-rose-100 bg-rose-50 text-[10px] font-black uppercase tracking-widest text-rose-600 flex items-center justify-center gap-3"
                >
                  {loggingOutId === u.id ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                  Revoke
                </button>
                <button
                  onClick={() => handleResetPassword(u)}
                  disabled={resettingId === u.id}
                  className="col-span-2 h-16 rounded-[1.5rem] bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                >
                  {resettingId === u.id ? <Loader2 size={18} className="animate-spin" /> : 'Reset Password'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
