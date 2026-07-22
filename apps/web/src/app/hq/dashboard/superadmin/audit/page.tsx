'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { subscribeUnifiedAuditFeed, parseAuditMessage } from '@/lib/hq/superadmin/audit';
import type { UnifiedAuditEntry } from '@/lib/hq/superadmin/types';
import {
  FileText, Search, Filter, RefreshCw, Shield, AlertCircle, Clock, CheckCircle2,
  XCircle, User, ArrowLeft, Loader2, Calendar, Building2
} from 'lucide-react';
import Link from 'next/link';

const SOURCES = [
  { id: 'all', label: 'All Sources' },
  { id: 'hq', label: 'HQ Head Office' },
  { id: 'rehab', label: 'Rehab' },
  { id: 'spims', label: 'SPIMS' },
  { id: 'hospital', label: 'Hospital' },
  { id: 'sukoon', label: 'Sukoon' },
  { id: 'welfare', label: 'Welfare' },
  { id: 'job_center', label: 'Job Center' },
];

export default function SuperadminAuditLogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || searchParams.get('entity') || '';

  const { session, loading: sessionLoading } = useHqSession();
  const [loading, setLoading] = useState(true);
  const [auditList, setAuditList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || !['superadmin', 'manager'].includes(session.role)) {
      router.push('/hq/login');
    }
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);

    const activeSources = selectedSource === 'all'
      ? ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job_center']
      : [selectedSource];

    const unsub = subscribeUnifiedAuditFeed({
      limitCount: 50,
      sources: activeSources,
      onData: (entries) => {
        setAuditList(entries);
        setLoading(false);
      },
      onError: () => {
        setLoading(false);
      },
    });

    return () => unsub();
  }, [session, selectedSource]);

  const filteredLogs = useMemo(() => {
    return auditList.filter((log) => {
      if (selectedAction !== 'all' && log.action !== selectedAction) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const text = `${log.actorName || ''} ${log.readableMessage || ''} ${log.entityLabel || ''} ${log.entityId || ''} ${log.dept || ''}`.toLowerCase();
      return text.includes(q);
    });
  }, [auditList, searchQuery, selectedAction]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Audit Logs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 p-4 md:p-8 pb-32">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link href="/hq/dashboard/superadmin" className="text-slate-400 hover:text-indigo-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <ArrowLeft size={12} /> Dashboard
              </Link>
              <span className="text-slate-300">•</span>
              <span className="text-indigo-600 text-[10px] font-black uppercase tracking-wider">Audit Security</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <Shield className="text-indigo-600" size={28} />
              Security Audit Log
            </h1>
            <p className="text-slate-400 text-xs font-medium">Real-time cross-departmental system activity and event logging</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user, entity ID, action details..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Source Filter */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 outline-none"
            >
              {SOURCES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="all">All Actions</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="created">Created</option>
              <option value="login">Login</option>
              <option value="other">Other Events</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Audit Events ({filteredLogs.length} entries)
            </span>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center opacity-60">
              <FileText size={40} className="text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700 uppercase">No Audit Entries Found</p>
              <p className="text-xs text-slate-400 mt-1">Try broadening your search or resetting filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                return (
                  <div key={log.id} className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xs ${
                        log.action === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                        log.action === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                        log.action === 'login' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                        'bg-indigo-50 text-indigo-600 border border-indigo-200'
                      }`}>
                        {log.action === 'approved' ? <CheckCircle2 size={18} /> :
                         log.action === 'rejected' ? <XCircle size={18} /> :
                         log.action === 'login' ? <User size={18} /> :
                         <FileText size={18} />}
                      </div>

                      <div className="space-y-1">
                        <p className="font-extrabold text-sm text-slate-900 leading-snug">
                          {log.readableMessage}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                          <span className="text-indigo-600">By: {log.actorName}</span>
                          <span>•</span>
                          <span>Dept: {log.dept || log.source}</span>
                          {log.entityId && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500">ID: {log.entityId}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 text-xs font-bold text-slate-400">
                      <span className="flex items-center gap-1.5 sm:justify-end">
                        <Clock size={12} className="text-slate-400" />
                        {log.whenLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
