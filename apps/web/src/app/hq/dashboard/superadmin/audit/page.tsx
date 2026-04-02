'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, limit, onSnapshot, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { 
  Loader2, Terminal, Search, Filter, Calendar, 
  User, Activity, Trash2, Edit2, PlusCircle, 
  LogIn, LogOut, ShieldAlert, ChevronRight,
  Code, Clock, Info
} from 'lucide-react';

type TabType = 'hq' | 'rehab' | 'spims';

export default function HqAuditLogPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [activeTab, setActiveTab] = useState<TabType>('hq');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

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
    if (act.includes('create') || act.includes('add')) return <PlusCircle size={14} className="text-emerald-500" />;
    if (act.includes('update') || act.includes('edit')) return <Edit2 size={14} className="text-blue-500" />;
    if (act.includes('delete') || act.includes('remove')) return <Trash2 size={14} className="text-rose-500" />;
    if (act.includes('login') || act.includes('auth')) return <LogIn size={14} className="text-slate-400" />;
    if (act.includes('logout')) return <LogOut size={14} className="text-slate-400" />;
    if (act.includes('error') || act.includes('fail')) return <ShieldAlert size={14} className="text-rose-600" />;
    return <Activity size={14} className="text-teal-500" />;
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
    const matchesFilter = actionFilter === 'all' || (log.action || '').toLowerCase().includes(actionFilter);
    return matchesSearch && matchesFilter;
  });

  const uniqueActions = Array.from(new Set(logs.map(l => l.action?.split('_')[0] || 'other'))).sort();

  if (sessionLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="animate-spin text-teal-500" /></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Terminal className="text-teal-500" size={32} />
              System Audit Logs
            </h1>
            <p className="text-slate-400 mt-1 font-medium text-sm">Security & activity monitoring across all systems</p>
          </div>
          <div className="flex p-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 w-fit">
            {(['hq', 'rehab', 'spims'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? 'bg-teal-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'hq' ? 'HQ Central' : tab === 'rehab' ? 'Rehab Center' : 'SPIMS College'}
              </button>
            ))}
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative group w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-500 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Search by performer or action..."
                className="w-full bg-slate-800/50 border border-slate-700/50 focus:border-teal-500/50 rounded-2xl pl-12 pr-6 py-3 outline-none font-medium text-white transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative group w-full sm:w-48">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-500 transition-colors" size={18} />
              <select 
                className="w-full bg-slate-800/50 border border-slate-700/50 focus:border-teal-500/50 rounded-2xl pl-12 pr-6 py-3 outline-none font-black text-[10px] uppercase tracking-widest text-white transition-all appearance-none"
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
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Clock size={12} />
            Last 100 entries synchronized
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-teal-500" size={32} />
              <p className="text-slate-500 font-bold">Synchronizing log stream...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="bg-slate-800/20 border border-dashed border-slate-700 rounded-3xl py-20 text-center">
              <div className="flex flex-col items-center gap-4 opacity-30">
                <Terminal size={48} />
                <p className="text-lg font-bold">No activity logs found for current filter</p>
              </div>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/60 transition-all group backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getActionIcon(log.action)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-slate-500 text-xs font-bold flex items-center gap-1.5">
                          <ChevronRight size={12} className="text-slate-700" />
                          <User size={12} className="text-teal-500/50" />
                          {log.performedBy}
                        </span>
                        <span className="text-slate-500 text-xs font-bold flex items-center gap-1.5 ml-2">
                          <Clock size={12} className="text-teal-500/50" />
                          {log.createdAt instanceof Timestamp ? log.createdAt.toDate().toLocaleString() : new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="relative group/code">
                        <div className="absolute -left-1 top-0 bottom-0 w-1 bg-teal-500/20 rounded-full group-hover/code:bg-teal-500 transition-colors" />
                        <pre className="pl-4 font-mono text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                  <div className="flex md:flex-col items-center md:items-end justify-between gap-2 border-t md:border-t-0 border-slate-700/50 pt-4 md:pt-0">
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                      <Code size={12} />
                      ID: {log.id.slice(-8).toUpperCase()}
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Info size={16} />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
