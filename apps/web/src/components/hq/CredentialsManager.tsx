'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import {
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Shield,
  ArrowLeft,
  Lock,
  Search,
  LogOut,
  RefreshCw,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { resetPortalUserPassword } from '@/app/hq/actions/resetPortalUserPassword';
import { logoutPortalUser } from '@/app/hq/actions/logoutPortalUser';

export type CredentialUser = {
  id: string;
  name: string;
  customId: string;
  password: string;
  role: string;
  portal: 'hq' | 'rehab' | 'spims' | 'hospital' | 'sukoon' | 'job-center' | 'welfare' | 'social-media' | 'it';
};

const PORTAL_LABELS: Record<CredentialUser['portal'], string> = {
  hq: 'HQ',
  rehab: 'Rehab',
  spims: 'SPIMS',
  hospital: 'Hospital',
  sukoon: 'Sukoon',
  'job-center': 'Job Center',
  welfare: 'Welfare',
  'social-media': 'Social Media',
  it: 'IT',
};

const ROLE_LABELS: Record<string, string> = {
  all: 'All Access',
  staff: 'Staff',
  student: 'Student',
  client: 'Client',
  family: 'Family',
  superadmin: 'Super Admin',
  manager: 'Manager',
};

const isStaffRole = (role: string): boolean => {
  const r = role.toLowerCase();
  return r !== 'family' && r !== 'superadmin' && r !== 'manager' && r !== 'student' && r !== 'client' && r !== 'other';
};

interface CredentialsManagerProps {
  mode: 'superadmin' | 'manager';
  backPath: string;
}

