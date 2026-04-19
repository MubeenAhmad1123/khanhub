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
    if (!window.confirm(`Force logout user ${u.name} (${u.customId})? This will revoke all their active sessions.`)) return;

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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <Loader2 className="w-10 h-10 animate-spin text-black dark:text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black overflow-x-hidden w-full max-w-full transition-colors duration-500 pb-20 text-black dark:text-white">
      <div className="max-w-full mx-auto px-4 md:px-8 pt-10">
        
        {/* Back Navigation */}
        <Link 
          href="/hq/dashboard/superadmin" 
          className="inline-flex items-center gap-2 mb-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-all hover:gap-3"
        >
          <ArrowLeft size={14} />
          Back to Command Hub
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-10 mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-black dark:text-white flex items-center gap-4 uppercase tracking-tight">
              <div className="p-4 rounded-[1.5rem] bg-black dark:bg-white text-white dark:text-black shadow-xl">
                <Shield className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              Credential Hub
            </h1>
            <p className="mt-4 font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 italic">
              Global Authorization Control System
            </p>
          </div>

          <div className="px-8 py-5 rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black flex flex-col md:flex-row items-center gap-4 text-center md:text-left shadow-sm">
            <Lock className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black dark:text-white">Security Protocol Active</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Extraction of sensitive data is restricted</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 md:p-10 rounded-[3rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black mb-10 flex flex-col gap-6 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="relative group w-full lg:max-w-xl">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={20} />
              <input 
                type="text"
                placeholder="SEARCH CREDENTIAL SEQUENCE..."
                className="w-full border border-gray-100 dark:border-white/10 rounded-[2rem] pl-16 pr-8 py-5 outline-none font-black text-[11px] transition-all bg-gray-50 dark:bg-white/5 text-black dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 uppercase tracking-widest shadow-sm focus:border-black dark:focus:border-white/40"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex-1 w-full lg:w-auto">
              <div className="flex flex-wrap gap-2 p-2 rounded-[2rem] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                {roleOptions.map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveRole(f)}
                    className={`px-5 py-2.5 rounded-[1.5rem] text-[9px] whitespace-nowrap font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm ${
                      activeRole === f
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black transform scale-105 z-10'
                        : 'bg-white dark:bg-black text-gray-400 dark:text-gray-500 border-gray-100 dark:border-white/10 hover:border-black dark:hover:border-white'
                    }`}
                  >
                    {f === 'all' ? 'All Roles' : f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full">
            <div className="flex flex-wrap gap-2 p-2 rounded-[2rem] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
              {(['all', 'hq', 'rehab', 'spims', 'hospital', 'sukoon', 'job-center', 'welfare'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setActivePortal(p)}
                  className={`px-5 py-2.5 rounded-[1.5rem] text-[9px] whitespace-nowrap font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm ${
                    activePortal === p
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black transform scale-105 z-10'
                      : 'bg-white dark:bg-black text-gray-400 dark:text-gray-500 border-gray-100 dark:border-white/10 hover:border-black dark:hover:border-white'
                  }`}
                >
                  {p === 'all' ? 'All Portals' : PORTAL_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Credentials Table */}
        <div className="hidden md:block rounded-[3rem] border border-gray-100 dark:border-white/10 overflow-hidden bg-white dark:bg-black shadow-2xl">
          <div className="overflow-x-auto w-full scrollbar-none">
            <table className="min-w-[700px] w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest border-b border-gray-50 dark:border-white/5 text-gray-400 dark:text-gray-500 italic">
                  <th className="px-10 py-8">Operator Node</th>
                  <th className="px-10 py-8 text-center">Portal</th>
                  <th className="px-10 py-8 text-center">Security Rank</th>
                  <th className="px-10 py-8">Access ID</th>
                  <th className="px-10 py-8">Encryption Key</th>
                  <th className="px-10 py-8 text-right">Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center font-black text-sm bg-black dark:bg-white text-white dark:text-black shadow-sm">
                          {u.name.charAt(0)}
                        </div>
                        <span className="text-base font-black text-black dark:text-white uppercase tracking-tight">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        {PORTAL_LABELS[u.portal]}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-black dark:text-white">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-3 font-black text-[10px] text-gray-400 uppercase tracking-widest">
                        <Shield size={14} className="opacity-40" />
                        {u.customId}
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4 group">
                        <span className="font-mono text-sm font-black tracking-widest text-black dark:text-white bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-gray-100 dark:border-white/5">
                          {visiblePasswords[u.id] ? u.password : '••••••••••••'}
                        </span>
                        <button
                          onClick={() => togglePassword(u.id)}
                          className="p-3 rounded-2xl bg-white dark:bg-black border border-gray-100 dark:border-white/10 text-gray-400 hover:text-black dark:hover:text-white transition-all active:scale-95 shadow-sm"
                        >
                          {visiblePasswords[u.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => copyToClipboard(u.id, u.customId, u.password)}
                          className={`inline-flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm ${
                            copiedId === u.id
                              ? 'bg-black text-white dark:bg-white dark:text-black'
                              : 'bg-black text-white dark:bg-white dark:text-black hover:scale-105'
                          }`}
                        >
                          {copiedId === u.id ? <Check size={14} /> : <Copy size={14} />}
                          {copiedId === u.id ? 'Secured' : 'Extract'}
                        </button>
                        <button
                          onClick={() => handleLogout(u)}
                          disabled={loggingOutId === u.id}
                          className="px-6 py-4 rounded-2xl border border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          {loggingOutId === u.id ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={14} />}
                          Logout
                        </button>
                        <button
                          onClick={() => handleResetPassword(u)}
                          disabled={resettingId === u.id}
                          className="px-6 py-4 rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-black text-[10px] font-black uppercase tracking-widest text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {resettingId === u.id ? <Loader2 size={16} className="animate-spin" /> : 'Reset'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filtered.length === 0 && (
            <div className={`p-20 text-center ${darkMode ? 'bg-white/[0.02]' : 'bg-slate-50/50'}`}>
              <p className="text-xs font-black uppercase tracking-[0.3em] opacity-20">Access Denied: No Matching Nodes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}