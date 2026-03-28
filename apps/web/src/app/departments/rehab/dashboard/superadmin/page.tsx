'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useRehabSession();
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    activeStaff: 0,
    totalRevenue: 0,
    totalPatients: 0,
    totalUsers: 0,
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
          getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'approved'), where('type', '==', 'income'))),
          getDocs(query(collection(db, 'rehab_patients'), where('isActive', '==', true))),
          getDocs(query(collection(db, 'rehab_staff'), where('isActive', '==', true))),
        ]);

        const usersList = usersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        setAllUsers(usersList);
        setStats({
          pendingApprovals: pendingSnap.size,
          activeStaff: staffSnap.size,
          totalRevenue: transSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0),
          totalPatients: patientsSnap.size,
          totalUsers: usersSnap.size,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router, user, sessionLoading]);

  if (sessionLoading || loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Welcome, {user?.displayName} 👋</h1>
        <p className="text-gray-400 text-sm mt-1">Super Admin Console — KhanHub Rehab Center</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Patients" value={stats.totalPatients} color="bg-teal-50 text-teal-600" />
        <StatCard label="Total Staff" value={stats.activeStaff} color="bg-blue-50 text-blue-600" />
        <StatCard label="Pending Approvals" value={stats.pendingApprovals} color="bg-orange-50 text-orange-600" urgent={stats.pendingApprovals > 0} />
        <StatCard label="Total Users" value={stats.totalUsers} color="bg-purple-50 text-purple-600" />
      </div>

      {/* Priority Action */}
      {stats.pendingApprovals > 0 && (
        <Link href="/departments/rehab/dashboard/superadmin/approvals"
          className="flex items-center justify-between bg-orange-500 text-white px-6 py-4 rounded-2xl hover:bg-orange-600 transition-colors">
          <div>
            <p className="font-black text-base">⚠️ {stats.pendingApprovals} transaction{stats.pendingApprovals > 1 ? 's' : ''} waiting for your approval</p>
            <p className="text-orange-100 text-xs mt-0.5">Tap to review and approve</p>
          </div>
          <span className="text-2xl">→</span>
        </Link>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-black text-gray-900 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ActionCard
            icon="👥"
            title="Create Admin or Cashier"
            desc="Add new admin accounts or manage the cashier account"
            href="/departments/rehab/dashboard/superadmin/users"
            accent="teal"
          />
          <ActionCard
            icon="✓"
            title="Approve Transactions"
            desc="Review and approve all pending financial entries"
            href="/departments/rehab/dashboard/superadmin/approvals"
            accent="orange"
          />
          <ActionCard
            icon="📋"
            title="Global Reports"
            desc="Generate income, expense and patient reports"
            href="/departments/rehab/dashboard/superadmin/reports"
            accent="purple"
          />
          <ActionCard
            icon="🏥"
            title="Patient Registry"
            desc="View and manage all patient profiles"
            href="/departments/rehab/dashboard/admin/patients"
            accent="blue"
          />
        </div>
      </div>

      {/* All Users Section */}
      <div>
        <h2 className="text-base font-black text-gray-900 uppercase tracking-wider mb-4">All Users</h2>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Name</th>
                  <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Custom ID</th>
                  <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Role</th>
                  <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Status</th>
                  <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Created</th>
                  <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{u.displayName}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{u.customId}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        u.role === 'superadmin' ? 'bg-purple-100 text-purple-600' :
                        u.role === 'admin'      ? 'bg-blue-100 text-blue-600'     :
                        u.role === 'staff'      ? 'bg-teal-100 text-teal-600'     :
                        u.role === 'cashier'    ? 'bg-amber-100 text-amber-600'   :
                        'bg-green-100 text-green-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.isActive ? (
                        <span className="flex items-center gap-1.5 text-green-600 font-bold text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-500 font-bold text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {u.createdAt.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        title="Coming soon" 
                        className="text-teal-500 font-bold hover:underline"
                        onClick={() => alert('View Profile coming soon!')}
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
      </div>
    </div>
  );
}

function StatCard({ label, value, color, urgent }: { label: string; value: any; color: string; urgent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 lg:p-5 ${color.split(' ')[0]} ${urgent ? 'ring-2 ring-orange-300' : ''}`}>
      <p className={`text-2xl lg:text-3xl font-black ${color.split(' ')[1]}`}>{value}</p>
      <p className="text-gray-600 text-xs font-semibold mt-1 leading-tight">{label}</p>
    </div>
  );
}

function ActionCard({ icon, title, desc, href, accent }: {
  icon: string; title: string; desc: string; href: string; accent: string;
}) {
  const accents: Record<string, string> = {
    teal:   'hover:border-teal-200 hover:bg-teal-50',
    orange: 'hover:border-orange-200 hover:bg-orange-50',
    purple: 'hover:border-purple-200 hover:bg-purple-50',
    blue:   'hover:border-blue-200 hover:bg-blue-50',
  };
  return (
    <Link href={href}
      className={`flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-100 transition-all ${accents[accent] || ''}`}>
      <span className="text-2xl mt-0.5">{icon}</span>
      <div>
        <p className="font-bold text-gray-900 text-sm">{title}</p>
        <p className="text-gray-400 text-xs mt-0.5 leading-snug">{desc}</p>
      </div>
    </Link>
  );
}
