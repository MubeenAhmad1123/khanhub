'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, Eye, EyeOff, Copy, Check, Shield, Filter, ArrowLeft, Key, Lock, Search } from 'lucide-react';
import Link from 'next/link';

type FilterType = 'all' | 'superadmin' | 'manager' | 'cashier';

export default function HqPasswordsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

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
        const snap = await getDocs(collection(db, 'hq_users'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        list.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setUsers(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [session]);

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (id: string, customId: string, password: string) => {
    const text = `ID: ${customId} | Pass: ${password}`;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = users.filter(u => {
    const matchesFilter = filter === 'all' || u.role === filter;
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                          u.customId.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (sessionLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#0A0A0A]' : 'bg-[#F8FAFC]'}`}>
        <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 pb-20 ${darkMode ? 'bg-[#0A0A0A] text-slate-200' : 'bg-[#F8FAFC] text-slate-600'}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-10">
        
        {/* Back Navigation */}
        <Link 
          href="/hq/dashboard/superadmin" 
          className={`inline-flex items-center gap-2 mb-8 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:gap-3 ${darkMode ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
        >
          <ArrowLeft size={14} />
          Back to Command Center
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <h1 className={`text-4xl font-black flex items-center gap-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <div className={`p-3 rounded-2xl ${darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                <Shield className="text-amber-500" size={32} />
              </div>
              Credential Hub
            </h1>
            <p className={`mt-2 font-black text-xs uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Emergency Access Control Panel
            </p>
          </div>

          <div className={`px-6 py-4 rounded-2xl border backdrop-blur-xl flex items-center gap-4 ${darkMode ? 'bg-amber-500/5 border-amber-500/10' : 'bg-amber-50 border-amber-100'}`}>
            <Lock className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>Security Protocol Active</p>
              <p className={`text-[9px] font-bold ${darkMode ? 'text-amber-500/50' : 'text-amber-600/70'}`}>Screenshotting sensitive data is prohibited</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className={`p-8 rounded-[2.5rem] border backdrop-blur-xl mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${darkMode ? 'bg-[#111111]/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
            <div className="relative group w-full lg:max-w-md">
              <Search className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-600 group-focus-within:text-teal-500' : 'text-slate-400 group-focus-within:text-teal-500'}`} size={18} />
              <input 
                type="text"
                placeholder="Search user by name or ID..."
                className={`w-full border rounded-2xl pl-14 pr-6 py-4 outline-none font-bold text-sm transition-all ${
                  darkMode 
                    ? 'bg-white/5 border-white/5 focus:border-teal-500/50 text-white placeholder:text-slate-700' 
                    : 'bg-slate-50 border-slate-100 focus:border-teal-500/50 text-slate-900 placeholder:text-slate-400'
                }`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex p-1.5 rounded-2xl bg-slate-500/5 border border-slate-500/10">
              {(['all', 'superadmin', 'manager', 'cashier'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                    filter === f
                      ? 'bg-teal-600 text-white shadow-lg'
                      : `${darkMode ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`
                  }`}
                >
                  {f === 'all' ? 'All Roles' : f}
                </button>
              ))}
            </div>
          </div>

          <div className={`px-5 py-3 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest">{filtered.length} Restricted Access Nodes</span>
          </div>
        </div>

        {/* Credentials Table */}
        <div className={`rounded-[2.5rem] border overflow-hidden ${darkMode ? 'bg-[#111111]/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${darkMode ? 'border-white/5 text-slate-500' : 'border-slate-50 text-slate-400'}`}>
                  <th className="px-8 py-6">Operator Node</th>
                  <th className="px-8 py-6">Role Rank</th>
                  <th className="px-8 py-6">Access ID</th>
                  <th className="px-8 py-6">Encryption Key</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                {filtered.map(u => (
                  <tr key={u.id} className={`group transition-all ${darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                          u.role === 'superadmin' ? 'bg-purple-500/10 text-purple-500' :
                          u.role === 'manager' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-teal-500/10 text-teal-500'
                        }`}>
                          {u.name.charAt(0)}
                        </div>
                        <span className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{u.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                        u.role === 'superadmin' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                        u.role === 'manager' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-teal-500/10 text-teal-500 border-teal-500/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className={`flex items-center gap-2 font-mono text-xs font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                        {u.customId}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-all ${darkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                          <Key size={14} />
                        </div>
                        <span className={`font-mono text-sm font-bold tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {visiblePasswords[u.id] ? u.password : '••••••••••••'}
                        </span>
                        <button
                          onClick={() => togglePassword(u.id)}
                          className={`p-2 rounded-xl transition-all ${darkMode ? 'hover:bg-white/10 text-slate-600 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
                        >
                          {visiblePasswords[u.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => copyToClipboard(u.id, u.customId, u.password)}
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          copiedId === u.id
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                            : `${darkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'}`
                        }`}
                      >
                        {copiedId === u.id ? <Check size={14} /> : <Copy size={14} />}
                        {copiedId === u.id ? 'Secured' : 'Extract'}
                      </button>
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