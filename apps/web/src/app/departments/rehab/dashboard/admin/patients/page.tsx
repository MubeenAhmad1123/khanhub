'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, where, limit, orderBy, startAfter, getCountFromServer, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY } from '@/lib/utils';
import { 
  Heart, Plus, Search, ChevronRight, User, Calendar, Loader2, 
  Phone, DollarSign, CheckCircle, AlertCircle, X, Filter,
  BarChart3, TrendingUp, TrendingDown, Users
} from 'lucide-react';
import { Patient } from '@/types/rehab';

function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val?.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

export default function PatientsListPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortMethod, setSortMethod] = useState<string>('newest'); 
  const [yearFilter, setYearFilter] = useState<string>('all');
  
  // Discharge Analytics State
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsPreset, setAnalyticsPreset] = useState<'this_month' | 'last_month' | 'last_90_days' | 'custom'>('this_month');
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalActiveCount, setTotalActiveCount] = useState(0);
  const [totalDischargedCount, setTotalDischargedCount] = useState(0);
  const [totalPatientsCount, setTotalPatientsCount] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    let sessionData = localStorage.getItem('rehab_session');
    
    if (!sessionData) {
      const hqRaw = localStorage.getItem('hq_session');
      if (hqRaw) {
        const parsedHq = JSON.parse(hqRaw);
        if (parsedHq.role === 'superadmin') {
          sessionData = JSON.stringify({
            ...parsedHq,
            displayName: parsedHq.displayName || parsedHq.name,
            role: 'superadmin'
          });
        }
      }
    }

    if (!sessionData) {
      router.push('/departments/rehab/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/rehab/login');
      return;
    }
    setSession(parsed);
    fetchPatients();
  }, [router]);

  useEffect(() => {
    const today = new Date();
    if (analyticsPreset === 'this_month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setAnalyticsStartDate(startOfMonth.toISOString().split('T')[0]);
      setAnalyticsEndDate(today.toISOString().split('T')[0]);
    } else if (analyticsPreset === 'last_month') {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      setAnalyticsStartDate(startOfLastMonth.toISOString().split('T')[0]);
      setAnalyticsEndDate(endOfLastMonth.toISOString().split('T')[0]);
    } else if (analyticsPreset === 'last_90_days') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(today.getDate() - 90);
      setAnalyticsStartDate(ninetyDaysAgo.toISOString().split('T')[0]);
      setAnalyticsEndDate(today.toISOString().split('T')[0]);
    }
  }, [analyticsPreset]);

  const fetchPatients = async (isNext = false, isPrev = false) => {
    try {
      setLoading(true);
      
      // 1. Get counts using zero-cost getCountFromServer (1 read per 1000 docs)
      const dischargedCountSnap = await getCountFromServer(query(collection(db, 'rehab_patients'), where('isActive', '==', false)));
      const totalCountSnap = await getCountFromServer(collection(db, 'rehab_patients'));
      const dischargedCount = dischargedCountSnap.data().count;
      const totalCount = totalCountSnap.data().count;
      setTotalDischargedCount(dischargedCount);
      setTotalPatientsCount(totalCount);
      setTotalActiveCount(totalCount - dischargedCount);

      // 2. Build Paginated Query
      let q = query(
        collection(db, 'rehab_patients'),
        orderBy('createdAt', sortMethod.includes('asc') ? 'asc' : 'desc'),
        limit(PAGE_SIZE)
      );

      if (statusFilter !== 'all') {
        q = query(q, where('isActive', '==', statusFilter === 'active'));
      }

      if (isNext && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snap = await getDocs(q);
      if (snap.empty) {
        setHasMore(false);
        setPatients([]);
        return;
      }

      setLastVisible(snap.docs[snap.docs.length - 1]);
      setFirstVisible(snap.docs[0]);
      setHasMore(snap.docs.length === PAGE_SIZE);

      const patientDocs = snap.docs;
      const patientIds = patientDocs.map(d => d.id);

      // 3. Only fetch fees and canteen for THESE 20 patients (Save hundreds of reads!)
      const [feesSnap, canteenSnap] = await Promise.all([
        getDocs(query(collection(db, 'rehab_fees'), where('patientId', 'in', patientIds))),
        getDocs(query(collection(db, 'rehab_canteen'), where('patientId', 'in', patientIds))),
      ]);
      
      const feesMap: Record<string, any[]> = {};
      feesSnap.docs.forEach(d => {
        const data = d.data();
        if (!feesMap[data.patientId]) feesMap[data.patientId] = [];
        feesMap[data.patientId].push(data);
      });

      const canteenMap: Record<string, any[]> = {};
      canteenSnap.docs.forEach(d => {
        const data = d.data();
        if (!canteenMap[data.patientId]) canteenMap[data.patientId] = [];
        canteenMap[data.patientId].push(data);
      });

      const paginatedData = patientDocs.map(d => {
        const data = d.data() as Patient;
        const admissionDate = toDate(data.admissionDate);
        const pFees = feesMap[d.id] || [];
        const pCanteen = canteenMap[d.id] || [];
        
        const pkgAmount = Number(data.monthlyPackage) || Number(data.packageAmount) || 0;
        
        const endDate = data.isActive === false && data.dischargeDate 
          ? toDate(data.dischargeDate) 
          : new Date();
          
        const daysSinceAdmission = Math.max(0, Math.floor((endDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        // ── UNIFIED MONTHLY DUES LOGIC (MATCHES PROFILE & REPORTS) ──
        const rawMonths = (endDate.getFullYear() - admissionDate.getFullYear()) * 12 + (endDate.getMonth() - admissionDate.getMonth());
        let completedMonths = rawMonths;
        let hasExtraDays = false;

        if (endDate.getDate() < admissionDate.getDate()) {
          completedMonths = rawMonths - 1;
          hasExtraDays = true;
        } else if (endDate.getDate() > admissionDate.getDate()) {
          completedMonths = rawMonths;
          hasExtraDays = true;
        } else {
          completedMonths = rawMonths;
          hasExtraDays = false;
        }

        const billableMonths = Math.max(1, completedMonths + (hasExtraDays ? 1 : 0));
        const totalDueTillDate = billableMonths * pkgAmount;
        const medCharges = Number(data.medicineCharges || 0);
        
        let totalReceived = 0;
        pFees.forEach(f => {
          (f.payments || []).forEach((p: any) => {
            const status = p.status || 'approved';
            if (status === 'approved') totalReceived += Number(p.amount || 0);
          });
        });

        const remaining = (totalDueTillDate + medCharges) - totalReceived;

        const totalCanteenDeposited = pCanteen.reduce((a, c) => a + (Number(c.totalDeposited) || 0), 0);
        const totalCanteenSpent = pCanteen.reduce((a, c) => a + (Number(c.totalSpent) || 0), 0);
        const canteenBalance = totalCanteenDeposited - totalCanteenSpent;

        const months = Math.floor(daysSinceAdmission / 30);
        const days = daysSinceAdmission % 30;
        const durationFormatted = months > 0 ? `${months}M ${days}D` : `${days} Days`;

        return {
          id: d.id,
          name: data.name || '',
          fatherName: data.fatherName || '',
          photoUrl: data.photoUrl || null,
          admissionDate,
          monthlyPackage: pkgAmount,
          inpatientNumber: data.inpatientNumber || '',
          patientId: (data as any).patientId || '',
          rejoinHistory: (data as any).rejoinHistory || [],
          serialNumber: Number(data.serialNumber) || 0,
          substanceOfAddiction: data.substanceOfAddiction || '',
          isActive: data.isActive !== false,
          contactNumber: data.contactNumber || '',
          remaining: Number.isNaN(remaining) ? 0 : remaining,
          canteenBalance: Number.isNaN(canteenBalance) ? 0 : canteenBalance,
          totalPkg: totalDueTillDate,
          totalReceived,
          daysSinceAdmission,
          durationFormatted,
          createdAt: toDate(data.createdAt),
        };
      });

      setPatients(paginatedData);
    } catch (err: any) {
      console.error('Fetch patients error:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAllPatientsForSearch = async () => {
      try {
        const snap = await getDocs(collection(db, 'rehab_patients'));
        const allData = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllPatients(allData);
      } catch (err: any) {
        console.error('Error fetching all patients for search:', err?.message);
      }
    };
    fetchAllPatientsForSearch();
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [statusFilter, sortMethod]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const matches = allPatients.filter((p) => {
      const ids: string[] = [];
      if (p.inpatientNumber) ids.push(String(p.inpatientNumber));
      if (p.patientId) ids.push(String(p.patientId));
      if (p.id) ids.push(String(p.id));

      if (p.rejoinHistory && Array.isArray(p.rejoinHistory)) {
        p.rejoinHistory.forEach((stay: any) => {
          if (stay.patientId) ids.push(String(stay.patientId));
          if (stay.inpatientNumber) ids.push(String(stay.inpatientNumber));
          if (stay.rejoinDetails?.patientId) ids.push(String(stay.rejoinDetails.patientId));
          if (stay.rejoinDetails?.inpatientNumber) ids.push(String(stay.rejoinDetails.inpatientNumber));
        });
      }

      return (p.name || '').toLowerCase().includes(q) ||
        ids.some(id => id.toLowerCase().includes(q)) ||
        (p.fatherName || '').toLowerCase().includes(q) ||
        String(p.serialNumber || '').toLowerCase().includes(q);
    });
    setSearchResults(matches.slice(0, 10));
    setSearchOpen(true);
  }, [searchQuery, allPatients]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const availableYears = Array.from(new Set(patients.map(p => p.admissionDate.getFullYear()))).sort((a, b) => b - a);

  let filteredPatients = patients.filter(p => {
    if (statusFilter === 'active' && !p.isActive) return false;
    if (statusFilter === 'discharged' && p.isActive) return false;
    if (yearFilter !== 'all' && p.admissionDate.getFullYear().toString() !== yearFilter) return false;
    
    if (searchQuery) {
      const s = searchQuery.toLowerCase();
      const ids: string[] = [];
      if (p.inpatientNumber) ids.push(String(p.inpatientNumber));
      if (p.patientId) ids.push(String(p.patientId));
      if (p.id) ids.push(String(p.id));

      if (p.rejoinHistory && Array.isArray(p.rejoinHistory)) {
        p.rejoinHistory.forEach((stay: any) => {
          if (stay.patientId) ids.push(String(stay.patientId));
          if (stay.inpatientNumber) ids.push(String(stay.inpatientNumber));
          if (stay.rejoinDetails?.patientId) ids.push(String(stay.rejoinDetails.patientId));
          if (stay.rejoinDetails?.inpatientNumber) ids.push(String(stay.rejoinDetails.inpatientNumber));
        });
      }

      return (
        (p.name || '').toLowerCase().includes(s) ||
        ids.some(id => id.toLowerCase().includes(s)) ||
        (p.substanceOfAddiction || '').toLowerCase().includes(s) ||
        (p.fatherName || '').toLowerCase().includes(s) ||
        String(p.serialNumber || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  filteredPatients.sort((a, b) => {
    if (sortMethod === 'newest') return b.createdAt.getTime() - a.createdAt.getTime();
    if (sortMethod === 'oldest') return a.createdAt.getTime() - b.createdAt.getTime();
    if (sortMethod === 'admission_desc') return b.admissionDate.getTime() - a.admissionDate.getTime();
    if (sortMethod === 'admission_asc') return a.admissionDate.getTime() - b.admissionDate.getTime();
    return b.serialNumber - a.serialNumber;
  });

  const totalActive = totalActiveCount;
  const totalDischarged = totalDischargedCount;

  // ── DYNAMIC OUTSTANDING DUES & EARNED COMPUTATIONS ──
  const totalOutstanding = allPatients
    .filter(p => {
      if (statusFilter === 'active') return p.isActive !== false;
      if (statusFilter === 'discharged') return p.isActive === false;
      return true;
    })
    .reduce((sum, p) => {
      const rem = Number(p.remaining ?? p.overallRemaining ?? p.remainingBalance ?? p.amountRemaining ?? 0);
      return sum + (Number.isNaN(rem) ? 0 : rem);
    }, 0);

  const totalEarned = allPatients
    .filter(p => {
      if (statusFilter === 'active') return p.isActive !== false;
      if (statusFilter === 'discharged') return p.isActive === false;
      return true;
    })
    .reduce((sum, p) => {
      const rec = Number(p.totalReceived ?? p.overallReceived ?? 0);
      return sum + (Number.isNaN(rec) ? 0 : rec);
    }, 0);

  // ── DISCHARGE ANALYTICS COMPUTATION ──
  const start = analyticsStartDate ? new Date(analyticsStartDate + 'T00:00:00') : null;
  const end = analyticsEndDate ? new Date(analyticsEndDate + 'T23:59:59') : null;

  const dischargedInPeriod = allPatients.filter(p => {
    if (p.isActive !== false) return false;
    if (!p.dischargeDate) return false;
    const dDate = toDate(p.dischargeDate);
    if (start && dDate < start) return false;
    if (end && dDate > end) return false;
    return true;
  });

  let totalStayDays = 0;
  dischargedInPeriod.forEach(p => {
    const adm = toDate(p.admissionDate);
    const dsc = toDate(p.dischargeDate);
    const diffMs = dsc.getTime() - adm.getTime();
    const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    totalStayDays += days;
  });

  const avgStayDays = dischargedInPeriod.length > 0 ? Math.round(totalStayDays / dischargedInPeriod.length) : 0;

  const analyticsTotalReceived = dischargedInPeriod.reduce((sum, p) => {
    return sum + Number(p.totalReceived ?? p.overallReceived ?? 0);
  }, 0);

  const analyticsTotalRemaining = dischargedInPeriod.reduce((sum, p) => {
    return sum + Number(p.remaining ?? p.overallRemaining ?? p.remainingBalance ?? p.amountRemaining ?? 0);
  }, 0);

  const substanceCounts: Record<string, number> = {};
  dischargedInPeriod.forEach(p => {
    let sub = (p.substanceOfAddiction || 'Unknown').trim();
    if (!sub) sub = 'Unknown';
    const parts = sub.split(/[,+/]/).map((x: string) => x.trim().toUpperCase()).filter(Boolean);
    parts.forEach((part: string) => {
      substanceCounts[part] = (substanceCounts[part] || 0) + 1;
    });
  });

  const topSubstances = Object.entries(substanceCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 md:p-8 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
              <Heart className="w-6 h-6 text-teal-600" />
              Patients
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Manage all patients and their recovery journey</p>
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`px-4 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all whitespace-nowrap border ${
                showAnalytics
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              {showAnalytics ? 'Hide Analytics' : 'Discharge Analytics'}
            </button>
            <Link 
              href="/departments/rehab/dashboard/admin/patients/new"
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-900/10 active:scale-95 transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Patient
            </Link>
          </div>
        </div>

        {/* Expandable Discharge Analytics Section */}
        {showAnalytics && (
          <div className="bg-white rounded-3xl p-5 md:p-6 shadow-md border border-gray-100 space-y-6 transition-all duration-300 animate-in slide-in-from-top-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-4">
              <div>
                <h2 className="text-md font-black text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-600" />
                  Discharge Analytics & Insights
                </h2>
                <p className="text-xs text-gray-400 font-medium">Analyze and inspect discharged patient history and metrics</p>
              </div>
              <button 
                onClick={() => setShowAnalytics(false)}
                className="self-end sm:self-auto text-gray-400 hover:text-gray-900 transition-colors p-1.5 rounded-lg hover:bg-gray-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Range selection */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
              <div className="flex flex-wrap gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                {[
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_month', label: 'Last Month' },
                  { id: 'last_90_days', label: 'Last 90 Days' },
                  { id: 'custom', label: 'Custom Range' }
                ].map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setAnalyticsPreset(preset.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      analyticsPreset === preset.id
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {analyticsPreset === 'custom' && (
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="flex-1 sm:w-44">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={analyticsStartDate}
                      onChange={e => setAnalyticsStartDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-gray-900"
                    />
                  </div>
                  <div className="flex-1 sm:w-44">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">End Date</label>
                    <input
                      type="date"
                      value={analyticsEndDate}
                      onChange={e => setAnalyticsEndDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-gray-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* KPI metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-teal-50/50 to-teal-50 border border-teal-100/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-teal-700 uppercase tracking-widest">Total Discharged</span>
                  <Users className="w-4 h-4 text-teal-600" />
                </div>
                <p className="text-2xl font-black text-teal-900">{dischargedInPeriod.length}</p>
                <p className="text-[9px] text-teal-600 font-bold mt-1">In selected range</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50/50 to-blue-50 border border-blue-100/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Avg. Stay Duration</span>
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-black text-blue-900">
                  {avgStayDays === 0 ? '—' : `${avgStayDays} ${avgStayDays === 1 ? 'Day' : 'Days'}`}
                </p>
                <p className="text-[9px] text-blue-600 font-bold mt-1">Admission to Discharge</p>
              </div>

              <div className="bg-gradient-to-br from-green-50/50 to-green-50 border border-green-100/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">Revenue Liquidated</span>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-xl font-black text-green-900">₨{analyticsTotalReceived.toLocaleString()}</p>
                <p className="text-[9px] text-green-600 font-bold mt-1">Total payments collected</p>
              </div>

              <div className="bg-gradient-to-br from-red-50/50 to-red-50 border border-red-100/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-red-700 uppercase tracking-widest">Pending Dues</span>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-xl font-black text-red-900">₨{analyticsTotalRemaining.toLocaleString()}</p>
                <p className="text-[9px] text-red-600 font-bold mt-1">Unpaid balance remaining</p>
              </div>
            </div>

            {/* Detailed Patient List & Addiction Profile Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
              {/* Patient List */}
              <div className="lg:col-span-2 space-y-3">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">Discharged Patients List ({dischargedInPeriod.length})</h3>
                {dischargedInPeriod.length === 0 ? (
                  <div className="bg-gray-50/50 border border-dashed border-gray-150 rounded-2xl p-8 text-center text-gray-400 text-xs font-bold">
                    No patients discharged in the selected date range.
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded-2xl divide-y divide-gray-50 bg-white shadow-sm">
                    {dischargedInPeriod.map(p => {
                      const stay = Math.max(0, Math.floor((toDate(p.dischargeDate).getTime() - toDate(p.admissionDate).getTime()) / (1000 * 60 * 60 * 24)));
                      const pRemaining = Number(p.remaining ?? p.overallRemaining ?? p.remainingBalance ?? p.amountRemaining ?? 0);
                      return (
                        <div key={p.id} className="flex items-center justify-between p-3 hover:bg-teal-50/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 font-black text-xs">
                              {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-800">{p.name}</p>
                              <p className="text-[9px] text-gray-400 font-mono">
                                {p.inpatientNumber || `#${p.serialNumber}`} • {stay} Days Stay
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Discharged</p>
                              <p className="text-[10px] font-black text-gray-600">
                                {formatDateDMY(toDate(p.dischargeDate))}
                              </p>
                            </div>

                            {pRemaining > 0 ? (
                              <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                                ₨{pRemaining.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                                Paid
                              </span>
                            )}

                            <Link
                              href={`/departments/rehab/dashboard/admin/patients/${p.id}`}
                              className="text-teal-600 hover:text-teal-700 p-1 hover:bg-teal-50 rounded transition-colors"
                            >
                              <ChevronRight size={16} />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Addiction Profile */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">Substance Breakdown</h3>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-4">
                  {topSubstances.length === 0 ? (
                    <div className="text-center text-gray-400 text-xs font-bold py-8">
                      No data available
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {topSubstances.map((sub, i) => {
                        const percent = dischargedInPeriod.length > 0 ? Math.round((sub.count / dischargedInPeriod.length) * 100) : 0;
                        return (
                          <div key={sub.name} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-gray-700">
                              <span className="truncate pr-2">{sub.name}</span>
                              <span className="text-teal-600 flex-shrink-0">{sub.count} ({percent}%)</span>
                            </div>
                            <div className="w-full bg-gray-50 rounded-full h-2 overflow-hidden border border-gray-100/50">
                              <div 
                                className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-500" 
                                style={{ width: `${percent}%` }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 flex-shrink-0"><User className="w-4 h-4" /></div>
              <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active</p><p className="text-xl font-black text-gray-900">{totalActive}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 flex-shrink-0"><Calendar className="w-4 h-4" /></div>
              <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Discharged</p><p className="text-xl font-black text-gray-900">{totalDischarged}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0"><TrendingUp className="w-4 h-4" /></div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  {statusFilter === 'active' ? 'Active Earned' : statusFilter === 'discharged' ? 'Discharged Earned' : 'Total Earned'}
                </p>
                <p className="text-xl font-black text-emerald-600">₨{totalEarned.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0"><DollarSign className="w-4 h-4" /></div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  {statusFilter === 'active' ? 'Active Dues' : statusFilter === 'discharged' ? 'Discharged Dues' : 'Total Dues'}
                </p>
                <p className="text-xl font-black text-red-600">₨{totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0"><User className="w-4 h-4" /></div>
              <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Patients</p><p className="text-xl font-black text-gray-900">{totalPatientsCount}</p></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setSearchOpen(true)}
                placeholder="Search by name, inpatient #, or father's name..."
                className="w-full bg-white border border-gray-100 rounded-[1.5rem] pl-12 pr-12 py-4 text-gray-900 text-sm font-bold outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all shadow-sm placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-100 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <div className="p-2">
                  {searchResults.map((p) => (
                    <Link
                      key={p.id}
                      href={`/departments/rehab/dashboard/admin/patients/${p.id}`}
                      onClick={() => {
                        setSearchOpen(false);
                      }}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-teal-50/50 rounded-2xl transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-black text-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                        {String(p.name || '?')[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-gray-900 text-sm font-black">{p.name}</p>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                          {p.inpatientNumber || `#${p.serialNumber}`}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {searchOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
            )}
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center">
            <div className="flex gap-2 p-1.5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm">
              {['all', 'active', 'discharged'].map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    statusFilter === f 
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/10' 
                      : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-1 sm:flex-none">
              <select 
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
                className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-xs font-black text-gray-600 uppercase tracking-widest shadow-sm outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="all">All Years</option>
                {availableYears.map(y => (
                  <option key={y} value={y.toString()}>{y}</option>
                ))}
              </select>

              <div className="relative flex-1 sm:flex-none flex items-center bg-white border border-gray-100 rounded-xl shadow-sm px-2">
                <Filter className="w-3 h-3 text-gray-400 ml-2 absolute pointer-events-none" />
                <select 
                  value={sortMethod}
                  onChange={e => setSortMethod(e.target.value)}
                  className="w-full bg-transparent border-none rounded-xl pl-8 pr-4 py-2 text-xs font-black text-gray-600 uppercase tracking-widest outline-none cursor-pointer appearance-none"
                >
                  <option value="newest">Added: Newest</option>
                  <option value="oldest">Added: Oldest</option>
                  <option value="admission_desc">Admission: Latest</option>
                  <option value="admission_asc">Admission: Oldest</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-black text-gray-900 mb-1">No patients found</h3>
            <p className="text-gray-500 text-sm">{searchQuery ? "Try adjusting your search." : "Add your first patient to get started."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPatients.map(patient => (
              <Link 
                href={`/departments/rehab/dashboard/admin/patients/${patient.id}`} 
                key={patient.id}
                className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-teal-900/5 hover:border-teal-200 transition-all active:scale-[0.98] group flex flex-col h-full relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-500">
                        <ChevronRight size={16} />
                    </div>
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-shrink-0">
                        {patient.photoUrl ? (
                            <img src={patient.photoUrl} alt={patient.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md" />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 text-teal-700 flex items-center justify-center font-black text-xl border border-teal-200/50">
                                {patient.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${patient.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-gray-900 truncate leading-tight">{patient.name}</h3>
                        <p className="text-[10px] font-mono text-teal-600 font-bold">{patient.inpatientNumber || `#${patient.serialNumber}`}</p>
                        {patient.substanceOfAddiction && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-wider">
                            {patient.substanceOfAddiction}
                          </span>
                        )}
                    </div>
                </div>

                <div className="mt-auto space-y-3 pt-3 border-t border-gray-50">
                    <div>
                      <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        <span>Stay Duration</span>
                        <span>{patient.durationFormatted}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-teal-500 animate-pulse" style={{ width: '100%' }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                            <Calendar size={11} className="text-teal-400" />
                            {patient.admissionDate instanceof Date 
                                ? formatDateDMY(patient.admissionDate)
                                : 'No date'
                            }
                        </div>
                        {patient.remaining > 0 ? (
                          <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <AlertCircle size={10} />₨{patient.remaining.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <CheckCircle size={10} /> Paid
                          </span>
                        )}
                    </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-8 pb-10">
          <button
            onClick={() => {
               setPage(1);
               fetchPatients();
            }}
            disabled={page === 1}
            className="px-6 py-2.5 rounded-xl bg-white border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-500 disabled:opacity-50 hover:bg-gray-50 transition-all shadow-sm"
          >
            Reset to Start
          </button>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Page {page}</span>
          <button
            onClick={() => {
               setPage(p => p + 1);
               fetchPatients(true);
            }}
            disabled={!hasMore}
            className="px-6 py-2.5 rounded-xl bg-white border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-500 disabled:opacity-50 hover:bg-gray-50 transition-all shadow-sm"
          >
            Next Page
          </button>
        </div>
      </div>
    </div>
  );
}
