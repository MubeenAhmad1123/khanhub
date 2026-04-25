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
import { collection, query, getDocs, limit, where, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { getDeptPrefix } from '@/lib/hq/superadmin/staff';
import { toast } from 'react-hot-toast';
import { Loader2, Sparkles, CheckCircle, X } from 'lucide-react';

export default function ItOverviewPage() {
  const { session } = useHqSession();
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeSystems: 12,
    openTickets: 4,
    uptime: '99.9%'
  });

  // Staff Self-Service Data
  const [userStats, setUserStats] = useState({
    attendance: '—',
    fines: 0,
    growthPoints: 0,
    loading: true,
    dept: ''
  });

  const [showContributionModal, setShowContributionModal] = useState(false);
  const [contributionText, setContributionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasContributedToday, setHasContributedToday] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch IT and Social Media staff count - only if admin or just handle error
        // For regular staff, these might fail, so we catch and set to placeholder or 0
        const itSnap = await getDocs(collection(db, 'it_users')).catch(() => ({ size: 0 }));
        const mediaSnap = await getDocs(collection(db, 'media_users')).catch(() => ({ size: 0 }));
        
        setStats(prev => ({
          ...prev,
          totalStaff: (itSnap.size || 0) + (mediaSnap.size || 0)
        }));
      } catch (err) {
        console.error("Error fetching system stats:", err);
      }
    }
    fetchStats();
  }, []);

  useEffect(() => {
    if (!session?.uid) return;

    async function fetchPersonalStats() {
      if (!session?.uid) return;
      const uid = session.uid;

      try {
        setUserStats(prev => ({ ...prev, loading: true }));
        
        // Find which department this user belongs to
        const depts = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];
        let userDept = '';
        let userData = null;

        for (const d of depts) {
          const col = d === 'hq' ? 'hq_users' : (d === 'job-center' ? 'jobcenter_users' : (d === 'social-media' ? 'media_users' : `${d.replace('-', '_')}_users`));
          const docRef = doc(db, col, uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            userDept = d;
            userData = snap.data();
            break;
          }
        }

        if (userDept) {
          const prefix = getDeptPrefix(userDept as any);
          
          // Fetch Fines
          const finesSnap = await getDocs(query(
            collection(db, `${prefix}_fines`),
            where('staffId', '==', uid),
            where('status', '==', 'unpaid')
          ));
          const totalFines = finesSnap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);

          // Fetch Growth Points
          const gpSnap = await getDocs(query(
            collection(db, `${prefix}_growth_points`),
            where('staffId', '==', uid)
          ));
          const totalGP = gpSnap.docs.reduce((acc, d) => acc + (d.data().points || 0), 0);

          // Attendance % (Last 30 days)
          const attSnap = await getDocs(query(
            collection(db, `${prefix}_attendance`),
            where('staffId', '==', uid),
            limit(30)
          ));
          const presentCount = attSnap.docs.filter(d => d.data().status === 'present').length;
          const attRate = attSnap.size > 0 ? Math.round((presentCount / attSnap.size) * 100) : 0;

          setUserStats({
            attendance: `${attRate}%`,
            fines: totalFines,
            growthPoints: totalGP,
            loading: false,
            dept: userDept
          });
        } else {
          setUserStats(prev => ({ ...prev, loading: false }));
        }
      } catch (err) {
        console.error("Error fetching personal stats:", err);
        setUserStats(prev => ({ ...prev, loading: false }));
      }
    }

    fetchPersonalStats();

    // Check if contributed today
    async function checkContribution() {
      if (!session?.uid || !userStats.dept) return;
      const prefix = getDeptPrefix(userStats.dept as any);
      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, `${prefix}_contributions`),
        where('staffId', '==', session.uid),
        where('date', '==', today),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setHasContributedToday(true);
      }
    }
    checkContribution();
  }, [session, userStats.dept]);

  const handleSubmitContribution = async () => {
    if (!contributionText.trim() || !userStats.dept || !session?.uid) return;
    const uid = session.uid;
    const name = session.name || session.displayName || 'Staff';
    
    setSubmitting(true);
    try {
      const prefix = getDeptPrefix(userStats.dept as any);
      await addDoc(collection(db, `${prefix}_contributions`), {
        staffId: uid,
        staffName: name,
        content: contributionText,
        isApproved: false,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      
      setSubmitted(true);
      setHasContributedToday(true);
      setContributionText('');
      
      setTimeout(() => {
        setShowContributionModal(false);
        setSubmitted(false);
      }, 2000);

    } catch (err) {
      console.error(err);
      toast.error("Failed to submit contribution");
      setSubmitting(false);
    }
  };

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

      {/* Staff Self-Service (New Section) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group border-4 border-black">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={120} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-gray-500">Personal Performance Matrix</p>
          <h2 className="text-4xl font-black tracking-tighter mb-8 uppercase">My Dashboard</h2>
          
          {userStats.loading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Syncing telemetry...</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-8">
              <div className="hover:translate-y-[-4px] transition-transform">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Attendance</p>
                <p className="text-3xl font-black text-emerald-400">{userStats.attendance}</p>
              </div>
              <div className="hover:translate-y-[-4px] transition-transform">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Pending Fines</p>
                <p className="text-3xl font-black text-rose-400">PKR {userStats.fines}</p>
              </div>
              <div className="hover:translate-y-[-4px] transition-transform">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Growth Pts</p>
                <p className="text-3xl font-black text-blue-400">+{userStats.growthPoints}</p>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => setShowContributionModal(true)}
          className="bg-white border-4 border-black p-10 rounded-[3rem] text-left hover:bg-gray-50 transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles size={120} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-gray-400">Value Addition</p>
          <h2 className="text-4xl font-black tracking-tighter mb-4 uppercase">Contribution</h2>
          <p className="text-sm font-bold uppercase tracking-tight text-gray-500 max-w-xs leading-snug">
            {hasContributedToday 
              ? "You've already recorded your daily contribution. Great job!" 
              : "Record growth milestones, suggest improvements, or log daily value added."}
          </p>
          <div className={`mt-8 w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg shadow-black/10 ${hasContributedToday ? 'bg-emerald-500 text-white' : 'bg-black text-white'}`}>
            {hasContributedToday ? <CheckCircle size={28} /> : <Plus size={28} />}
          </div>
        </button>
      </div>

      {/* Contribution Modal */}
      {showContributionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowContributionModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl border-4 border-black animate-in zoom-in duration-300">
            <button 
              onClick={() => setShowContributionModal(false)}
              className="absolute top-8 right-8 text-gray-400 hover:text-black transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="mb-8">
              <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center mb-4">
                <Sparkles size={24} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Record Contribution</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Submit growth points for verification</p>
            </div>

            {submitted ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border-4 border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                  <CheckCircle size={40} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-black">Submitted!</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Pending manager verification</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Description of Contribution</label>
                  <textarea
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-3xl p-6 text-sm font-bold outline-none min-h-[150px] transition-all"
                    placeholder="What did you achieve or contribute today?"
                    value={contributionText}
                    onChange={e => setContributionText(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleSubmitContribution}
                  disabled={submitting || hasContributedToday || !contributionText.trim()}
                  className="w-full bg-black text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : hasContributedToday ? (
                    <>
                      <CheckCircle size={18} />
                      Already Submitted Today
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Submit for Approval
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