export default function CredentialsManager({ mode, backPath }: CredentialsManagerProps) {
  const { session, loading: sessionLoading } = useHqSession();
  const [users, setUsers] = useState<CredentialUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeRole, setActiveRole] = useState<string>('all');
  const [activePortal, setActivePortal] = useState<'all' | CredentialUser['portal']>('all');
  const [search, setSearch] = useState('');
  
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [visibleSecurityIds, setVisibleSecurityIds] = useState<Record<string, boolean>>({});
  
  const [copiedType, setCopiedType] = useState<{ id: string; type: 'id' | 'pass' } | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [loggingOutId, setLoggingOutId] = useState<string | null>(null);

  // Pre-set staff filter for managers upon initial load if 'staff' exists
  const [initializedRole, setInitializedRole] = useState(false);

  const isAdmin = mode === 'superadmin';

  useEffect(() => {
    if (!session) return;

    const fetchUsers = async () => {
      try {
        const hqSnap = await getDocs(collection(db, 'hq_users'));
        
        const deptConfigs = [
          { key: 'rehab', collectionName: 'rehab_users' },
          { key: 'spims', collectionName: 'spims_users' },
          { key: 'hospital', collectionName: 'hospital_users' },
          { key: 'sukoon', collectionName: 'sukoon_users' },
          { key: 'welfare', collectionName: 'welfare_users' },
          { key: 'job-center', collectionName: 'jobcenter_users' },
          { key: 'social-media', collectionName: 'media_users' },
          { key: 'it', collectionName: 'it_users' }
        ] as const;

        const snaps = await Promise.all(
          deptConfigs.map((cfg) => getDocs(collection(db, cfg.collectionName)))
        );

        const hqUsers = hqSnap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: `hq_${d.id}`,
            name: data.name || data.displayName || 'Unknown',
            customId: data.customId || '-',
            password: data.password || '',
            role: data.role?.toLowerCase() || 'unknown',
            portal: 'hq' as const,
          };
        });

        const deptUsers = deptConfigs.flatMap((cfg, idx) => {
          return snaps[idx].docs.map((d) => {
            const data = d.data() as any;
            return {
              id: `${cfg.key}_${d.id}`,
              name: data.displayName || data.name || 'Unknown',
              customId: data.customId || '-',
              password: data.password || '',
              role: data.role?.toLowerCase() || 'unknown',
              portal: cfg.key,
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
    const hasFamily = users.some(u => u.role === 'family');
    const hasSuperAdmin = users.some(u => u.role === 'superadmin');
    const hasManager = users.some(u => u.role === 'manager');
    const hasStaff = users.some(u => isStaffRole(u.role));
    const hasStudent = users.some(u => u.role === 'student');
    const hasClient = users.some(u => u.role === 'client');

    const options = ['all'];
    if (hasStaff) options.push('staff');
    if (hasStudent) options.push('student');
    if (hasClient) options.push('client');
    if (hasFamily) options.push('family');
    if (hasSuperAdmin) options.push('superadmin');
    if (hasManager) options.push('manager');
    return options;
  }, [users]);

  // Automatically select 'staff' role for managers if it's available once data loads
  useEffect(() => {
    if (loading || initializedRole) return;
    if (mode === 'manager' && users.length > 0) {
      const hasStaff = users.some(u => isStaffRole(u.role));
      if (hasStaff) {
        setActiveRole('staff');
      }
      setInitializedRole(true);
    }
  }, [loading, mode, users, initializedRole]);

  const handleCopy = (id: string, text: string, type: 'id' | 'pass') => {
    void navigator.clipboard.writeText(text || '-');
    setCopiedType({ id, type });
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleResetPassword = async (u: CredentialUser) => {
    if (!isAdmin) return;
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
    if (!isAdmin) return;
    const uid = u.id.includes('_') ? u.id.split('_').slice(1).join('_') : u.id;
    
    if (uid === session?.uid && u.portal === 'hq') {
      window.alert("You cannot remotely log out your own active session. Use standard logout.");
      return;
    }

    if (!window.confirm(`Force logout user ${u.name} (${u.customId})?`)) return;

    try {
      setLoggingOutId(u.id);
      const res = await logoutPortalUser(uid, u.portal);
      if (!res.success) {
        window.alert(res.error || 'Failed to logout user.');
        return;
      }
      window.alert('User tokens revoked successfully.');
    } catch {
      window.alert('Failed to logout user.');
    } finally {
      setLoggingOutId(null);
    }
  };

  const togglePassword = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSecurityId = (id: string) => {
    setVisibleSecurityIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    
    // Apply filters
    let res = users.filter((u) => {
      const matchesRole =
        activeRole === 'all' ||
        (activeRole === 'staff'
          ? isStaffRole(u.role)
          : u.role === activeRole);
      const matchesPortal = activePortal === 'all' || u.portal === activePortal;
      const matchesSearch =
        !searchValue ||
        `${u.name} ${u.customId} ${u.role} ${u.portal}`.toLowerCase().includes(searchValue);
      return matchesRole && matchesPortal && matchesSearch;
    });

    // Extra tweak: if manager and activeRole is "all", we put "staff" roles first
    if (mode === 'manager' && activeRole === 'all') {
      res = [...res].sort((a, b) => {
        const aIsStaff = isStaffRole(a.role);
        const bIsStaff = isStaffRole(b.role);
        if (aIsStaff && !bIsStaff) return -1;
        if (!aIsStaff && bIsStaff) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return res;
  }, [users, activeRole, activePortal, search, mode]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-neutral-200 opacity-75 scale-150" />
          <Loader2 className="w-10 h-10 animate-spin text-neutral-800 relative z-10" />
        </div>
        <p className="mt-6 text-[10px] font-bold tracking-[0.3em] text-neutral-400 uppercase">Authenticating Secure Channel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] selection:bg-neutral-900 selection:text-white py-12 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Compact Navigation */}
        <Link 
          href={backPath}
          className="inline-flex items-center gap-3 group mb-10 px-4 py-2 rounded-full bg-white border border-neutral-200/60 hover:border-neutral-300 transition-all shadow-sm"
        >
          <ArrowLeft size={16} className="text-neutral-500 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Return to Base</span>
        </Link>

        {/* Clean Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-neutral-800">
              <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-neutral-900/20">
                <Shield size={20} strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">Security Vault</h1>
            </div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.4em] pl-13 flex items-center gap-2 mt-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/>
              {isAdmin ? "Administrative Access Level" : "Manager Access View"}
            </p>
          </div>
          
          {/* Stats / Badge */}
          <div className="flex items-center gap-4 px-5 py-3 bg-white rounded-2xl border border-neutral-200/60 shadow-sm self-start lg:self-center">
            <Lock size={16} className="text-neutral-400" />
            <div>
              <div className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Tracked Entities</div>
              <div className="text-lg font-black text-neutral-800 leading-none">{users.length}</div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] p-6 sm:p-8 mb-8">
          <div className="flex flex-col gap-6">
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID, or role..."
                className="w-full h-14 pl-14 pr-6 rounded-xl bg-neutral-50 border border-neutral-200/70 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all placeholder:text-neutral-400 placeholder:font-normal"
              />
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Role Filter */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Authority Level</label>
                <div className="flex flex-wrap gap-2">
                  {roleOptions.map((r) => (
                    <button
                      key={r}
                      onClick={() => setActiveRole(r)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                        activeRole === r
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-md shadow-neutral-900/10 scale-105"
                          : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                      )}
                    >
                      {ROLE_LABELS[r] || r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Portal Filter */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Department Node</label>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'hq', 'rehab', 'spims', 'hospital', 'sukoon', 'job-center', 'welfare', 'social-media', 'it'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setActivePortal(p)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                        activePortal === p
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-md shadow-neutral-900/10 scale-105"
                          : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                      )}
                    >
                      {p === 'all' ? 'All Sectors' : PORTAL_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-3xl border border-neutral-200/60 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100">
                <th className="pl-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Profile</th>
                <th className="px-6 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Credentials</th>
                {isAdmin && <th className="pr-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Protocols</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((u) => (
                <tr key={u.id} className="group hover:bg-neutral-50/50 transition-colors">
                  {/* Name, Role, Portal */}
                  <td className="pl-8 py-6 align-top">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center font-black text-lg border border-neutral-200 shadow-sm flex-shrink-0 uppercase">
                        {u.name.charAt(0)}
                      </div>
                      <div className="space-y-1.5">
                        <div className="font-bold text-[15px] text-neutral-900 flex items-center gap-2">
                          {u.name}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-0.5 bg-neutral-900 text-white text-[9px] font-black uppercase tracking-wider rounded">
                            {u.role}
                          </span>
                          <span className="px-2 py-0.5 bg-white border border-neutral-200 text-neutral-600 text-[9px] font-bold uppercase tracking-wider rounded">
                            {PORTAL_LABELS[u.portal]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Credentials Cell */}
                  <td className="px-6 py-6">
                    <div className="space-y-3 max-w-md">
                      
                      {/* USER ID ROW */}
                      <div className="flex items-center justify-between bg-neutral-50 rounded-xl p-3 border border-neutral-200/60">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <User size={14} className="text-neutral-400 flex-shrink-0" />
                          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest flex-shrink-0">ID:</span>
                          <span className="font-mono text-[13px] font-bold text-neutral-800 tracking-wide truncate">
                            {visibleSecurityIds[u.id] ? u.customId : '••••••••'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 pl-4">
                          <button 
                            onClick={() => toggleSecurityId(u.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-200/50 text-neutral-500 transition-colors"
                          >
                            {visibleSecurityIds[u.id] ? <EyeOff size={14}/> : <Eye size={14}/>}
                          </button>
                          <button 
                            onClick={() => handleCopy(u.id, u.customId, 'id')}
                            className={cn(
                              "w-8 h-8 flex items-center justify-center rounded-lg transition-all",
                              copiedType?.id === u.id && copiedType.type === 'id' 
                                ? "bg-emerald-500 text-white" 
                                : "hover:bg-neutral-200/50 text-neutral-500"
                            )}
                          >
                            {copiedType?.id === u.id && copiedType.type === 'id' ? <Check size={14}/> : <Copy size={14}/>}
                          </button>
                        </div>
                      </div>

                      {/* PASSWORD ROW */}
                      <div className="flex items-center justify-between bg-neutral-50 rounded-xl p-3 border border-neutral-200/60">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <Lock size={14} className="text-neutral-400 flex-shrink-0" />
                          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest flex-shrink-0">PASS:</span>
                          <span className="font-mono text-[13px] font-bold text-neutral-800 tracking-wide truncate">
                            {visiblePasswords[u.id] ? u.password : '••••••••'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 pl-4">
                          <button 
                            onClick={() => togglePassword(u.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-200/50 text-neutral-500 transition-colors"
                          >
                            {visiblePasswords[u.id] ? <EyeOff size={14}/> : <Eye size={14}/>}
                          </button>
                          <button 
                            onClick={() => handleCopy(u.id, u.password, 'pass')}
                            className={cn(
                              "w-8 h-8 flex items-center justify-center rounded-lg transition-all",
                              copiedType?.id === u.id && copiedType.type === 'pass' 
                                ? "bg-emerald-500 text-white" 
                                : "hover:bg-neutral-200/50 text-neutral-500"
                            )}
                          >
                            {copiedType?.id === u.id && copiedType.type === 'pass' ? <Check size={14}/> : <Copy size={14}/>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Admin Actions */}
                  {isAdmin && (
                    <td className="pr-8 py-6 text-right align-middle">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleLogout(u)}
                          disabled={loggingOutId === u.id}
                          title="Revoke Sessions"
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
                        >
                          {loggingOutId === u.id ? <Loader2 size={16} className="animate-spin"/> : <LogOut size={16} />}
                        </button>
                        <button
                          onClick={() => handleResetPassword(u)}
                          disabled={resettingId === u.id}
                          className="h-10 px-4 flex items-center gap-2 rounded-xl bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all disabled:opacity-50 shadow-sm"
                        >
                          {resettingId === u.id ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14} />}
                          <span>Reset</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-50 mb-4 border border-neutral-100">
                <User size={24} className="text-neutral-300" />
              </div>
              <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">No entities found within criteria.</p>
            </div>
          )}
        </div>

        {/* Mobile/Card View */}
        <div className="md:hidden grid grid-cols-1 gap-4">
          {filtered.map((u) => (
            <div key={u.id} className="bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-sm flex flex-col gap-5">
              
              {/* Mobile Head */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center justify-center font-black text-xl uppercase flex-shrink-0">
                  {u.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-neutral-900 leading-tight">{u.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-neutral-900 text-white text-[8px] font-black uppercase tracking-wider rounded">
                      {u.role}
                    </span>
                    <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-[8px] font-bold uppercase tracking-wider rounded">
                      {PORTAL_LABELS[u.portal]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Credentials Area */}
              <div className="space-y-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-200/50">
                
                {/* Mobile User ID */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">ID</span>
                    <span className="font-mono text-[13px] font-bold text-neutral-800 ml-1">
                      {visibleSecurityIds[u.id] ? u.customId : '••••••••'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                     <button 
                        onClick={() => toggleSecurityId(u.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400"
                      >
                        {visibleSecurityIds[u.id] ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                      <button 
                        onClick={() => handleCopy(u.id, u.customId, 'id')}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-lg",
                          copiedType?.id === u.id && copiedType.type === 'id' ? "bg-emerald-500 text-white" : "text-neutral-400"
                        )}
                      >
                        {copiedType?.id === u.id && copiedType.type === 'id' ? <Check size={14}/> : <Copy size={14}/>}
                      </button>
                  </div>
                </div>

                <div className="h-[1px] bg-neutral-200/50 w-full" />

                {/* Mobile Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">KEY</span>
                    <span className="font-mono text-[13px] font-bold text-neutral-800 ml-1">
                      {visiblePasswords[u.id] ? u.password : '••••••••'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                     <button 
                        onClick={() => togglePassword(u.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400"
                      >
                        {visiblePasswords[u.id] ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                      <button 
                        onClick={() => handleCopy(u.id, u.password, 'pass')}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-lg",
                          copiedType?.id === u.id && copiedType.type === 'pass' ? "bg-emerald-500 text-white" : "text-neutral-400"
                        )}
                      >
                        {copiedType?.id === u.id && copiedType.type === 'pass' ? <Check size={14}/> : <Copy size={14}/>}
                      </button>
                  </div>
                </div>
              </div>

              {/* Mobile/Card Actions */}
              {isAdmin && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
                   <button
                      onClick={() => handleLogout(u)}
                      disabled={loggingOutId === u.id}
                      className="h-12 flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-600 text-[10px] font-black uppercase tracking-widest"
                    >
                      {loggingOutId === u.id ? <Loader2 size={16} className="animate-spin"/> : <LogOut size={16} />}
                      <span>Logout</span>
                    </button>
                    <button
                      onClick={() => handleResetPassword(u)}
                      disabled={resettingId === u.id}
                      className="h-12 flex items-center justify-center gap-2 rounded-xl bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest shadow-sm"
                    >
                      {resettingId === u.id ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14} />}
                      <span>Reset</span>
                    </button>
                </div>
              )}

            </div>
          ))}
          {filtered.length === 0 && (
             <div className="py-12 text-center bg-white border border-neutral-200/60 rounded-3xl">
               <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">No matching results</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
