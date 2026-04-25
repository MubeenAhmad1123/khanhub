'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  Building2, Briefcase, DollarSign, 
  Clock, Globe, FileText, 
  MessageSquare, Layout, CheckCircle,
  ArrowRight, ShieldCheck, Activity
} from 'lucide-react';
import { Spinner } from '@/components/ui';
import { formatDateDMY } from '@/lib/utils';

export default function ITClientPortalDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('it_session');
    if (!sessionData) { router.push('/departments/it/login'); return; }
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'it_clients', id as string);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setClient({ id: snap.id, ...snap.data() });
      } else {
        router.push('/departments/it/dashboard/client');
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]"><Spinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Client Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/5 pb-10">
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-black tracking-tighter leading-tight uppercase">
              Partner <span className="text-purple-600">Console</span> 🏢
            </h1>
            <p className="text-xs text-gray-400 font-black uppercase tracking-[0.3em] mt-4 flex items-center gap-2">
              <Building2 size={14} className="text-purple-500" />
              {client.companyName} • Technology Management
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="bg-green-50 text-green-700 px-6 py-4 rounded-2xl border border-green-100 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                <p className="text-[10px] font-black uppercase tracking-widest">Active Engagement</p>
             </div>
          </div>
        </div>

        {/* Project Velocity */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
           <div className="bg-white rounded-[3rem] p-8 border border-black/5 shadow-sm">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Active Projects</p>
              <p className="text-4xl font-black text-black">{client.activeProjects || 0}</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-purple-600">
                <Activity size={12} /> Live Ops
              </div>
           </div>
           <div className="bg-white rounded-[3rem] p-8 border border-black/5 shadow-sm">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Completion Rate</p>
              <p className="text-4xl font-black text-black">94%</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-green-600">
                <CheckCircle size={12} /> High Velocity
              </div>
           </div>
           <div className="bg-white rounded-[3rem] p-8 border border-black/5 shadow-sm">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Billing Cycle</p>
              <p className="text-4xl font-black text-black">NET-30</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400">
                <Clock size={12} /> Regular
              </div>
           </div>
           <div className="bg-purple-600 rounded-[3rem] p-8 text-white shadow-2xl shadow-purple-200">
              <p className="text-[9px] font-black text-purple-200 uppercase tracking-widest mb-4">Account Manager</p>
              <p className="text-xl font-black">{client.contactPerson.split(' ')[0]}</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-purple-100">
                <ShieldCheck size={12} /> Verified Partner
              </div>
           </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           <div className="lg:col-span-2 space-y-10">
              {/* Project Tracker */}
              <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm space-y-10">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                       <Layout size={24} />
                    </div>
                    <h2 className="text-xl font-black text-black uppercase tracking-tight">Active Deliverables</h2>
                 </div>

                 <div className="space-y-6">
                    <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:bg-white transition-all">
                       <div className="space-y-1">
                          <p className="text-lg font-black text-black uppercase tracking-tighter">System Infrastructure Audit</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Target: May 2026</p>
                       </div>
                       <div className="flex items-center gap-6">
                          <div className="text-right">
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress</p>
                             <p className="text-sm font-black text-black">75%</p>
                          </div>
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                             <div className="h-full bg-purple-600 w-3/4" />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Financial Records */}
              <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm space-y-10">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white">
                       <DollarSign size={24} />
                    </div>
                    <h2 className="text-xl font-black text-black uppercase tracking-tight">Financial Ledger</h2>
                 </div>
                 
                 <div className="overflow-hidden rounded-2xl border border-black/5">
                    <table className="w-full text-left">
                       <thead className="bg-gray-50">
                          <tr>
                             <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                             <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                             <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          <tr className="hover:bg-gray-50/50 transition-colors">
                             <td className="px-6 py-4 text-xs font-black text-black">INV-2026-004</td>
                             <td className="px-6 py-4 text-xs font-bold text-gray-500">20 APR 2026</td>
                             <td className="px-6 py-4 text-right">
                                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-[9px] font-black uppercase tracking-widest">Paid</span>
                             </td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>

           {/* Sidebar Actions */}
           <div className="space-y-10">
              <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm space-y-10">
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Quick Actions</h3>
                 <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-6 bg-gray-50 rounded-2xl group hover:bg-black hover:text-white transition-all">
                       <span className="text-xs font-black uppercase tracking-widest">Open Ticket</span>
                       <MessageSquare size={18} className="text-purple-600 group-hover:text-white" />
                    </button>
                    <button className="w-full flex items-center justify-between p-6 bg-gray-50 rounded-2xl group hover:bg-black hover:text-white transition-all">
                       <span className="text-xs font-black uppercase tracking-widest">Download Repo</span>
                       <FileText size={18} className="text-purple-600 group-hover:text-white" />
                    </button>
                    <button className="w-full flex items-center justify-between p-6 bg-gray-50 rounded-2xl group hover:bg-black hover:text-white transition-all">
                       <span className="text-xs font-black uppercase tracking-widest">View Analytics</span>
                       <Globe size={18} className="text-purple-600 group-hover:text-white" />
                    </button>
                 </div>
              </div>

              <div className="p-10 bg-indigo-50 rounded-[3rem] border border-indigo-100 flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 mb-6 shadow-sm">
                    <ShieldCheck size={32} />
                 </div>
                 <h4 className="text-lg font-black text-indigo-900 uppercase tracking-tighter mb-2">Secure Portal</h4>
                 <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-relaxed">Your data is encrypted and managed under Khan Hub IT Protocols.</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
