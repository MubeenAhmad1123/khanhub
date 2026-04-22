'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  Terminal, 
  Shield, 
  Cpu,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ItOverviewPage() {
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeSystems: 12,
    openTickets: 4,
    uptime: '99.9%'
  });

  useEffect(() => {
    async function fetchStats() {
      // Fetch IT and Social Media staff count
      const itSnap = await getDocs(collection(db, 'it_users'));
      const mediaSnap = await getDocs(collection(db, 'media_users'));
      setStats(prev => ({
        ...prev,
        totalStaff: itSnap.size + mediaSnap.size
      }));
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Terminal size={14} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Status: Operational</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tightest text-black uppercase">
            IT <span className="text-gray-200">&amp;</span> DIGITAL
          </h1>
          <p className="text-gray-500 mt-2 font-medium max-w-xl text-sm leading-relaxed">
            Centralized management for infrastructure, development, and social media operations across the KhanHub ecosystem.
          </p>
        </div>
        
        <button className="flex items-center gap-2 bg-black text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-black/10">
          <Plus size={16} />
          New Action
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Personnel', value: stats.totalStaff, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active Services', value: stats.activeSystems, icon: Activity, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Network Uptime', value: stats.uptime, icon: Shield, color: 'bg-purple-50 text-purple-600' },
          { label: 'Server Load', value: '12%', icon: Cpu, color: 'bg-orange-50 text-orange-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-gray-100 p-8 rounded-[2rem] hover:border-black transition-colors group">
            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-3xl font-black text-black tracking-tighter">{stat.value}</h3>
              </div>
              <ArrowUpRight size={20} className="text-gray-200 group-hover:text-black transition-colors" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Projects / Recent Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-black tracking-tight uppercase">Recent Activity</h2>
            <button className="text-[10px] font-black text-gray-400 hover:text-black uppercase tracking-widest">View All Logs</button>
          </div>
          
          <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden">
            <div className="divide-y divide-gray-50">
              {[
                { type: 'Update', msg: 'Core security rules synchronized with HQ', time: '2 mins ago', status: 'success' },
                { type: 'Service', msg: 'New social media staff portal initialized', time: '45 mins ago', status: 'info' },
                { type: 'Backup', msg: 'Daily database backup completed successfully', time: '4 hours ago', status: 'success' },
                { type: 'Alert', msg: 'High traffic detected on Job Center portal', time: '6 hours ago', status: 'warning' },
              ].map((log, i) => (
                <div key={i} className="p-6 flex items-center gap-6 hover:bg-gray-50 transition-colors cursor-default">
                  <div className="w-2 h-2 rounded-full bg-black shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-black">{log.msg}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{log.type}</span>
                      <span className="text-[10px] font-medium text-gray-400 italic">• {log.time}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    log.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 
                    log.status === 'warning' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {log.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Tools */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-black tracking-tight uppercase">Quick Tools</h2>
          <div className="grid grid-cols-1 gap-4">
            {[
              { label: 'Sync Users', desc: 'Refresh department mapping' },
              { label: 'Security Audit', desc: 'Scan for access anomalies' },
              { label: 'Clear Cache', desc: 'Purge global CDN cache' },
            ].map((tool, i) => (
              <button key={i} className="w-full text-left p-6 bg-white border border-gray-100 rounded-3xl hover:bg-black group transition-all">
                <p className="text-xs font-black text-black group-hover:text-white uppercase tracking-wider mb-1">{tool.label}</p>
                <p className="text-[10px] text-gray-400 group-hover:text-gray-500 italic">{tool.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
