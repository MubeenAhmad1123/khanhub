// apps/web/src/app/developer/DeveloperDashboardClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { 
  ShieldAlert, 
  Lock, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Save, 
  Clock, 
  Trash2, 
  Eye, 
  Sliders, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface DeveloperDashboardClientProps {
  developerEmail: string;
}

function dateToDatetimeLocalString(date: Date | null): string {
  if (!date) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

export default function DeveloperDashboardClient({ developerEmail }: DeveloperDashboardClientProps) {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  
  // Real-time Firestore live state
  const [liveIsBlocked, setLiveIsBlocked] = useState<boolean>(false);
  const [liveHeading, setLiveHeading] = useState<string>('');
  const [liveMessage, setLiveMessage] = useState<string>('');
  const [liveScheduledUnblockAt, setLiveScheduledUnblockAt] = useState<Date | null>(null);
  
  // Local Form state
  const [formIsBlocked, setFormIsBlocked] = useState<boolean>(false);
  const [formHeading, setFormHeading] = useState<string>('');
  const [formMessage, setFormMessage] = useState<string>('');
  const [formScheduledUnblock, setFormScheduledUnblock] = useState<string>('');
  
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Sync with Firestore settings/siteBlock
  useEffect(() => {
    if (!user || user.email !== developerEmail) return;

    const docRef = doc(db, 'settings', 'siteBlock');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const isBlocked = typeof data.isBlocked === 'boolean' ? data.isBlocked : false;
        const heading = typeof data.heading === 'string' ? data.heading : 'Site Unavailable';
        const message = typeof data.message === 'string' ? data.message : 'This site is currently unavailable.';
        
        let scheduledDate: Date | null = null;
        if (data.scheduledUnblockAt) {
          if (typeof data.scheduledUnblockAt.toDate === 'function') {
            scheduledDate = data.scheduledUnblockAt.toDate();
          } else {
            scheduledDate = new Date(data.scheduledUnblockAt);
          }
        }

        setLiveIsBlocked(isBlocked);
        setLiveHeading(heading);
        setLiveMessage(message);
        setLiveScheduledUnblockAt(scheduledDate);

        // Populate form fields on initial snapshot load
        setDataLoading((prevLoading) => {
          if (prevLoading) {
            setFormIsBlocked(isBlocked);
            setFormHeading(heading);
            setFormMessage(message);
            setFormScheduledUnblock(dateToDatetimeLocalString(scheduledDate));
          }
          return false;
        });
      } else {
        // Handle case where document does not exist yet
        setLiveIsBlocked(false);
        setLiveHeading('Site Unavailable');
        setLiveMessage('This site is currently unavailable.');
        setLiveScheduledUnblockAt(null);

        setDataLoading((prevLoading) => {
          if (prevLoading) {
            setFormIsBlocked(false);
            setFormHeading('Site Unavailable');
            setFormMessage('This site is currently unavailable.');
            setFormScheduledUnblock('');
          }
          return false;
        });
      }
    }, (error) => {
      console.error('Firestore snapshot read failed:', error);
      toast.error('Failed to connect to system settings.');
    });

    return () => unsubscribe();
  }, [user, developerEmail]);

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.email !== developerEmail) return;

    setSaving(true);
    const docRef = doc(db, 'settings', 'siteBlock');

    try {
      const scheduledDate = formScheduledUnblock ? new Date(formScheduledUnblock) : null;
      
      await setDoc(docRef, {
        isBlocked: formIsBlocked,
        heading: formHeading.trim() || 'Site Unavailable',
        message: formMessage.trim() || 'This site is currently unavailable.',
        scheduledUnblockAt: scheduledDate,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast.success('Site block settings updated successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // Reset form to match currently live Firestore settings
  const handleResetForm = () => {
    setFormIsBlocked(liveIsBlocked);
    setFormHeading(liveHeading);
    setFormMessage(liveMessage);
    setFormScheduledUnblock(dateToDatetimeLocalString(liveScheduledUnblockAt));
    toast.success('Form reset to live settings.');
  };

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-teal-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-neutral-400 font-semibold text-sm tracking-wide animate-pulse">
            Checking credentials...
          </p>
        </div>
      </div>
    );
  }

  // Not Logged In screen
  if (!user) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center bg-neutral-950 overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
        <div className="relative z-10 max-w-md w-full mx-4">
          <div className="backdrop-blur-2xl bg-neutral-900/80 border border-neutral-800 rounded-[2.5rem] p-8 sm:p-10 text-center shadow-2xl border-t-4 border-t-red-500 flex flex-col items-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-red-500/20 rounded-2xl blur-xl scale-125 animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <Lock className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-neutral-50 tracking-tight">
              Access Denied
            </h1>
            <p className="text-neutral-400 text-sm mt-3 leading-relaxed">
              This environment is restricted. You must be signed in as the developer to access this page.
            </p>
            <button
              onClick={() => signInWithGoogle().catch(() => {})}
              className="mt-8 w-full py-3 bg-neutral-100 hover:bg-white text-neutral-950 font-bold rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              Sign In with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Logged in but NOT developer screen
  if (user.email !== developerEmail) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center bg-neutral-950 overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
        <div className="relative z-10 max-w-md w-full mx-4">
          <div className="backdrop-blur-2xl bg-neutral-900/80 border border-neutral-800 rounded-[2.5rem] p-8 sm:p-10 text-center shadow-2xl border-t-4 border-t-red-500 flex flex-col items-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-red-500/20 rounded-2xl blur-xl scale-125" />
              <div className="relative w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-neutral-50 tracking-tight">
              Unauthorized Account
            </h1>
            <p className="text-neutral-400 text-sm mt-3 leading-relaxed">
              The account <span className="text-red-400 font-semibold">{user.email}</span> does not have developer privileges.
            </p>
            <button
              onClick={() => signOut().catch(() => {})}
              className="mt-8 w-full py-3 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white font-bold rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out & Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Control Panel Screen
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none pb-12">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-15 pointer-events-none" />

      {/* Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Sliders className="w-5 h-5 text-neutral-950 font-black" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                KhanHub Developer Console
              </h1>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">
                Site-Wide Interception Panel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-400 font-medium">
              Signed in as: <span className="text-teal-400 font-semibold">{user.email}</span>
            </span>
            <button
              onClick={() => signOut().catch(() => {})}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 border border-neutral-800 text-xs font-bold text-neutral-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 rounded-xl transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      {dataLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
            <p className="text-neutral-500 font-bold text-xs tracking-widest uppercase animate-pulse">
              Syncing settings...
            </p>
          </div>
        </div>
      ) : (
        <main className="max-w-7xl w-full mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          
          {/* LEFT COLUMN: Controls Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Live Database Status Indicator Card */}
            <div className="backdrop-blur bg-neutral-900/40 border border-neutral-900 rounded-3xl p-6 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
                  Live System Status
                </h2>
                <p className="text-xs text-neutral-600 font-medium mt-1">
                  Active database configuration status
                </p>
              </div>
              <div className="flex items-center gap-2">
                {liveIsBlocked ? (
                  <span className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 font-extrabold text-xs tracking-widest uppercase rounded-full inline-flex items-center gap-1.5 shadow-lg shadow-red-500/5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    SITE BLOCKED
                  </span>
                ) : (
                  <span className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-xs tracking-widest uppercase rounded-full inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    SITE LIVE
                  </span>
                )}
              </div>
            </div>

            {/* Controls Form */}
            <form onSubmit={handleSave} className="backdrop-blur bg-neutral-900/60 border border-neutral-900 rounded-[2rem] p-6 sm:p-8 space-y-6">
              
              {/* Block Toggle Switch */}
              <div className="p-4 bg-neutral-950/60 border border-neutral-900 rounded-2xl flex items-center justify-between">
                <div>
                  <label htmlFor="block-toggle" className="text-sm font-extrabold text-neutral-200">
                    Interception Toggle
                  </label>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Toggle block page across all paths immediately
                  </p>
                </div>
                <button
                  type="button"
                  id="block-toggle"
                  onClick={() => setFormIsBlocked(!formIsBlocked)}
                  className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                    formIsBlocked ? 'bg-red-600' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-300 ease-in-out ${
                      formIsBlocked ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Heading Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Block Heading
                </label>
                <input
                  type="text"
                  required
                  value={formHeading}
                  onChange={(e) => setFormHeading(e.target.value)}
                  placeholder="e.g. Site Maintenance"
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-900 focus:border-teal-500/60 rounded-xl text-sm text-neutral-200 placeholder-neutral-700 outline-none transition-all"
                />
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Block Message Text
                </label>
                <textarea
                  required
                  rows={4}
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="e.g. We are performing emergency database optimizations. Please check back later."
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-900 focus:border-teal-500/60 rounded-xl text-sm text-neutral-200 placeholder-neutral-700 outline-none transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Scheduled Unblock Datetime */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Scheduled Unblock Time (Optional)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                    <input
                      type="datetime-local"
                      value={formScheduledUnblock}
                      onChange={(e) => setFormScheduledUnblock(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-900 focus:border-teal-500/60 rounded-xl text-sm text-neutral-200 outline-none transition-all [color-scheme:dark]"
                    />
                  </div>
                  {formScheduledUnblock && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormScheduledUnblock('');
                        toast.success('Scheduled unblock time cleared.');
                      }}
                      className="px-4 bg-neutral-950 border border-neutral-900 hover:border-red-500/30 text-neutral-500 hover:text-red-400 rounded-xl transition-all"
                      title="Clear schedule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
                  If set, the block will automatically deactivate when the server registers a request after this date/time.
                </p>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-neutral-950 font-black rounded-2xl shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition-all duration-300 hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save & Update System
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-6 py-3.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 text-sm font-bold text-neutral-400 hover:text-neutral-200 rounded-2xl transition-all"
                >
                  Reset Form
                </button>
              </div>

            </form>
          </div>

          {/* RIGHT COLUMN: Live Block Page Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col h-full">
            <div className="flex items-center gap-1.5 mb-4 pl-1">
              <Eye className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Live Visitor Screen Preview
              </h3>
            </div>

            {/* Scaled Preview Frame */}
            <div className="flex-1 border border-neutral-900 rounded-[2rem] bg-neutral-950 overflow-hidden relative min-h-[450px] flex items-center justify-center p-6 shadow-inner">
              
              {/* Badge Preview Status */}
              <div className="absolute top-4 left-4 z-20 px-3 py-1.5 bg-neutral-900/80 border border-neutral-800 backdrop-blur rounded-full text-[9px] font-bold tracking-wider text-neutral-400 uppercase flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${formIsBlocked ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                {formIsBlocked ? 'Preview: Blocked View' : 'Preview: Normal Site View'}
              </div>

              {formIsBlocked ? (
                /* Blocked UI Preview */
                <div className="relative max-w-sm w-full mx-auto select-none pointer-events-none animate-fade-in scale-95 sm:scale-100">
                  <div className="absolute inset-0 bg-teal-500/5 rounded-full blur-[80px] -z-10" />
                  <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800/80 rounded-3xl p-6 text-center shadow-2xl border-t-2 border-t-teal-500 flex flex-col items-center">
                    
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/30 flex items-center justify-center mb-4">
                      <ShieldAlert className="w-6 h-6 text-teal-400" />
                    </div>

                    <h4 className="text-lg font-extrabold tracking-tight text-neutral-50 leading-tight">
                      <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                        {formHeading.trim() || 'Site Unavailable'}
                      </span>
                    </h4>

                    <div className="w-10 h-0.5 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full my-4 opacity-50" />

                    <p className="text-neutral-400 text-xs leading-relaxed font-medium whitespace-pre-wrap">
                      {formMessage.trim() || 'This site is currently unavailable.'}
                    </p>

                    <div className="mt-6 px-3 py-1.5 bg-neutral-950/60 border border-neutral-800 rounded-full text-[9px] font-bold text-teal-400 tracking-wider uppercase inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />
                      System Under Maintenance
                    </div>
                  </div>
                </div>
              ) : (
                /* Normal UI Preview */
                <div className="text-center max-w-xs space-y-4 pointer-events-none">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                  <h4 className="text-sm font-bold text-neutral-200">
                    Site is Operational
                  </h4>
                  <p className="text-xs text-neutral-500 leading-relaxed max-w-[240px]">
                    Site block is OFF. Visitors are navigating your KhanHub platform normally.
                  </p>
                </div>
              )}
            </div>
          </div>

        </main>
      )}
    </div>
  );
}
