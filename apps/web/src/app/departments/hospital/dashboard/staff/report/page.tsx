'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useHospitalSession } from '@/hooks/hospital/useHospitalSession';
import {
  collection, query, where, getDocs, doc, getDoc, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY, toDate } from '@/lib/utils';
import {
  FileText, Calendar, Printer, Loader2, Award, 
  CheckCircle2, Clock, Star, TrendingUp, ChevronLeft
} from 'lucide-react';
import Link from 'next/link';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function StaffReportPage() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useHospitalSession();

  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const staffRef = doc(db, 'hospital_users', user.uid);
      let staffSnap = await getDoc(staffRef);
      
      if (!staffSnap.exists()) {
        const fallbackSnap = await getDocs(query(collection(db, 'hospital_staff'), where('loginUserId', '==', user.uid)));
        if (!fallbackSnap.empty) {
          staffSnap = fallbackSnap.docs[0] as any;
        }
      }

      if (staffSnap.exists()) {
        setStaffProfile({ id: staffSnap.id, ...staffSnap.data() });
      }
    } catch (err) {
      console.error('Error fetching staff profile:', err);
    }
  }, [user]);

  const generateReport = async () => {
    if (!staffProfile) return;
    setGenerating(true);
    try {
      const firstDay = new Date(selectedYear, selectedMonth, 1);
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
      const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

      // 1. Fetch Attendance
      const attSnap = await getDocs(
        query(
          collection(db, 'hospital_attendance'),
          where('staffId', '==', staffProfile.id),
          where('date', '>=', firstDay.toISOString().split('T')[0]),
          where('date', '<=', lastDay.toISOString().split('T')[0])
        )
      );
      const attendance = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const presentDays = attendance.filter((a: any) => a.status === 'present').length;
      const totalDays = attendance.length || 1;
      const attPct = Math.round((presentDays / totalDays) * 100);

      // 2. Fetch Contributions
      const contribSnap = await getDocs(
        query(
          collection(db, 'hospital_contributions'),
          where('staffId', '==', staffProfile.id),
          where('createdAt', '>=', Timestamp.fromDate(firstDay)),
          where('createdAt', '<=', Timestamp.fromDate(lastDay)),
          orderBy('createdAt', 'desc')
        )
      );
      const contributions = contribSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. Fetch Growth Points
      const gpSnap = await getDocs(
        query(
          collection(db, 'hospital_growth_points'),
          where('staffId', '==', staffProfile.id)
        )
      );
      const allGP = gpSnap.docs.map(d => d.data());
      const monthGP = allGP.filter((g: any) => {
          const gDate = toDate(g.date || g.createdAt);
          if (!gDate) return false;
          return gDate >= firstDay && gDate <= lastDay;
      }).reduce((s: number, g: any) => s + (g.points || 0), 0);

      setReportData({
        attendance,
        contributions,
        stats: {
          presentDays,
          totalDays,
          attPct,
          totalContribs: contributions.length,
          monthGP
        },
        generatedAt: new Date().toLocaleString(),
        monthLabel: `${MONTHS[selectedMonth]} ${selectedYear}`
      });
    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push('/departments/hospital/login');
    }
    if (user) {
      fetchProfile();
    }
  }, [user, sessionLoading, router, fetchProfile]);

  useEffect(() => {
    if (staffProfile) {
      generateReport();
    }
  }, [staffProfile]);

  if (sessionLoading || (loading && !staffProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF4] p-4 md:p-8">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-print-area, #report-print-area * { visibility: visible; }
          #report-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
          <div>
            <Link href="/departments/hospital/dashboard/staff" className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-widest hover:text-blue-600 transition-colors mb-4">
              <ChevronLeft size={14} /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <FileText className="text-blue-600" /> Performance Report
            </h1>
            <p className="text-gray-500 text-sm mt-1">Detailed overview of your work and achievements</p>
          </div>
          <button 
            onClick={() => window.print()}
            className="bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Printer size={16} /> Print Report
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm no-print">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Month</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              >
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Year</label>
              <input 
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            <button 
              onClick={generateReport}
              disabled={generating}
              className="w-full bg-blue-600 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Report Content */}
        {reportData && (
          <div id="report-print-area" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Report Identity (Print Only) */}
            <div className="hidden print:block text-center border-b-2 border-gray-100 pb-8 mb-8">
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Khan Hub Hospital</h2>
              <p className="text-blue-600 font-black text-sm uppercase tracking-[0.3em] mt-2">Performance Certificate</p>
              <div className="mt-8 flex items-center justify-center gap-12">
                <div className="text-left">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee Name</p>
                  <p className="text-lg font-black text-gray-900">{staffProfile?.name}</p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Report Period</p>
                  <p className="text-lg font-black text-gray-900">{reportData.monthLabel}</p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all text-center group">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Clock size={24} />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Attendance</p>
                <p className="text-3xl font-black text-gray-900">{reportData.stats.attPct}%</p>
                <p className="text-[10px] font-bold text-gray-400 mt-1">{reportData.stats.presentDays}/{reportData.stats.totalDays} Days</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all text-center group">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Star size={24} />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Growth Points</p>
                <p className="text-3xl font-black text-gray-900">{reportData.stats.monthGP}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-1">Monthly Total</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all text-center group">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contributions</p>
                <p className="text-3xl font-black text-gray-900">{reportData.stats.totalContribs}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-1">Records Submitted</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all text-center group">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Award size={24} />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Efficiency</p>
                <p className="text-3xl font-black text-gray-900">{Math.min(100, Math.round((reportData.stats.attPct + (reportData.stats.totalContribs > 0 ? 100 : 0)) / 2))}%</p>
                <p className="text-[10px] font-bold text-gray-400 mt-1">Overall Score</p>
              </div>
            </div>

            {/* Attendance Details */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
                  <Calendar size={18} className="text-blue-500" /> Attendance History
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-8 py-4">Date</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4">Check In</th>
                      <th className="px-8 py-4">Check Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reportData.attendance.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-12 text-center text-gray-400 text-xs italic font-bold">No attendance records for this period</td>
                      </tr>
                    ) : (
                      reportData.attendance.map((a: any) => (
                        <tr key={a.id} className="text-sm">
                          <td className="px-8 py-4 font-black text-gray-700">{formatDateDMY(a.date)}</td>
                          <td className="px-8 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                              a.status === 'present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-gray-500 font-medium">{a.checkInTime ? new Date(toDate(a.checkInTime)).toLocaleTimeString() : '—'}</td>
                          <td className="px-8 py-4 text-gray-500 font-medium">{a.checkOutTime ? new Date(toDate(a.checkOutTime)).toLocaleTimeString() : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Contribution Details */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
                  <Star size={18} className="text-purple-500" /> Contributions & Achievements
                </h3>
              </div>
              <div className="p-8 space-y-4">
                {reportData.contributions.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs italic font-bold py-8">No contributions recorded for this month</p>
                ) : (
                  reportData.contributions.map((c: any) => (
                    <div key={c.id} className="flex items-start gap-4 p-5 rounded-3xl bg-gray-50/50 border border-gray-100">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-purple-600 shrink-0">
                        <Star size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-800 leading-snug">{c.description}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{formatDateDMY(toDate(c.createdAt))}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Print Footer */}
            <div className="hidden print:flex items-center justify-between pt-12 border-t-2 border-gray-100">
              <div className="text-center w-48">
                <div className="h-px bg-gray-300 mb-4" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee Signature</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Authenticated By</p>
                <div className="px-6 py-2 border-2 border-blue-600/20 rounded-xl">
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Khan Hub Digital Core</p>
                </div>
              </div>
              <div className="text-center w-48">
                <div className="h-px bg-gray-300 mb-4" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Admin Authorization</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
