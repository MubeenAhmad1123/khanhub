// apps/web/src/components/hq/superadmin/SuperAdminPortalToolbar.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, 
  Lock, 
  LogOut, 
  Trash2, 
  Loader2, 
  ArrowLeft,
  History,
  AlertTriangle
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logoutPortalUser } from '@/app/hq/actions/logoutPortalUser';
import { deletePortalUser } from '@/app/hq/actions/deletePortalUser';
import { ResetPasswordModal } from '@/components/hq/superadmin/ResetPasswordModal';

interface SuperAdminPortalToolbarProps {
  dept: string;
  entityId: string;
  entityType: 'patient' | 'client' | 'student' | 'child' | 'seeker' | 'employer' | 'staff';
  entityName?: string;
}

export function SuperAdminPortalToolbar({ 
  dept, 
  entityId, 
  entityType,
  entityName 
}: SuperAdminPortalToolbarProps) {
  const router = useRouter();
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [authDoc, setAuthDoc] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modals
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    // 1. Check if user is actually viewing this as Superadmin
    const hqSession = localStorage.getItem('hq_session');
    if (!hqSession) {
      setLoadingAuth(false);
      return;
    }

    try {
      const parsed = JSON.parse(hqSession);
      if (parsed.role === 'superadmin') {
        setIsSuperadmin(true);
        // 2. Lookup linked Auth user from department users
        fetchLinkedUser();
      } else {
        setLoadingAuth(false);
      }
    } catch (e) {
      setLoadingAuth(false);
    }
  }, []);

  async function fetchLinkedUser() {
    try {
      let colName = `${dept.replace('-', '_')}_users`;
      if (dept === 'hq') colName = 'hq_users';
      if (dept === 'job-center') colName = 'jobcenter_users';
      if (dept === 'social-media') colName = 'media_users';

      let fieldName = `${entityType}Id`;
      if (entityType === 'staff') fieldName = 'staffId'; // Edge case logic fallback

      const q = query(collection(db, colName), where(fieldName, '==', entityId));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        setAuthUid(snap.docs[0].id);
        setAuthDoc(snap.docs[0].data());
      }
    } catch (err) {
      console.error('[SuperAdminPortalToolbar] Could not resolve linked auth account:', err);
    } finally {
      setLoadingAuth(false);
    }
  }

  if (!isSuperadmin) return null;

  const handleForceLogout = async () => {
    if (!authUid) return;
    if (!confirm(`Force logout ${entityName || 'this user'}? All current login sessions will be immediately revoked.`)) return;
    
    setActionLoading(true);
    try {
      const res = await logoutPortalUser(authUid, dept as any);
      if (res.success) {
        alert('User logged out successfully.');
      } else {
        alert(res.error || 'Failed to logout.');
      }
    } catch (err: any) {
      alert(err.message || 'An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!authUid) return;
    if (!confirm(`CRITICAL ACTION: You are deleting the AUTHENTICATION ACCOUNT for ${entityName || 'this user'}. They will lose login access forever. This does NOT delete their patient/client database record. Proceed?`)) return;
    
    setActionLoading(true);
    try {
      const res = await deletePortalUser(authUid, dept as any);
      if (res.success) {
        alert('Auth account deleted successfully.');
        setAuthUid(null);
      } else {
        alert(res.error || 'Failed to delete auth user.');
      }
    } catch (err: any) {
      alert(err.message || 'An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewActivity = () => {
    const searchTerm = entityName || entityId;
    window.open(`/hq/dashboard/superadmin/audit?q=${encodeURIComponent(searchTerm)}`, '_blank');
  };

  return (
    <>
      {/* Top Floating Banner Bar */}
      <div className="sticky top-0 z-[9999] bg-slate-900/95 backdrop-blur-md border-b border-slate-700 text-white shadow-2xl overflow-hidden">
        {/* Accent gradient line */}
        <div className="h-1 w-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 animate-gradient-x" />
        
        <div className="mx-auto max-w-[1600px] px-4 py-2 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-orange-400">Super Admin Mode</h2>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700 capitalize">
                  Dept: {dept}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">You are controlling this record via the HQ bridge.</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {loadingAuth ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 px-3">
                <Loader2 className="h-3 w-3 animate-spin" />
                Detecting account link...
              </div>
            ) : !authUid ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 px-3 bg-slate-800/50 py-1.5 rounded-lg border border-slate-700">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                No Auth Account Found (Offline Record)
              </div>
            ) : (
              <>
                <button
                  onClick={handleViewActivity}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700 hover:bg-slate-700 transition-all active:scale-95"
                >
                  <History className="h-3.5 w-3.5 text-indigo-400" />
                  Activity
                </button>

                <button
                  onClick={() => setShowReset(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700 hover:bg-slate-700 transition-all active:scale-95"
                >
                  <Lock className="h-3.5 w-3.5 text-blue-400" />
                  Reset Password
                </button>
                
                <button
                  onClick={handleForceLogout}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white border border-slate-700 hover:bg-orange-900/50 hover:border-orange-500/50 transition-all disabled:opacity-50 active:scale-95"
                >
                  {actionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5 text-orange-400" />
                  )}
                  Force Logout
                </button>

                <button
                  onClick={handleDeleteAccount}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Auth
                </button>
              </>
            )}

            <div className="h-5 w-[1px] bg-slate-700 mx-1" />

            <button
              onClick={() => router.push('/hq/dashboard/superadmin/users')}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-900/20 hover:bg-blue-500 hover:-translate-y-0.5 transition-all active:translate-y-0 active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Matrix
            </button>
          </div>
        </div>
      </div>

      {/* Utility Modals Integration */}
      {authUid && showReset && (
        <ResetPasswordModal
          uid={authUid}
          portal={dept as any}
          onClose={() => setShowReset(false)}
        />
      )}
    </>
  );
}
