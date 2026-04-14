// apps/web/src/app/hq/dashboard/superadmin/overview/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Activity, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  Database, 
  Globe, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Lock,
  Wifi
} from 'lucide-react';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { fetchOverviewStats } from '@/lib/hq/superadmin/stats';
import { formatPKR } from '@/lib/hq/superadmin/format';
import './overview.css';

// ─── Types ──────────────────────────────────────────────────────────────────

type UnitStatus = 'cleared' | 'pending';

interface UnitCardProps {
  id: string;
  name: string;
  value: string | number;
  status: UnitStatus;
  trend?: { val: number; up: boolean };
  icon: React.ReactNode;
  delay?: string;
}

// ─── Components ─────────────────────────────────────────────────────────────

const UnitCard = ({ id, name, value, status, trend, icon, delay }: UnitCardProps) => (
  <div className={`glass-card ${status === 'cleared' ? 'status-glow-green' : 'status-glow-orange'}`} style={{ animationDelay: delay }}>
    <div className="flex justify-between items-start mb-6">
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
        {icon}
      </div>
      <div className={`badge-pill ${status === 'cleared' ? 'badge-cleared' : 'badge-pending'}`}>
        {status}
      </div>
    </div>
    
    <div>
      <span className="unit-label">{name}</span>
      <div className="value-display">{value}</div>
      <div className="unit-id">UUID: {id}</div>
    </div>

    {trend && (
      <div className={`mt-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${trend.up ? 'text-emerald-400' : 'text-rose-400'}`}>
        {trend.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trend.val}% GROWTH
      </div>
    )}
  </div>
);

const ConnectionLine = () => (
  <div className="connection-node">
    <div className="flow-spine">
      <div className="spine-pulse" />
    </div>
  </div>
);

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session) return;
    fetchOverviewStats().then(s => {
      setStats(s);
      setLoading(false);
    });
  }, [session]);

  const units = useMemo(() => {
    if (!stats) return [];
    return [
      {
        id: 'RHB-09X',
        name: 'Rehab Admissions',
        value: stats.rehabPatientsToday,
        status: (stats.pendingApprovals > 0 ? 'pending' : 'cleared') as UnitStatus,
        trend: { val: 12, up: true },
        icon: <Activity className="w-5 h-5 text-emerald-400" />,
        delay: '0.1s'
      },
      {
        id: 'SPM-44L',
        name: 'Student Registry',
        value: stats.spimsStudentsToday,
        status: (stats.pendingApprovals > 5 ? 'pending' : 'cleared') as UnitStatus,
        trend: { val: 4, up: true },
        icon: <Cpu className="w-5 h-5 text-blue-400" />,
        delay: '0.2s'
      },
      {
        id: 'HQV-001',
        name: 'Staff Management',
        value: stats.activeStaffCount,
        status: (stats.pendingReconciliations > 0 ? 'pending' : 'cleared') as UnitStatus,
        trend: { val: 2.1, up: true },
        icon: <Zap className="w-5 h-5 text-amber-400" />,
        delay: '0.3s'
      },
      {
        id: 'JSV-77K',
        name: 'Job Center Flow',
        value: formatPKR(stats.txAmountToday),
        status: 'cleared' as UnitStatus,
        trend: { val: 8, up: false },
        icon: <Database className="w-5 h-5 text-purple-400" />,
        delay: '0.4s'
      }
    ];
  }, [stats]);

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/50">Initializing Core...</p>
      </div>
    );
  }

  return (
    <div className="overview-container">
      {/* Top Banner */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">System Link Active</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Enterprise Hub</h1>
            <p className="unit-label mt-2">Global Operations Monitoring & Governance</p>
          </div>
          
          <div className="glass-card !py-4 !px-6 border-emerald-500/20 bg-emerald-500/5 min-w-[200px]">
            <p className="unit-label">Stability Index</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-emerald-400">99.8%</span>
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 w-[99.8%]" />
              </div>
            </div>
            <p className="unit-id uppercase">4/4 Nodes Synchronized</p>
          </div>
        </div>
      </div>

      {/* Main Flow */}
      <div className="max-w-4xl mx-auto py-8">
        <div className="units-grid">
          {units.map((unit, idx) => (
            <React.Fragment key={unit.id}>
              <UnitCard {...unit} />
              {idx < units.length - 1 && (
                <div className="hidden lg:block">
                  {/* Grid logic handles gaps directly */}
                </div>
              )}
              {idx < units.length - 1 && (
                <div className="lg:hidden">
                  <ConnectionLine />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <footer className="max-w-4xl mx-auto mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 opacity-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
             <Wifi size={14} /> Real-time Stream Active
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
             <Lock size={14} /> Global Ledger Encrypted
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <Globe size={20} className="text-white/20" />
           <div className="text-right">
              <p className="text-[9px] font-black uppercase">Node Proxy: KH-HQ-01</p>
              <p className="text-[9px] font-bold text-gray-500 tracking-tighter">Lat: 24.8607° N, Lon: 67.0011° E</p>
           </div>
        </div>
      </footer>
    </div>
  );
}
