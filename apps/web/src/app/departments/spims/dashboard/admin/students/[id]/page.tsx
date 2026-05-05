// apps/web/src/app/departments/spims/dashboard/admin/students/[id]/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, GraduationCap, RefreshCw, FileText, Camera, X } from 'lucide-react';
import { getUnifiedStudent, fetchStudentFees } from '@/lib/spims/students';
import { toPng } from 'html-to-image';
import { formatDateDMY, toDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { useRef } from 'react';
import type { SpimsStudent } from '@/types/spims';
import AdmissionTab from '@/components/spims/student-profile/AdmissionTab';
import FeeRecordTab from '@/components/spims/student-profile/FeeRecordTab';
import ExamRecordTab from '@/components/spims/student-profile/ExamRecordTab';
import DocumentsTab from '@/components/spims/student-profile/DocumentsTab';
import FinanceSummaryTab from '@/components/spims/student-profile/FinanceSummaryTab';
import ProfileHeader from '@/components/spims/student-profile/ProfileHeader';

type Tab = 'admission' | 'fees' | 'exam' | 'documents' | 'finance';

export default function AdminStudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [session, setSession] = useState<{ uid: string; displayName?: string; role: string } | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [tab, setTab] = useState<Tab>('admission');
  const [loading, setLoading] = useState(true);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [s, fees] = await Promise.all([
        getUnifiedStudent(studentId),
        fetchStudentFees(studentId)
      ]);
      
      if (s) {
        // Calculate Billable Months (same as Rehab)
        const admission = toDate(s.admissionDate);
        const now = new Date();
        const billableMonths = (now.getFullYear() - admission.getFullYear()) * 12 + (now.getMonth() - admission.getMonth()) + 1;
        
        const monthlyFee = Number(s.monthlyFee || 0);
        const dueTillDate = billableMonths * monthlyFee;
        const totalReceived = fees.filter(f => f.status === 'approved').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        setStudent({
          ...s,
          billableMonths,
          dueTillDate,
          totalReceived,
          remaining: Math.max(0, dueTillDate - totalReceived)
        });
      }
      setAllPayments(fees);
    } catch (err) {
      console.error("Load error", err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    let sessionData = localStorage.getItem('spims_session');
    
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
      router.push('/departments/spims/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/spims/login');
      return;
    }
    setSession(parsed);
    void load();
  }, [router, load]);

  if (!session || loading || !student) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-9 h-9 animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'admission', label: 'Admission' },
    { id: 'fees', label: 'Fee record' },
    { id: 'exam', label: 'Exam record' },
    { id: 'documents', label: 'Documents' },
    { id: 'finance', label: 'Finance summary' },
  ];

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-8 pb-24">
      <Link
        href="/departments/spims/dashboard/admin/students"
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#1D9E75] transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={3} /> Students Registry
      </Link>

      <ProfileHeader 
        student={student} 
        onGenerateReport={() => setShowReportModal(true)}
      />

      {student.isVirtual && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <GraduationCap size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">Login Account Only</h3>
              <p className="text-xs font-medium text-amber-700/80">This student has a login account but no admission profile. Complete their admission to enable full tracking.</p>
            </div>
          </div>
          <Link
            href={`/departments/spims/dashboard/admin/students/new?prefill_uid=${student.login?.uid || student.id}&prefill_name=${encodeURIComponent(student.name)}&prefill_login_id=${student.login?.customId || student.login?.studentId || ''}`}
            className="whitespace-nowrap bg-amber-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-600/20 hover:scale-105 active:scale-95 transition-all"
          >
            Complete Admission
          </Link>
        </div>
      )}

      {!student.isVirtual && (student.status === 'Pass' || student.status === 'Left' || student.status === 'Fail') && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <RefreshCw size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Ready for Re-admission?</h3>
              <p className="text-xs font-medium text-indigo-700/80">This student has {student.status.toLowerCase()} their previous session. You can start a new admission for them.</p>
            </div>
          </div>
          <Link
            href={`/departments/spims/dashboard/admin/students/new?prefill_uid=${student.login?.uid || ''}&prefill_name=${encodeURIComponent(student.name)}&prefill_login_id=${student.login?.customId || student.rollNo || ''}&re_admission_from=${student.id}`}
            className="whitespace-nowrap bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
          >
            New Admission / Re-join
          </Link>
        </div>
      )}

      <div className="space-y-6">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          <div className="flex sm:flex-wrap gap-2 md:gap-3 p-1.5 bg-gray-100/50 rounded-[1.5rem] w-fit min-w-max sm:min-w-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-5 md:px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  tab === t.id 
                    ? 'bg-white text-[#1D9E75] shadow-lg shadow-gray-200/50 transform -translate-y-0.5' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-gray-100 bg-white p-6 md:p-10 shadow-xl shadow-gray-200/50 min-h-[400px]">

        {tab === 'admission' && <AdmissionTab student={student} session={session} onSaved={load} />}
        {tab === 'fees' && <FeeRecordTab student={student} session={session} />}
        {tab === 'exam' && <ExamRecordTab student={student} session={session} onSaved={load} />}
        {tab === 'documents' && <DocumentsTab studentId={student.id} session={session} />}
        {tab === 'finance' && <FinanceSummaryTab student={student} />}
      </div>
    </div>
      {showReportModal && (
        <ReportModal 
          student={student} 
          allPayments={allPayments} 
          onClose={() => setShowReportModal(false)} 
        />
      )}
    </div>
  );
}

