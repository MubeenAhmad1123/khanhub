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
import { toDate, formatDateDMY } from '@/lib/utils';
import { EditStaffModal } from '@/components/hq/superadmin/EditStaffModal';
import { ResetPasswordModal } from '@/components/hq/superadmin/ResetPasswordModal';
import { logoutPortalUser } from '@/app/hq/actions/logoutPortalUser';
import { deletePortalUser } from '@/app/hq/actions/deletePortalUser';


export default function SuperadminStaffProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  
  // Modals
  const [showEdit, setShowEdit] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
    if (!confirm(`You are about to view ${staff.name}'s dashboard as their role (${staff.role}). Your HQ session stays active. Continue?`)) return;

    const dept = staff.dept;
    const role = staff.role;
    const normalizedRole = (role || '').toLowerCase();

    // Build correct role-based dashboard URL
    let url: string;
    if (dept === 'hq') {
      // HQ roles
      if (role === 'superadmin') url = '/hq/dashboard/superadmin';
      else if (role === 'manager') url = '/hq/dashboard/manager';
      else if (role === 'cashier') url = '/hq/dashboard/cashier';
      else url = '/hq/dashboard';
    } else {
      // Department portals — role maps to sub-route
      const isStaff = normalizedRole === 'staff' || normalizedRole.includes('staff') || normalizedRole.includes('contractor') || normalizedRole.includes('internee');

      if (normalizedRole === 'admin' || normalizedRole === 'superadmin') {
        url = `/departments/${dept}/dashboard/admin`;
      } else if (isStaff) {
        url = `/departments/${dept}/dashboard/staff`;
      } else if (normalizedRole === 'cashier') {
        url = `/departments/${dept}/dashboard/cashier`;
      } else {
        // Each dept has its own non-admin user sub-route
        const deptUserRoute: Record<string, string> = {
          rehab:      'family',    // /departments/rehab/dashboard/family
          spims:      'student',   // /departments/spims/dashboard/student
          sukoon:     'client',    // /departments/sukoon/dashboard/client
          welfare:    'child',     // /departments/welfare/dashboard/child
          'job-center': 'seeker',  // /departments/job-center/dashboard/seeker
          hospital:   'patient',   // /departments/hospital/dashboard/patient
        };
        const subroute = deptUserRoute[dept] ?? 'family';
        url = `/departments/${dept}/dashboard/${subroute}`;
      }

      // Write a dept-specific session so the layout accepts them
      const impersonatedSession = {
        uid: staff.staffId,
        displayName: staff.name,
        role: role,
        dept: dept,
        customId: staff.customId
      };
      const portalKey = `${dept}_session`;
      localStorage.setItem(portalKey, JSON.stringify(impersonatedSession));
      localStorage.setItem(`${dept}_login_time`, Date.now().toString());
    }

    window.location.href = url;
  };

  const handleForceLogout = async () => {
    if (!staff) return;
    if (!confirm(`Are you sure you want to force logout ${staff.name}? This will revoke all active sessions.`)) return;
    
    setActionLoading(true);
    try {
      const res = await logoutPortalUser(staff.staffId, staff.dept as any);
      if (res.success) {
        alert('User successfully logged out of all devices.');
      } else {
        alert(res.error || 'Failed to logout user.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!staff) return;
    if (!confirm(`CRITICAL WARNING: Are you sure you want to PERMANENTLY DELETE ${staff.name}'s profile and access? This action CANNOT be undone.`)) return;
    
    setActionLoading(true);
    try {
      const res = await deletePortalUser(staff.staffId, staff.dept as any);
      if (res.success) {
        alert('User profile has been successfully deleted.');
        router.push('/hq/dashboard/superadmin/staff');
      } else {
        alert(res.error || 'Failed to delete user profile.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
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

  // Permission Checks for UI
  const isSuperadmin = session?.role === 'superadmin';
  const isManager = session?.role === 'manager';
  const canEdit = isSuperadmin || (isManager && (staff.role === 'staff' || staff.role === 'cashier'));

  const getDeptTheme = (dept: string) => {
    switch (dept.toLowerCase()) {
      case 'rehab': return { accent: 'bg-rose-600', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', shadow: 'shadow-rose-500/20' };
      case 'it': return { accent: 'bg-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', shadow: 'shadow-indigo-500/20' };
      case 'spims': return { accent: 'bg-sky-600', light: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', shadow: 'shadow-sky-500/20' };
      case 'hospital': return { accent: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-500', border: 'border-rose-200', shadow: 'shadow-rose-500/20' };
      case 'sukoon': return { accent: 'bg-teal-600', light: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', shadow: 'shadow-teal-500/20' };
      case 'welfare': return { accent: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', shadow: 'shadow-emerald-500/20' };
      case 'job-center': return { accent: 'bg-amber-600', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', shadow: 'shadow-amber-500/20' };
      case 'social-media': return { accent: 'bg-fuchsia-600', light: 'bg-fuchsia-50', text: 'text-fuchsia-600', border: 'border-fuchsia-200', shadow: 'shadow-fuchsia-500/20' };
      default: return { accent: 'bg-zinc-900', light: 'bg-zinc-50', text: 'text-zinc-900', border: 'border-zinc-200', shadow: 'shadow-zinc-500/20' };
    }
  };

  const theme = getDeptTheme(staff.dept);
  const joinDate = staff.joiningDate ? toDate(staff.joiningDate) : null;
  const lastLogin = staff.lastLoginAt ? toDate(staff.lastLoginAt) : null;

  return (
    <div className={`min-h-screen transition-colors duration-700 ${theme.light} py-12`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      {/* Top Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href={isSuperadmin ? "/hq/dashboard/superadmin/staff" : "/hq/dashboard/manager/staff"}
          className="group flex items-center gap-2 text-sm font-bold text-black transition-colors hover:text-black dark:text-black dark:hover:text-white"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 transition-all group-hover:bg-black group-hover:text-white dark:bg-white/5 dark:group-hover:bg-white dark:group-hover:text-black">
            <ArrowLeft className="h-4 w-4" />
          </div>
          Back to Directory
        </Link>
        <div className="flex items-center gap-3">
          {canEdit && (
            <button
              onClick={() => setShowEdit(true)}
              className={`flex items-center gap-2 rounded-xl ${theme.accent} px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95 shadow-xl ${theme.shadow}`}
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </button>
          )}
          {isSuperadmin && (
            <>
              <button
                onClick={handleForceLogout}
                disabled={actionLoading}
                className="hidden sm:flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-700 transition-all hover:bg-zinc-50 shadow-sm disabled:opacity-50"
              >
                <Lock className="h-3 w-3" />
                Force Logout
              </button>
              <button
                onClick={handleDeleteProfile}
                disabled={actionLoading}
                className="hidden sm:flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-red-600 transition-all hover:bg-red-100 shadow-sm disabled:opacity-50"
              >
                <AlertTriangle className="h-3 w-3" />
                Delete Profile
              </button>
            </>
          )}
          <Link 
            href={`/hq/dashboard/superadmin/audit?entity=${staff.name}`}
            className={`hidden sm:flex items-center gap-2 rounded-xl border ${theme.border} bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest ${theme.text} transition-all hover:bg-white shadow-sm`}
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
                <div className={`flex h-32 w-32 items-center justify-center overflow-hidden rounded-full ${theme.accent} text-4xl font-black text-white shadow-2xl`}>
                  {staff.photoUrl ? (
                    <img src={staff.photoUrl} alt={staff.name} className="h-full w-full object-cover" />
                  ) : (
                    staff.name.charAt(0)
                  )}
                </div>
                <div className={`absolute bottom-2 right-2 h-6 w-6 rounded-full border-4 border-white shadow-xl ${staff.isActive ? theme.accent : 'bg-gray-300'}`}></div>
              </div>
              
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white line-clamp-1">{staff.name}</h1>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <span className={`inline-flex items-center rounded-lg ${theme.accent} px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-sm`}>
                  {staff.dept}
                </span>
                <span className={`inline-flex items-center rounded-lg bg-white px-3 py-1 text-[9px] font-black uppercase tracking-widest text-black border ${theme.border}`}>
                  {staff.role}
                </span>
              </div>

              <div className="mt-8 w-full space-y-4 text-left">
                <div className="group flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-black transition-colors group-hover:bg-black group-hover:text-white dark:bg-white/5 dark:group-hover:bg-white dark:group-hover:text-black">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-black">Email Address</p>
                    <p className="truncate text-sm font-bold text-black dark:text-black">{staff.email || '—'}</p>
                  </div>
                </div>

                <div className="group flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-black transition-colors group-hover:bg-black group-hover:text-white dark:bg-white/5 dark:group-hover:bg-white dark:group-hover:text-black">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-black">Contact Number</p>
                    <p className="truncate text-sm font-bold text-black dark:text-black">{staff.phone || '—'}</p>
                  </div>
                </div>

                <div className="group flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-black transition-colors group-hover:bg-black group-hover:text-white dark:bg-white/5 dark:group-hover:bg-white dark:group-hover:text-black">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-black">Location / Address</p>
                    <p className="truncate text-sm font-bold text-black dark:text-black">{staff.address || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/50 dark:border-white/5 dark:bg-[#111] dark:shadow-none">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black">
               <Shield className="h-3 w-3" />
               Security & Access
            </h3>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between border-b border-gray-50 pb-2 dark:border-white/5">
                <span className="text-black">System ID</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{staff.staffId.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2 dark:border-white/5">
                <span className="text-black">Custom ID</span>
                <span className="font-bold text-gray-900 dark:text-white">{staff.customId || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Last Login</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {lastLogin ? formatDateDMY(lastLogin) : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Stats & Tabs */}
        <div className="space-y-6 lg:col-span-2">
          {/* Performance Overview */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className={`group rounded-[2rem] border ${theme.border} bg-white p-8 shadow-xl transition-all hover:translate-y-[-4px]`}>
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${theme.accent} text-white shadow-lg ${theme.shadow}`}>
                <Calendar className="h-6 w-6" />
              </div>
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.text}`}>Attendance Stream (MTD)</div>
              <div className="mt-2 text-3xl font-black text-black">{staff.presentCount}</div>
            </div>

            <div className={`group rounded-[2rem] border ${theme.border} bg-white p-8 shadow-xl transition-all hover:translate-y-[-4px]`}>
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${theme.accent} text-white shadow-lg ${theme.shadow}`}>
                <Award className="h-6 w-6" />
              </div>
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.text}`}>Growth Point Accumulation</div>
              <div className="mt-2 text-3xl font-black text-black">{staff.growthPointsTotal}</div>
            </div>

            <div className={`group rounded-[2rem] border ${theme.border} bg-white p-8 shadow-xl transition-all hover:translate-y-[-4px]`}>
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${theme.accent} text-white shadow-lg ${theme.shadow}`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.text}`}>Financial Deductions</div>
              <div className="mt-2 text-3xl font-black text-black">Rs. {staff.totalFines}</div>
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-black">Full Name</p>
                  <p className="font-bold text-gray-900 dark:text-white">{staff.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black">CNIC / Identity</p>
                  <p className="font-bold text-gray-900 dark:text-white">{staff.cnic || 'Not provided'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black">Join Date</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {formatDateDMY(joinDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black">Last Reported Status</p>
                  <p className={`inline-flex items-center rounded-lg ${theme.accent} px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-sm`}>
                    {staff.isActive ? 'Active Member' : 'Inactive'}
                  </p>
                </div>
              </div>
              
              {staff.lastDutyLabel && (
                <div className="mt-8 rounded-[1.5rem] bg-gray-50 p-6 dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-inner">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black dark:text-white opacity-40">Last Duty Node</span>
                    <History className="h-4 w-4 text-black dark:text-white opacity-20" />
                  </div>
                  <p className="text-sm font-bold text-black dark:text-white italic leading-relaxed">{staff.lastDutyLabel}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payroll History Section */}
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/50 dark:border-white/5 dark:bg-[#111] dark:shadow-none">
            <div className="border-b border-gray-50 bg-gray-50/50 px-6 py-4 dark:border-white/5 dark:bg-white/5 flex items-center justify-between">
               <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                 <CreditCard className="h-4 w-4" />
                 Payroll &amp; Salary Estimation
               </h3>
               <span className={`inline-flex items-center rounded-lg ${theme.accent} px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white shadow-sm`}>
                 Live Calculations
               </span>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-5 border border-gray-100 dark:border-white/10">
                  <p className="text-[10px] font-black text-black dark:text-white opacity-40 uppercase tracking-widest mb-1">Monthly Base Salary</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">₨{(Number(staff.monthlySalary) || 0).toLocaleString()}</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Contractual Base Wage</p>
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-5 border border-gray-100 dark:border-white/10">
                  <p className="text-[10px] font-black text-black dark:text-white opacity-40 uppercase tracking-widest mb-1">Calculated Daily Rate</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">₨{Math.floor((Number(staff.monthlySalary) || 0) / 30).toLocaleString()}</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Divided by 30 Days standard</p>
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-5 border border-gray-100 dark:border-white/10 sm:col-span-2 lg:col-span-1">
                  <p className="text-[10px] font-black text-black dark:text-white opacity-40 uppercase tracking-widest mb-1">Current Month Attendance</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{staff.presentCount || 0} Present Days</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">{Math.max(0, 30 - (staff.presentCount || 0))} days absent deduction</p>
                </div>
              </div>

              <div className={`mt-6 rounded-[2rem] border-2 ${theme.border} ${theme.light} p-6 shadow-xl ${theme.shadow} transition-all hover:scale-[1.01]`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-[10px] font-black ${theme.text} uppercase tracking-widest`}>Till-the-Date Earned Salary</p>
                      <span className={`px-2 py-0.5 rounded-md ${theme.accent} text-white text-[8px] font-black uppercase`}>
                        {staff.presentCount || 0} Days Present
                      </span>
                    </div>
                    <p className={`text-3xl font-black ${theme.text}`}>
                      ₨{Math.floor(Math.max(0, (Math.floor((Number(staff.monthlySalary) || 0) / 30) * (staff.presentCount || 0)) - (staff.totalFines || 0))).toLocaleString()}
                    </p>
                    <p className="text-[9px] text-black font-bold uppercase tracking-widest mt-1">
                      Formula: (Daily Rate × Present Days) - Unpaid Fines (₨{staff.totalFines || 0})
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:text-right">
                    <div>
                      <p className="text-[9px] font-black text-black uppercase tracking-widest">Fine Deductions</p>
                      <p className="text-xs font-bold text-rose-600">- ₨{(staff.totalFines || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black uppercase tracking-widest">Absent Deductions</p>
                      <p className="text-xs font-bold text-rose-600">
                        - ₨{Math.floor(Math.max(0, 30 - (staff.presentCount || 0)) * Math.floor((Number(staff.monthlySalary) || 0) / 30)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Direct Actions Section */}
          <div>
             <h3 className={`mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest ${theme.text}`}>
                <ExternalLink className="h-3 w-3" />
                Administrative Actions
             </h3>
             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button 
                  onClick={() => setShowReset(true)}
                  className={`flex flex-col items-center justify-center gap-4 rounded-[2.5rem] border ${theme.border} bg-white p-10 text-center transition-all hover:border-black hover:shadow-2xl group overflow-hidden relative shadow-xl`}
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-black group-hover:scale-110 transition-all shadow-md`}>
                    <History className={`h-7 w-7 ${theme.text}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-black uppercase tracking-tight">Credential Reset</h4>
                    <p className="mt-2 text-[9px] text-black font-bold uppercase tracking-[0.2em] italic">Refresh authorization node</p>
                  </div>
                </button>

                <button 
                  onClick={handleImpersonate}
                  className={`flex flex-col items-center justify-center gap-4 rounded-[2.5rem] border ${theme.border} bg-white p-10 text-center transition-all hover:border-black hover:shadow-2xl group overflow-hidden relative shadow-xl`}
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-black group-hover:scale-110 transition-all shadow-md`}>
                    <LogIn className={`h-7 w-7 ${theme.text}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-black uppercase tracking-tight">Active Impersonation</h4>
                    <p className="mt-2 text-[9px] text-black font-bold uppercase tracking-[0.2em] italic">Proxy session synchronization</p>
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
    </div>
  );
}
