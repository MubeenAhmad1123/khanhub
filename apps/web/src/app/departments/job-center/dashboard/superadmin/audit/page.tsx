'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import {
  Activity, UserPlus, Heart, CheckCircle, XCircle,
  Calendar, Shield, UserCog, Loader2, Filter, Clock
} from 'lucide-react';

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'user_created', label: 'User Created' },
  { value: 'staff_created', label: 'Staff Created' },
  { value: 'seeker_added', label: 'Seeker Added' },
  { value: 'transaction_approved', label: 'Transaction Approved' },
  { value: 'transaction_rejected', label: 'Transaction Rejected' },
  { value: 'attendance_overridden', label: 'Attendance Overridden' },
  { value: 'password_reset', label: 'Password Reset' },
  { value: 'user_deactivated', label: 'User Deactivated' },
];

function getActionIcon(action: string) {
  const cls = 'w-5 h-5';
  switch (action) {
    case 'user_created': return <UserPlus className={`${cls} text-blue-500`} />;
    case 'staff_created': return <UserCog className={`${cls} text-orange-500`} />;
    case 'seeker_added': return <Heart className={`${cls} text-orange-600`} />;
    case 'transaction_approved': return <CheckCircle className={`${cls} text-green-500`} />;
    case 'transaction_rejected': return <XCircle className={`${cls} text-red-500`} />;
    case 'attendance_overridden': return <Calendar className={`${cls} text-amber-500`} />;
    case 'password_reset': return <Shield className={`${cls} text-purple-500`} />;
    case 'user_deactivated': return <UserCog className={`${cls} text-gray-400`} />;
    default: return <Activity className={`${cls} text-gray-400`} />;
  }
}

function getActionColor(action: string) {
  switch (action) {
    case 'user_created': return 'bg-blue-50 border-blue-200';
    case 'staff_created': return 'bg-orange-50 border-orange-200';
    case 'seeker_added': return 'bg-orange-50 border-orange-200';
    case 'transaction_approved': return 'bg-green-50 border-green-200';
    case 'transaction_rejected': return 'bg-red-50 border-red-200';
    case 'attendance_overridden': return 'bg-amber-50 border-amber-200';
    case 'password_reset': return 'bg-purple-50 border-purple-200';
    case 'user_deactivated': return 'bg-gray-50 border-gray-200';
    default: return 'bg-gray-50 border-gray-200';
  }
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function relativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AuditLogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) { router.push('/departments/job-center/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'superadmin') { router.push('/departments/job-center/login'); return; }
    fetchAudit('');
  }, [router]);

  const fetchAudit = async (actionFilter: string) => {
    try {
      setLoading(true);
      let q;
      if (actionFilter) {
        q = query(
          collection(db, 'jobcenter_audit'),
          where('action', '==', actionFilter),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      } else {
        q = query(
          collection(db, 'jobcenter_audit'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      }
      const snap = await getDocs(q);
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Audit fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (val: string) => {
    setFilter(val);
    fetchAudit(val);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-orange-600" /> Audit Log
          </h1>
          <p className="text-sm text-gray-500 mt-1">Full activity history — last 50 entries</p>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-bold uppercase tracking-widest sm:hidden">Filter Actions</span>
          </div>
          <select
            value={filter}
            onChange={e => handleFilterChange(e.target.value)}
            className="w-full sm:w-64 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
          >
            {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No audit entries yet.</p>
            <p className="text-sm text-gray-400 mt-1">Activity will appear here as actions are performed.</p>
          </div>
        ) : (
          <div className="relative space-y-3">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200 hidden sm:block" />
            {entries.map(entry => {
              const date = entry.createdAt?.toDate?.() || new Date();
              const detailStr = Object.entries(entry.details || {})
                .map(([k, v]) => `${k}: ${v}`)
                .join(' | ');

              return (
                <div key={entry.id} className="flex gap-4 sm:pl-12 relative">
                  <div className={`hidden sm:flex absolute left-0 top-3 w-12 h-12 rounded-full items-center justify-center border-2 flex-shrink-0 ${getActionColor(entry.action)}`}>
                    {getActionIcon(entry.action)}
                  </div>

                  <div className={`flex-1 bg-white rounded-2xl border shadow-sm p-4 ${getActionColor(entry.action)}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="sm:hidden">{getActionIcon(entry.action)}</span>
                        <span className="font-black text-gray-900 text-sm uppercase tracking-tight">{formatAction(entry.action)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <Clock className="w-3 h-3" />
                        <span title={date.toLocaleString()}>{relativeTime(date)}</span>
                        <span className="text-gray-300 hidden sm:inline">·</span>
                        <span className="hidden sm:inline">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs">
                      <p className="text-gray-500">
                        Performed by: <span className="font-black text-gray-800">{entry.performedBy}</span>
                      </p>
                      {detailStr && (
                        <p className="text-gray-400 leading-relaxed bg-black/5 p-2 rounded-lg italic">
                          {detailStr}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