const ReportModal = ({ student, allPayments, onClose }: { student: any, allPayments: any[], onClose: () => void }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [reportData, setReportData] = useState({
    name: student.name,
    fatherName: student.fatherName || '',
    rollNo: student.rollNo || '',
    studentId: student.studentId || '',
    course: student.course || '',
    admissionDate: formatDateDMY(student.admissionDate),
    address: student.address || '',
    monthlyFee: Number(student.monthlyFee || 0),
    billableMonths: student.billableMonths || 1,
    totalDue: student.dueTillDate || 0,
    receivedAmount: student.totalReceived || 0,
    remainingAmount: student.remaining || 0,
    transactions: allPayments
      .filter(p => p.status === 'approved')
      .sort((a, b) => {
        const dateA = a.date instanceof Object ? a.date.toDate().getTime() : new Date(a.date).getTime();
        const dateB = b.date instanceof Object ? b.date.toDate().getTime() : new Date(b.date).getTime();
        return dateB - dateA;
      })
  });

  const downloadReport = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(reportRef.current, { 
        cacheBust: true, 
        backgroundColor: '#fff',
        pixelRatio: 2
      });
      const link = document.createElement('a');
      link.download = `Student-Report-${reportData.name}-${new Date().toLocaleDateString()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed', err);
      toast.error('Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
        <div className="p-8 border-b dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Student Statement</h2>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Review and Edit Before Downloading</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-200 dark:hover:bg-white/10 rounded-2xl transition-all active:scale-90">
             <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-10 bg-slate-100 dark:bg-black/20">
          <div ref={reportRef} className="bg-white shadow-2xl rounded-[1.5rem] p-8 sm:p-16 mx-auto w-full max-w-[850px] text-gray-900 font-sans min-h-[1100px] border border-gray-100">
            {/* Report Header */}
            <div className="flex justify-between items-start border-b-4 border-gray-900 pb-8 mb-10">
               <div className="space-y-1">
                  <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">Academic</h1>
                  <h1 className="text-4xl font-black uppercase tracking-tighter text-[#1D9E75] leading-none">Statement</h1>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-4">SPIMS Medical Institute</p>
               </div>
               <div className="text-right">
                  <div className="bg-gray-900 text-white px-4 py-2 rounded-lg inline-block font-black text-xs uppercase tracking-widest">
                     Official Report
                  </div>
                  <p className="text-xs font-bold text-gray-500 mt-4 uppercase">Date: {new Date().toLocaleDateString('en-GB')}</p>
               </div>
            </div>
            
            {/* Student Details Section */}
            <div className="grid grid-cols-2 gap-12 mb-12">
               <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D9E75] border-b border-[#1D9E75]/10 pb-2">Student Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Full Name</label>
                      <input 
                        className="text-lg font-black w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1"
                        value={reportData.name}
                        onChange={e => setReportData({...reportData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Father's Name</label>
                      <input 
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1"
                        value={reportData.fatherName}
                        onChange={e => setReportData({...reportData, fatherName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Roll Number</label>
                      <input 
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1"
                        value={reportData.rollNo}
                        onChange={e => setReportData({...reportData, rollNo: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Student ID</label>
                      <input 
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1"
                        value={reportData.studentId}
                        onChange={e => setReportData({...reportData, studentId: e.target.value})}
                      />
                    </div>
                  </div>
               </div>
               <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D9E75] border-b border-[#1D9E75]/10 pb-2">Academic Info</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Course Name</label>
                      <input 
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1"
                        value={reportData.course}
                        onChange={e => setReportData({...reportData, course: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Admission Date</label>
                      <input 
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1"
                        value={reportData.admissionDate}
                        onChange={e => setReportData({...reportData, admissionDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Address</label>
                      <textarea 
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-[#1D9E75] outline-none transition-colors py-1 resize-none"
                        rows={2}
                        value={reportData.address}
                        onChange={e => setReportData({...reportData, address: e.target.value})}
                      />
                    </div>
                  </div>
               </div>
            </div>
            
            {/* Financial Summary Box */}
            <div className="bg-gray-50 rounded-3xl p-8 mb-12 border border-gray-100 grid grid-cols-3 gap-8">
               <div className="relative">
                  <label className="text-[9px] font-black uppercase text-gray-500 block mb-2">Monthly Fee</label>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] font-black text-gray-400">PKR</span>
                    <input 
                      type="number"
                      className="text-2xl font-black w-full bg-transparent border-b border-gray-200 focus:border-[#1D9E75] outline-none py-1"
                      value={reportData.monthlyFee}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setReportData(prev => ({
                          ...prev,
                          monthlyFee: val,
                          totalDue: val * prev.billableMonths,
                          remainingAmount: (val * prev.billableMonths) - prev.receivedAmount
                        }));
                      }}
                    />
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-10 bg-gray-200"></div>
               </div>
               <div className="relative text-center">
                  <label className="text-[9px] font-black uppercase text-gray-500 block mb-2">Months Billable</label>
                  <input 
                    type="number"
                    className="text-2xl font-black w-full bg-transparent border-b border-gray-200 focus:border-[#1D9E75] outline-none py-1 text-center"
                    value={reportData.billableMonths}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setReportData(prev => ({
                        ...prev,
                        billableMonths: val,
                        totalDue: val * prev.monthlyFee,
                        remainingAmount: (val * prev.monthlyFee) - prev.receivedAmount
                      }));
                    }}
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-10 bg-gray-200"></div>
               </div>
               <div className="text-right">
                  <label className="text-[9px] font-black uppercase text-gray-500 block mb-2">Total Due</label>
                  <p className="text-2xl font-black text-gray-900 tracking-tighter">PKR {reportData.totalDue.toLocaleString()}</p>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 mb-12">
               <div className="p-8 bg-[#1D9E75]/5 rounded-3xl border-2 border-[#1D9E75]/10 flex flex-col justify-center">
                  <label className="text-[10px] font-black uppercase text-[#1D9E75] block mb-1 tracking-widest">Total Received</label>
                  <p className="text-3xl font-black text-[#1D9E75] tracking-tighter">PKR {reportData.receivedAmount.toLocaleString()}</p>
               </div>
               <div className="p-8 bg-red-50/50 rounded-3xl border-2 border-red-100 flex flex-col justify-center">
                  <label className="text-[10px] font-black uppercase text-red-600 block mb-1 tracking-widest">Outstanding</label>
                  <p className="text-3xl font-black text-red-900 tracking-tighter">PKR {reportData.remainingAmount.toLocaleString()}</p>
               </div>
            </div>
            
            {/* Transaction Log Table */}
            <div className="mb-12">
               <div className="flex items-center justify-between mb-6 border-b-2 border-gray-100 pb-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Fee Payment History</h3>
                  <div className="text-[9px] font-black text-gray-400 uppercase">{reportData.transactions.length} Entries</div>
               </div>
               <table className="w-full text-left text-sm border-collapse">
                  <thead>
                     <tr className="text-gray-400 uppercase text-[9px] font-black tracking-widest border-b border-gray-100">
                        <th className="py-4 px-2">Date</th>
                        <th className="py-4 px-2">Type / Note</th>
                        <th className="py-4 px-2 text-right">Amount (PKR)</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {reportData.transactions.map((p, idx) => (
                        <tr key={idx} className="font-bold text-gray-700 hover:bg-gray-50/50 transition-colors">
                           <td className="py-4 px-2 whitespace-nowrap text-xs">{formatDateDMY(p.date)}</td>
                           <td className="py-4 px-2 text-[10px] text-gray-500 uppercase tracking-tight">{p.type || 'Monthly Fee'} {p.month ? `(${p.month})` : ''}</td>
                           <td className="py-4 px-2 text-right text-[#1D9E75] font-black tracking-tighter">PKR {Number(p.amount).toLocaleString()}</td>
                        </tr>
                     ))}
                     {reportData.transactions.length === 0 && (
                        <tr>
                           <td colSpan={3} className="py-16 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest italic">No payment records found</td>
                        </tr>
                     )}
                  </tbody>
                  <tfoot>
                     <tr className="border-t-4 border-gray-900 font-black text-gray-900">
                        <td colSpan={2} className="py-6 px-2 uppercase tracking-[0.2em] text-[10px]">Net Fee Received</td>
                        <td className="py-6 px-2 text-right text-xl tracking-tighter">PKR {reportData.receivedAmount.toLocaleString()}</td>
                     </tr>
                  </tfoot>
               </table>
            </div>
            
            {/* Signature & Footer */}
            <div className="mt-20 pt-12 border-t border-gray-100">
               <div className="flex justify-between items-end">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-gray-900 uppercase">SPIMS Institute</p>
                     <p className="text-[9px] font-bold text-gray-400 uppercase">Medical Sciences & Technology</p>
                  </div>
                  <div className="w-48 border-b-2 border-gray-200 pb-2 text-center">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registrar Signature</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
        
        <div className="p-8 border-t dark:border-white/5 bg-white dark:bg-gray-900 flex justify-end gap-4">
           <button onClick={onClose} className="px-8 py-4 rounded-2xl font-black text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all uppercase tracking-widest active:scale-95">
             Close
           </button>
           <button 
             onClick={downloadReport} 
             disabled={isDownloading}
             className="px-10 py-4 bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white rounded-2xl font-black text-xs flex items-center gap-3 shadow-2xl shadow-[#1D9E75]/30 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest"
           >
             {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
             {isDownloading ? 'Generating...' : 'Download Statement'}
           </button>
        </div>
      </div>
    </div>
  );
};
