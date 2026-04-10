// apps/web/src/app/hq/dashboard/superadmin/staff/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { fetchStaffProfile, StaffProfile } from '@/lib/hq/superadmin/staff';
import { 
  ArrowLeft, 
  MapPin, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  CreditCard, 
  Award, 
  AlertTriangle,
  User,
  ExternalLink,
  History,
  Edit2,
  Lock,
  LogIn
} from 'lucide-react';
import { toDate } from '@/lib/utils';
import { EditStaffModal } from '@/components/hq/superadmin/EditStaffModal';
import { ResetPasswordModal } from '@/components/hq/superadmin/ResetPasswordModal';

export default function SuperadminStaffProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  
  // Modals
  const [showEdit, setShowEdit] = useState(false);
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) {
      router.push('/hq/login');
      return;
    }
    const isSuper = session.role === 'superadmin';
    const isManager = session.role === 'manager';
    
    if (!isSuper && !isManager) {
      router.push('/hq/login');
    }
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session) return;
    loadData();
  }, [session, params.id]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchStaffProfile(params.id);
      setStaff(data);
    } catch (err) {
      console.error('Failed to load staff profile:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleImpersonate = () => {
    if (!staff) return;
    if (!confirm(`Warning: You will be logged into ${staff.name}'s account. Your current session will be replaced. Continue?`)) return;

    // Save current session to restore later? (Optional complex feature)
    // For now, just replace
    const portalKey = staff.dept === 'hq' ? 'hq_session' : `${staff.dept}_session`;
    const impersonatedSession = {
      uid: staff.staffId,
      displayName: staff.name,
      role: staff.role,
      dept: staff.dept,
      customId: staff.customId
    };

    localStorage.setItem(portalKey, JSON.stringify(impersonatedSession));
    
    // Redirect to the portal
    const url = staff.dept === 'hq' ? '/hq/dashboard' : `/departments/${staff.dept}/dashboard`;
    window.location.href = url;
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <InlineLoading label="Consulting staff records..." />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <EmptyState 
          title="Staff Not Found" 
          message={`We couldn't find a staff member with ID "${params.id}". They may have been moved or deleted.`} 
        />
        <div className="mt-8 text-center">
          <Link
            href="/hq/dashboard/superadmin/staff"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  const joinDate = staff.joiningDate ? toDate(staff.joiningDate) : null;
  const lastLogin = staff.lastLoginAt ? toDate(staff.lastLoginAt) : null;

  // Permission Checks for UI
  const isSuperadmin = session?.role === 'superadmin';
  const isManager = session?.role === 'manager';
  const canEdit = isSuperadmin || (isManager && (staff.role === 'staff' || staff.role === 'cashier'));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      {/* Top Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href={isSuperadmin ? "/hq/dashboard/superadmin/staff" : "/hq/dashboard/manager/staff"}
          className="group flex items-center gap-2 text-sm font-bold text-gray-500 transition-colors hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 transition-colors group-hover:bg-orange-50 dark:bg-white/5 dark:group-hover:bg-orange-950/30">
            <ArrowLeft className="h-4 w-4" />
          </div>
          Back to Directory
        </Link>
        <div className="flex items-center gap-3">
          {canEdit && (
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-black hover:scale-105 active:scale-95 dark:bg-orange-600 dark:hover:bg-orange-500"
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </button>
          )}
          <Link 
            href={`/hq/dashboard/superadmin/audit?entity=${staff.name}`}
            className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-gray-600 transition-all hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
          >
            <History className="h-3 w-3" />
            Activity Log
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Profile Sidebar */}
        <div className="space-y-6 lg:col-span-1">
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/50 dark:border-white/5 dark:bg-[#111] dark:shadow-none">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-orange-500 to-rose-600 text-4xl font-black text-white shadow-2xl">
                  {staff.photoUrl ? (
                    <img src={staff.photoUrl} alt={staff.name} className="h-full w-full object-cover" />
                  ) : (
                    staff.name.charAt(0)
                  )}
                </div>
                <div className={`absolute bottom-1 right-1 h-6 w-6 rounded-full border-4 border-white dark:border-[#111] ${staff.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              </div>
              
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white line-clamp-1">{staff.name}</h1>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {staff.dept}
                </span>
                <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-gray-700 dark:bg-white/10 dark:text-gray-300">
                  {staff.role}
                </span>
              </div>

              <div className="mt-8 w-full space-y-4 text-left">
                <div className="group flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-colors group-hover:bg-orange-50 group-hover:text-orange-600 dark:bg-white/5">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</p>
                    <p className="truncate text-sm font-bold text-gray-700 dark:text-gray-300">{staff.email || '—'}</p>
                  </div>
                </div>

                <div className="group flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-colors group-hover:bg-orange-50 group-hover:text-orange-600 dark:bg-white/5">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Contact Number</p>
                    <p className="truncate text-sm font-bold text-gray-700 dark:text-gray-300">{staff.phone || '—'}</p>
                  </div>
                </div>

                <div className="group flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-colors group-hover:bg-orange-50 group-hover:text-orange-600 dark:bg-white/5">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Location / Address</p>
                    <p className="truncate text-sm font-bold text-gray-700 dark:text-gray-300">{staff.address || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/50 dark:border-white/5 dark:bg-[#111] dark:shadow-none">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
               <Shield className="h-3 w-3" />
               Security & Access
            </h3>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between border-b border-gray-50 pb-2 dark:border-white/5">
                <span className="text-gray-500">System ID</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{staff.staffId.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2 dark:border-white/5">
                <span className="text-gray-500">Custom ID</span>
                <span className="font-bold text-gray-900 dark:text-white">{staff.customId || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Login</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {lastLogin ? lastLogin.toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Stats & Tabs */}
        <div className="space-y-6 lg:col-span-2">
          {/* Performance Overview */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="group rounded-3xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg shadow-gray-200/40 transition-all hover:scale-[1.02] dark:border-white/5 dark:from-[#111] dark:to-white/5 dark:shadow-none">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-green-600 dark:bg-green-900/20">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Present (MTD)</div>
              <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{staff.presentCount}</div>
            </div>

            <div className="group rounded-3xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg shadow-gray-200/40 transition-all hover:scale-[1.02] dark:border-white/5 dark:from-[#111] dark:to-white/5 dark:shadow-none">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                <Award className="h-5 w-5" />
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Growth Points</div>
              <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{staff.growthPointsTotal}</div>
            </div>

            <div className="group rounded-3xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg shadow-gray-200/40 transition-all hover:scale-[1.02] dark:border-white/5 dark:from-[#111] dark:to-white/5 dark:shadow-none">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-900/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Fines</div>
              <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white">Rs. {staff.totalFines}</div>
            </div>
          </div>

          {/* Details Section */}
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/50 dark:border-white/5 dark:bg-[#111] dark:shadow-none">
            <div className="border-b border-gray-50 bg-gray-50/50 px-6 py-4 dark:border-white/5 dark:bg-white/5">
              <h3 className="text-sm font-black text-gray-900 dark:text-white">Employment Information</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</p>
                  <p className="font-bold text-gray-900 dark:text-white">{staff.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">CNIC / Identity</p>
                  <p className="font-bold text-gray-900 dark:text-white">{staff.cnic || 'Not provided'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Join Date</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {joinDate ? joinDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Last Reported Status</p>
                  <p className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${staff.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-gray-100 text-gray-600 dark:bg-white/10'}`}>
                    {staff.isActive ? 'Active Member' : 'Inactive'}
                  </p>
                </div>
              </div>
              
              {staff.lastDutyLabel && (
                <div className="mt-8 rounded-2xl bg-orange-50/50 p-4 dark:bg-orange-950/20">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 text-opacity-80">Last Duty Recorded</span>
                    <History className="h-3 w-3 text-orange-400" />
                  </div>
                  <p className="text-sm font-bold text-orange-900 dark:text-orange-200">{staff.lastDutyLabel}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payroll History Section */}
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/50 dark:border-white/5 dark:bg-[#111] dark:shadow-none">
            <div className="border-b border-gray-50 bg-gray-50/50 px-6 py-4 dark:border-white/5 dark:bg-white/5">
               <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                 <CreditCard className="h-4 w-4" />
                 Payroll History
               </h3>
            </div>
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
               <p className="font-bold text-sm">Connection to Payroll module pending.</p>
               <p className="text-xs mt-1 opacity-70">Staff financial data and payouts will be listed here soon.</p>
            </div>
          </div>

          {/* Direct Actions Section */}
          <div>
             <h3 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                <ExternalLink className="h-3 w-3" />
                Administrative Actions
             </h3>
             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button 
                  onClick={() => setShowReset(true)}
                  className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-gray-100 bg-white p-8 text-center transition-all hover:border-orange-500 hover:shadow-xl dark:border-white/5 dark:bg-[#111]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                    <History className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white">Reset Password</h4>
                    <p className="mt-1 text-[10px] text-gray-400 font-bold uppercase tracking-tight">Generate secure credentials</p>
                  </div>
                </button>

                <button 
                  onClick={handleImpersonate}
                  className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-gray-100 bg-white p-8 text-center transition-all hover:border-orange-500 hover:shadow-xl dark:border-white/5 dark:bg-[#111]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                    <LogIn className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white">Login as User</h4>
                    <p className="mt-1 text-[10px] text-gray-400 font-bold uppercase tracking-tight">Access their dashboard view</p>
                  </div>
                </button>
             </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditStaffModal
          staff={staff}
          onClose={() => setShowEdit(false)}
          onSuccess={loadData}
        />
      )}

      {showReset && (
        <ResetPasswordModal
          uid={staff.staffId}
          portal={staff.dept as any}
          onClose={() => setShowReset(false)}
        />
      )}
    </div>
  );
}
