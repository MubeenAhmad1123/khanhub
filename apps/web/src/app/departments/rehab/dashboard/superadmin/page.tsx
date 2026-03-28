'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, 
  CheckCircle, Receipt, ShieldCheck, AlertCircle, XCircle, 
  Loader2, ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useRehabSession();
  
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    activeStaff: 0,
    totalPatients: 0,
    totalUsers: 0,
    income: 0,
    expense: 0,
    net: 0,
  });
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || user.role !== 'superadmin') {
      router.push('/departments/rehab/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [pendingSnap, usersSnap, transSnap, patientsSnap, staffSnap] = await Promise.all([
          getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'pending'))),
          getDocs(collection(db, 'rehab_users')),
          getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'approved'))),
          getDocs(query(collection(db, 'rehab_patients'), where('isActive', '==', true))),
          getDocs(query(collection(db, 'rehab_staff'), where('isActive', '==', true))),
        ]);

        const usersList = usersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        let income = 0;
        let expense = 0;
        transSnap.docs.forEach(d => {
          const tx = d.data();
          if (tx.type === 'income') income += (tx.amount || 0);
          else expense += (tx.amount || 0);
        });

        setAllUsers(usersList);
        setStats({
          pendingApprovals: pendingSnap.size,
          activeStaff: staffSnap.size,
          totalPatients: patientsSnap.size,
          totalUsers: usersSnap.size,
          income,
          expense,
          net: income - expense,
        });
      } catch (err) {
        console.error(err);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router, user, sessionLoading]);

  const handleViewProfile = (u: any) => {
    if (u.role === 'patient') {
      router.push(`/departments/rehab/dashboard/admin/patients/${u.id}`);
    } else if (u.role === 'staff' || u.role === 'admin' || u.role === 'cashier') {
      router.push(`/departments/rehab/dashboard/admin/staff/${u.id}`);
    } else {
      toast.error('Profile view not available for this role');
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-teal-600" />
            Superadmin Control
          </h1>
          <p className="text-gray-400 text-sm mt-1">System-wide overview and user management</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-right hidden sm:block">
             <p className="text-sm font-bold text-gray-900">{user?.displayName}</p>
             <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest">{user?.role}</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold border-2 border-white shadow-sm">
             {user?.displayName?.charAt(0)}
           </div>
        </div>
      </div>

      {/* System Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-50 rounded-full opacity-50 group-hover:scale-110 transition-transform" />
            <TrendingUp className="w-8 h-8 text-green-500 mb-4" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Approved Revenue</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">₨{stats.income.toLocaleString('en-PK')}</h3>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full opacity-50 group-hover:scale-110 transition-transform" />
            <TrendingDown className="w-8 h-8 text-red-400 mb-4" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Approved Expenses</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">₨{stats.expense.toLocaleString('en-PK')}</h3>
         </div>
         <div className="p-6 rounded-3xl border border-teal-500 shadow-xl relative overflow-hidden group bg-teal-600">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full opacity-50 group-hover:scale-110 transition-transform" />
            <DollarSign className="w-8 h-8 text-white/80 mb-4" />
            <p className="text-[10px] font-black text-teal-100 uppercase tracking-widest">Net Cash Balance</p>
            <h3 className="text-2xl font-black text-white mt-1">₨{stats.net.toLocaleString('en-PK')}</h3>
         </div>
      </div>

      {/* Basic Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Patients" value={stats.totalPatients} color="bg-blue-50 text-blue-600" />
        <StatCard label="Total Staff" value={stats.activeStaff} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Pending Approvals" value={stats.pendingApprovals} color="bg-amber-50 text-amber-600" urgent={stats.pendingApprovals > 0} />
        <StatCard label="Total Users" value={stats.totalUsers} color="bg-purple-50 text-purple-600" />
      </div>

      {/* Priority Action */}
      {stats.pendingApprovals > 0 && (
        <Link href="/departments/rehab/dashboard/superadmin/approvals"
          className="flex items-center justify-between bg-amber-500 text-white px-8 py-5 rounded-[2rem] hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 group">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
               <AlertCircle size={24} />
             </div>
             <div>
               <p className="font-black text-lg">{stats.pendingApprovals} Transaction{stats.pendingApprovals > 1 ? 's' : ''} Pending</p>
               <p className="text-amber-100 text-xs font-bold uppercase tracking-widest mt-0.5">Review and approve financial entries now</p>
             </div>
          </div>
          <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
        </Link>
      )}

      {/* Quick Actions Navigation */}
      <div>
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <ArrowRight size={12} className="text-teal-500" /> Navigation Hub
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard icon={<Users size={20} />} title="Manage Users" desc="Create admin or cashier roles" href="/departments/rehab/dashboard/superadmin/users" color="teal" />
          <ActionCard icon={<CheckCircle size={20} />} title="Approval Queue" desc="Financial audit station" href="/departments/rehab/dashboard/superadmin/approvals" color="amber" />
          <ActionCard icon={<Receipt size={20} />} title="Financial Ledger" desc="Global transaction history" href="/departments/rehab/dashboard/admin/finance" color="blue" />
          <ActionCard icon={<Users size={20} />} title="Patient Registry" desc="All patient records history" href="/departments/rehab/dashboard/admin/patients" color="indigo" />
        </div>
      </div>

      {/* All Users Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-white">
          <div>
            <h2 className="font-black text-gray-900 text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-500" />
              Registered Personnel
            </h2>
            <p className="text-xs text-gray-400 font-medium">Manage and view profiles of all system users</p>
          </div>
          <span className="text-[10px] font-black bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-gray-400 uppercase tracking-widest">{allUsers.length} Total Users</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <th className="px-8 py-5">System Identity</th>
                <th className="px-6 py-5">Assigned Role</th>
                <th className="px-6 py-5">Account Status</th>
                <th className="px-6 py-5">Joining Date</th>
                <th className="px-8 py-5 text-right">Profile View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-gray-400 font-black text-sm border border-gray-100 group-hover:scale-110 transition-transform">
                        {u.displayName?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{u.displayName || 'No Name'}</p>
                        <p className="text-[10px] text-gray-400 font-mono truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      u.role === 'superadmin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                      u.role === 'admin' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      u.role === 'cashier' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${u.isActive !== false ? 'text-green-500' : 'text-red-400'}`}>
                       <div className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
                       {u.isActive !== false ? 'Active' : 'Disabled'}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-gray-400 text-xs font-bold uppercase tracking-tighter">
                    {u.createdAt?.toDate?.()
                      ? new Date(u.createdAt.toDate()).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
                      : u.createdAt 
                      ? new Date(u.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) 
                      : '—'}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleViewProfile(u)}
                      className="text-teal-600 hover:text-white font-black text-[10px] uppercase tracking-widest bg-teal-50 hover:bg-teal-600 px-5 py-2.5 rounded-2xl transition-all hover:shadow-lg hover:shadow-teal-100 active:scale-95"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex justify-center mt-12">
         <button onClick={() => { localStorage.removeItem('rehab_session'); router.push('/departments/rehab/login'); }}
           className="bg-white border border-red-100 text-red-500 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-2">
           <XCircle size={16} /> Sign out of system
         </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, urgent }: { label: string; value: any; color: string; urgent?: boolean }) {
  return (
    <div className={`rounded-3xl p-5 border border-transparent transition-all shadow-sm ${color.split(' ')[0]} ${urgent ? 'ring-2 ring-amber-300 shadow-xl shadow-amber-100' : ''}`}>
      <p className={`text-3xl font-black ${color.split(' ')[1]}`}>{value}</p>
      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">{label}</p>
    </div>
  );
}

function ActionCard({ icon, title, desc, href, color }: {
  icon: React.ReactNode; title: string; desc: string; href: string; color: string;
}) {
  const colors: Record<string, string> = {
    teal:   'bg-teal-50 text-teal-600 border-teal-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };
  return (
    <Link href={href}
      className="flex flex-col items-start gap-4 p-6 bg-white rounded-3xl border border-gray-100 transition-all hover:shadow-xl hover:shadow-gray-900/5 group hover:-translate-y-1">
      <div className={`p-3 rounded-2xl transition-all group-hover:scale-110 ${colors[color] || 'bg-gray-50'}`}>
        {icon}
      </div>
      <div>
        <p className="font-black text-gray-900 text-sm tracking-tight">{title}</p>
        <p className="text-gray-400 text-[10px] font-bold mt-1 leading-snug uppercase tracking-widest opacity-80">{desc}</p>
      </div>
    </Link>
  );
}
