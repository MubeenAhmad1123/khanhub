'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { 
  Loader2, Terminal, Search, Filter,
  User, Activity, Trash2, Edit2, PlusCircle, 
  LogIn, LogOut, ShieldAlert, ChevronRight,
  Code, Clock, Info, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

type TabType = 'hq' | 'rehab' | 'spims';

export default function HqAuditLogPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [activeTab, setActiveTab] = useState<TabType>('hq');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('hq_dark_mode') === 'true';
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') {
      router.push('/hq/login');
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;

    setLoading(true);
    const collectionName = activeTab === 'hq' ? 'hq_audit' : activeTab === 'rehab' ? 'rehab_audit' : 'spims_audit';
    
    const q = query(
      collection(db, collectionName),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${activeTab} audit logs:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab, session]);

  const getActionIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('create') || act.includes('add')) return <PlusCircle size={16} className="text-emerald-500" />;
    if (act.includes('update') || act.includes('edit')) return <Edit2 size={16} className="text-blue-500" />;
    if (act.includes('delete') || act.includes('remove')) return <Trash2 size={16} className="text-rose-500" />;
    if (act.includes('login') || act.includes('auth')) return <LogIn size={16} className="text-slate-400" />;
    if (act.includes('logout')) return <LogOut size={16} className="text-slate-400" />;
    if (act.includes('error') || act.includes('fail')) return <ShieldAlert size={16} className="text-rose-600" />;
    return <Activity size={16} className="text-teal-500" />;
  };

  const getActionColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('create') || act.includes('add')) return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';
    if (act.includes('update') || act.includes('edit')) return 'text-blue-500 border-blue-500/20 bg-blue-500/10';
    if (act.includes('delete') || act.includes('remove')) return 'text-rose-500 border-rose-500/20 bg-rose-500/10';
    if (act.includes('login') || act.includes('auth')) return 'text-slate-400 border-slate-400/20 bg-slate-400/10';
    return 'text-teal-500 border-teal-500/20 bg-teal-500/10';
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = (log.performedBy || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (log.action || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = actionFilter === 'all' || (log.action || '').toLowerCase().includes(actionFilter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  const uniqueActions = Array.from(new Set(logs.map(l => l.action?.split('_')[0] || 'other'))).sort();

  if (sessionLoading) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#0A0A0A]' : 'bg-[#F8FAFC]'}`}>
      <Loader2 className="animate-spin text-teal-500 w-8 h-8" />
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-500 pb-20 overflow-x-hidden w-full max-w-full ${darkMode ? 'bg-[#0A0A0A] text-slate-200' : 'bg-[#F8FAFC] text-slate-600'}`}>
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
              <div className={`p-3 rounded-2xl ${darkMode ? 'bg-teal-500/10' : 'bg-teal-50'}`}>
                <Terminal className="text-teal-500" size={32} />
              </div>
              System Audit Logs
            </h1>
            <p className={`mt-2 font-black text-xs uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Security & Activity Data Stream
            </p>
          </div>
          
          <div className={`flex flex-wrap p-1.5 rounded-[1.5rem] border backdrop-blur-xl ${darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-200/50 border-slate-200'}`}>
            {(['hq', 'rehab', 'spims'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20 scale-[1.02]' 
                    : `${darkMode ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`
                }`}
              >
                {tab === 'hq' ? 'HQ Central' : tab === 'rehab' ? 'Rehab Center' : 'SPIMS College'}
              </button>
            ))}
          </div>
        </div>

        {/* Filters & Search */}
        <div className={`p-8 rounded-[2.5rem] border backdrop-blur-xl mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${darkMode ? 'bg-[#111111]/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
            <div className="relative group w-full lg:max-w-md">
              <Search className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-600 group-focus-within:text-teal-500' : 'text-slate-400 group-focus-within:text-teal-500'}`} size={18} />
              <input 
                type="text"
                placeholder="Search performer or action..."
                className={`w-full border rounded-2xl pl-14 pr-6 py-4 outline-none font-bold text-sm transition-all ${
                  darkMode 
                    ? 'bg-white/5 border-white/5 focus:border-teal-500/50 text-white placeholder:text-slate-700' 
                    : 'bg-slate-50 border-slate-100 focus:border-teal-500/50 text-slate-900 placeholder:text-slate-400'
                }`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="relative group w-full sm:w-60">
              <Filter className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-600 group-focus-within:text-teal-500' : 'text-slate-400 group-focus-within:text-teal-500'}`} size={18} />
              <select 
                className={`w-full border rounded-2xl pl-14 pr-10 py-4 outline-none font-black text-[10px] uppercase tracking-widest transition-all appearance-none ${
                  darkMode 
                    ? 'bg-white/5 border-white/5 focus:border-teal-500/50 text-white' 
                    : 'bg-slate-50 border-slate-100 focus:border-teal-500/50 text-slate-900'
                }`}
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="all">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
            <Clock size={14} className="text-teal-500/50" />
            <span className="text-[10px] font-black uppercase tracking-widest">Real-time Sync Active</span>
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-32 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-teal-600 w-12 h-12" />
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-700' : 'text-slate-400'}`}>
                Decoding activity stream...
              </p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className={`rounded-[2.5rem] border border-dashed py-32 text-center ${darkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex flex-col items-center gap-6 opacity-20">
                <Terminal size={64} className={darkMode ? 'text-white' : 'text-slate-900'} />
                <p className={`text-xl font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  No logs detected
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredLogs.map((log) => (
                <div 
                  key={log.id} 
                  className={`group relative overflow-hidden rounded-[1.5rem] border transition-all duration-300 hover:scale-[1.01] ${
                    darkMode 
                      ? 'bg-[#111111]/40 border-white/5 hover:bg-[#111111]/60' 
                      : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-5">
                        <div className={`p-3 rounded-xl mt-1 shrink-0 ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                          {getActionIcon(log.action)}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${getActionColor(log.action)}`}>
                              {log.action}
                            </span>
                            <div className={`flex items-center gap-2 text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              <User size={12} className="text-teal-500/50" />
                              <span className={darkMode ? 'text-white' : 'text-slate-900'}>{log.performedBy}</span>
                            </div>
                            <div className={`flex items-center gap-2 text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                              <Clock size={12} className="text-teal-500/50" />
                              {log.createdAt instanceof Timestamp ? log.createdAt.toDate().toLocaleString() : new Date(log.createdAt).toLocaleString()}
                            </div>
                          </div>
                          
                          <div className={`relative rounded-xl p-4 font-mono text-[11px] leading-relaxed ${darkMode ? 'bg-black/40 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-full ${darkMode ? 'bg-teal-500/20 group-hover:bg-teal-500/50' : 'bg-teal-500/10 group-hover:bg-teal-500/30'} transition-colors`} />
                            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                        <div className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${darkMode ? 'text-slate-700' : 'text-slate-400'}`}>
                          <Code size={12} />
                          LOG_ID: {log.id.slice(-8).toUpperCase()}
                        </div>
                        <div className={`p-2.5 rounded-xl transition-all ${darkMode ? 'bg-white/5 text-slate-500 group-hover:text-teal-400' : 'bg-slate-50 text-slate-400 group-hover:text-teal-600'}`}>
                          <Info size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
