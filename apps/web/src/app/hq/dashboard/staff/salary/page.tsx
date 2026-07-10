'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DollarSign, FileText, Image as ImageIcon, Printer, Calendar, Shield, Award, Loader2, ArrowLeft } from 'lucide-react';
import { getDeptPrefix, type StaffDept } from '@/lib/hq/superadmin/staff';
import Link from 'next/link';

interface SalaryRecord {
  id: string;
  month: string;
  basicSalary: number;
  netSalary: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  actionDays: number;
  absentDeduction?: number;
  fine?: number;
  advance?: number;
  bonus?: number;
  otherEarnings?: number;
  otherDeductions?: number;
  bonusReason?: string;
  deductionReason?: string;
  status: string;
  slipFileUrl?: string;
  slipFileName?: string;
  proofFileUrl?: string;
  proofFileName?: string;
  createdAt: string;
}

export default function StaffSalaryHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('hq_session');
    if (!raw) {
      router.push('/hq/login');
      return;
    }

    let session: any;
    try {
      session = JSON.parse(raw);
    } catch {
      router.push('/hq/login');
      return;
    }

    const uid = session.uid;
    if (!uid) {
      router.push('/hq/login');
      return;
    }

    const fetchSalaryData = async () => {
      setLoading(true);
      try {
        // 1. Fetch staff profile
        const userDoc = await getDoc(doc(db, 'hq_users', uid));
        if (!userDoc.exists()) {
          setError('Profile not found. Please contact your administrator.');
          setLoading(false);
          return;
        }
        const userData = userDoc.data();
        setProfile(userData);

        const dept = (userData.department || 'hq') as StaffDept;
        const prefix = getDeptPrefix(dept);
        const colName = `${prefix}_salary_records`;

        // Gather all candidate IDs to match (uid, customId, employeeId, customId with/without prefix)
        const candidateSet = new Set<string>([uid]);
        if (userData.customId) {
          candidateSet.add(userData.customId);
          candidateSet.add(userData.customId.startsWith(`${prefix}_`) ? userData.customId.replace(`${prefix}_`, '') : userData.customId);
          candidateSet.add(userData.customId.startsWith(`${prefix}_`) ? userData.customId : `${prefix}_${userData.customId}`);
        }
        if (userData.employeeId) {
          candidateSet.add(userData.employeeId);
          candidateSet.add(userData.employeeId.startsWith(`${prefix}_`) ? userData.employeeId.replace(`${prefix}_`, '') : userData.employeeId);
          candidateSet.add(userData.employeeId.startsWith(`${prefix}_`) ? userData.employeeId : `${prefix}_${userData.employeeId}`);
        }
        if (uid) {
          candidateSet.add(uid.startsWith(`${prefix}_`) ? uid.replace(`${prefix}_`, '') : uid);
          candidateSet.add(uid.startsWith(`${prefix}_`) ? uid : `${prefix}_${uid}`);
        }

        const candidateIds = Array.from(candidateSet).filter(Boolean);

        const allRecords: SalaryRecord[] = [];
        const seenIds = new Set<string>();

        // Query by candidate IDs
        for (const cid of candidateIds) {
          const q = query(collection(db, colName), where('staffId', '==', cid));
          const snap = await getDocs(q).catch(() => ({ docs: [] } as any));
          snap.docs.forEach((docSnap: any) => {
            if (!seenIds.has(docSnap.id)) {
              seenIds.add(docSnap.id);
              allRecords.push({ id: docSnap.id, ...docSnap.data() } as SalaryRecord);
            }
          });
        }

        // Sort by month descending
        allRecords.sort((a, b) => (b.month || '').localeCompare(a.month || ''));
        setSalaryRecords(allRecords);

      } catch (err: any) {
        console.error('Error fetching staff salary records:', err);
        setError('Failed to load salary history. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSalaryData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-gray-700" />
          <p className="text-gray-500 text-sm font-medium">Loading your salary history…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-red-100 text-center max-w-md w-full">
          <Shield className="text-red-400 mx-auto mb-4" size={40} />
          <p className="text-red-600 font-semibold text-sm mb-4">{error}</p>
          <Link href="/hq/dashboard/staff" className="text-sm text-indigo-600 font-bold hover:underline">
            Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link href="/hq/dashboard/staff" className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Financial Records</h2>
        </div>

        {/* Header Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">My Salary History</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Official salary slips and disbursements</p>
          </div>
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Base Salary</p>
            <p className="text-base font-black">₨{(profile?.monthlySalary || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Salary Records List */}
        {salaryRecords.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <DollarSign className="mx-auto text-gray-300 mb-2" size={32} strokeWidth={1.5} />
            <h3 className="text-sm font-bold text-gray-600">No salary records released yet</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Your monthly salary records and proofs will be displayed here once finalized by the manager.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {salaryRecords.map(record => (
              <div key={record.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 transition-all">
                <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-gray-50 pb-4">
                  <div className="flex gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      record.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      record.status === 'approved' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-gray-900 uppercase tracking-tight">
                        {record.month ? new Date(record.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown Month'}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                          record.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          record.status === 'approved' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {record.status}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                          {record.presentDays} Present · {record.absentDays} Absent
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right flex items-center sm:block justify-between shrink-0">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Net Disbursed</span>
                    <span className="text-lg font-black text-emerald-700">₨{record.netSalary.toLocaleString()}</span>
                  </div>
                </div>

                {/* Subdetails Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Base Salary</span>
                    <span className="font-bold text-gray-800">₨{(record.basicSalary || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Bonus / Incentives</span>
                    <span className="font-bold text-emerald-600">₨{((record.bonus || 0) + (record.otherEarnings || 0)).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Deductions / Fines</span>
                    <span className="font-bold text-rose-600">
                      ₨{((record.absentDeduction || 0) + (record.fine || 0) + (record.advance || 0) + (record.otherDeductions || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => {
                        const prefix = getDeptPrefix((profile?.department || 'hq') as StaffDept);
                        window.open(`/hq/print-salary/${prefix}/${record.id}`, '_blank');
                      }}
                      className="inline-flex items-center gap-1 bg-gray-50 hover:bg-gray-100 border border-gray-250 text-gray-700 font-bold text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-xl transition-colors"
                      title="Print Slip"
                    >
                      <Printer size={12} /> Print Slip
                    </button>
                  </div>
                </div>

                {/* Proofs Section */}
                {(record.slipFileUrl || record.proofFileUrl) && (
                  <div className="mt-4 pt-4 border-t border-dashed border-gray-100 flex flex-col sm:flex-row gap-3">
                    {record.slipFileUrl && (
                      <a
                        href={record.slipFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center gap-2 p-3 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/50 rounded-xl transition-colors min-w-0"
                      >
                        <FileText size={16} className="text-indigo-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Salary Slip Document</p>
                          <p className="text-xs text-indigo-800 font-bold truncate">
                            {record.slipFileName || 'View Salary Slip PDF/Image'}
                          </p>
                        </div>
                      </a>
                    )}
                    {record.proofFileUrl && (
                      <a
                        href={record.proofFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center gap-2 p-3 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/50 rounded-xl transition-colors min-w-0"
                      >
                        <ImageIcon size={16} className="text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Disbursement Proof</p>
                          <p className="text-xs text-emerald-800 font-bold truncate">
                            {record.proofFileName || 'View Payment Screenshot'}
                          </p>
                        </div>
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
