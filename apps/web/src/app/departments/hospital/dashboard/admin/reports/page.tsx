'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, query, orderBy, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { formatDateDMY } from '@/lib/utils';
import {
  FileBarChart, Printer, Calendar, TrendingUp, TrendingDown, DollarSign, Loader2,
  BarChart3, Plus, Search, Trash2, ClipboardList, Check, User, Heart, Layers, Eye
} from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatPKR(n: number) {
  return `Rs. ${n.toLocaleString('en-PK')}`;
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'financial' | 'lab' | 'operation' | 'shift'>('financial');

  // Common State
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Financial Report State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [financialReport, setFinancialReport] = useState<any>(null);
  const [finGenerated, setFinGenerated] = useState(false);

  // Lab Records State
  const [labRecords, setLabRecords] = useState<any[]>([]);
  const [labSearch, setLabSearch] = useState('');
  const [labForm, setLabForm] = useState({
    date: new Date().toISOString().split('T')[0],
    patientName: '',
    testName: '',
    result: '',
    referredBy: '',
    charges: '',
    expense: '',
    cashierSig: '',
    receiverSig: ''
  });

  // Operation Records State
  const [opRecords, setOpRecords] = useState<any[]>([]);
  const [opSearch, setOpSearch] = useState('');
  const [opForm, setOpForm] = useState({
    date: new Date().toISOString().split('T')[0],
    patientName: '',
    operationType: '',
    contactNo: '',
    referredBy: '',
    admitDate: new Date().toISOString().split('T')[0],
    dischargeDate: new Date().toISOString().split('T')[0],
    amount: '',
    cashierSig: '',
    receiverSig: ''
  });

  // Shift Reports State
  const [shiftReports, setShiftReports] = useState<any[]>([]);
  const [shiftForm, setShiftForm] = useState({
    date: new Date().toISOString().split('T')[0],
    morningIncome: '',
    morningExpense: '',
    morningCashierSig: '',
    morningReceiverSig: '',
    eveningIncome: '',
    eveningExpense: '',
    eveningCashierSig: '',
    eveningReceiverSig: '',
    noOfPatients: '',
    grandTotal: ''
  });

  // Print Dialog Preview States
  const [printPreviewType, setPrintPreviewType] = useState<'lab' | 'op' | 'shift' | 'fin' | null>(null);
  const [printTargetData, setPrintTargetData] = useState<any>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('hospital_session');
    if (!sessionData) { router.push('/departments/hospital/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/hospital/login'); return;
    }
    setSession(parsed);

    // Pre-fill signatures with cashier/admin name
    const name = parsed.name || 'Admin';
    setLabForm(f => ({ ...f, cashierSig: name, receiverSig: 'Verified' }));
    setOpForm(f => ({ ...f, cashierSig: name, receiverSig: 'Verified' }));
    setShiftForm(f => ({ ...f, morningCashierSig: name, morningReceiverSig: 'Verified', eveningCashierSig: name, eveningReceiverSig: 'Verified' }));

    // Load logs
    fetchLabRecords();
    fetchOpRecords();
    fetchShiftReports();
  }, [router]);

  // LAB RECORDS CRUD
  const fetchLabRecords = async () => {
    try {
      const q = query(collection(db, 'hospital_lab_records'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setLabRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labForm.patientName || !labForm.testName) {
      alert('Patient Name and Test Name are required.');
      return;
    }
    try {
      setSubmitting(true);
      const chargesVal = parseFloat(labForm.charges) || 0;
      const expenseVal = parseFloat(labForm.expense) || 0;
      const netVal = chargesVal - expenseVal;

      const docData = {
        ...labForm,
        charges: chargesVal,
        expense: expenseVal,
        netAmount: netVal,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'hospital_lab_records'), docData);
      alert('Lab Test Record Added Successfully!');
      
      // Reset Form keeping signatures and date
      setLabForm(f => ({
        ...f,
        patientName: '',
        testName: '',
        result: '',
        referredBy: '',
        charges: '',
        expense: ''
      }));
      fetchLabRecords();
    } catch (err) {
      console.error(err);
      alert('Error adding record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLab = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lab record?')) return;
    try {
      await deleteDoc(doc(db, 'hospital_lab_records', id));
      fetchLabRecords();
    } catch (e) {
      console.error(e);
    }
  };

  // OPERATION RECORDS CRUD
  const fetchOpRecords = async () => {
    try {
      const q = query(collection(db, 'hospital_operation_records'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setOpRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opForm.patientName || !opForm.operationType) {
      alert('Patient Name and Operation Type are required.');
      return;
    }
    try {
      setSubmitting(true);
      const amtVal = parseFloat(opForm.amount) || 0;

      const docData = {
        ...opForm,
        amount: amtVal,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'hospital_operation_records'), docData);
      alert('Operation Record Added Successfully!');
      
      setOpForm(f => ({
        ...f,
        patientName: '',
        operationType: '',
        contactNo: '',
        referredBy: '',
        amount: ''
      }));
      fetchOpRecords();
    } catch (err) {
      console.error(err);
      alert('Error adding record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOp = async (id: string) => {
    if (!confirm('Are you sure you want to delete this operation record?')) return;
    try {
      await deleteDoc(doc(db, 'hospital_operation_records', id));
      fetchOpRecords();
    } catch (e) {
      console.error(e);
    }
  };

  // SHIFT REPORTS CRUD
  const fetchShiftReports = async () => {
    try {
      const q = query(collection(db, 'hospital_shift_reports'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setShiftReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const mInc = parseFloat(shiftForm.morningIncome) || 0;
      const mExp = parseFloat(shiftForm.morningExpense) || 0;
      const mNet = mInc - mExp;

      const eInc = parseFloat(shiftForm.eveningIncome) || 0;
      const eExp = parseFloat(shiftForm.eveningExpense) || 0;
      const eNet = eInc - eExp;

      const totInc = mInc + eInc;
      const totExp = mExp + eExp;
      const totNet = totInc - totExp;

      const docData = {
        ...shiftForm,
        morningIncome: mInc,
        morningExpense: mExp,
        morningNetAmount: mNet,
        eveningIncome: eInc,
        eveningExpense: eExp,
        eveningNetAmount: eNet,
        totalIncome: totInc,
        totalExpense: totExp,
        netAmount: totNet,
        noOfPatients: parseInt(shiftForm.noOfPatients) || 0,
        grandTotal: parseFloat(shiftForm.grandTotal) || totNet,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'hospital_shift_reports'), docData);
      alert('Daily Shift Report Recorded Successfully!');
      
      setShiftForm(f => ({
        ...f,
        morningIncome: '',
        morningExpense: '',
        eveningIncome: '',
        eveningExpense: '',
        noOfPatients: '',
        grandTotal: ''
      }));
      fetchShiftReports();
    } catch (err) {
      console.error(err);
      alert('Error saving shift report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift report?')) return;
    try {
      await deleteDoc(doc(db, 'hospital_shift_reports', id));
      fetchShiftReports();
    } catch (e) {
      console.error(e);
    }
  };

  // FINANCIAL MONTHLY REPORT
  const handleGenerateFinancial = async () => {
    try {
      setLoading(true);
      const firstDay = new Date(selectedYear, selectedMonth, 1);
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

      // We pull lab records, operation records, and shift reports matching this month
      const lRecords = labRecords.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });

      const oRecords = opRecords.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });

      const sReports = shiftReports.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });

      // Income/Expense aggregates
      const labIncome = lRecords.reduce((sum, r) => sum + (r.charges || 0), 0);
      const labExpense = lRecords.reduce((sum, r) => sum + (r.expense || 0), 0);

      const opIncome = oRecords.reduce((sum, r) => sum + (r.amount || 0), 0);

      const shiftMorningIncome = sReports.reduce((sum, r) => sum + (r.morningIncome || 0), 0);
      const shiftMorningExpense = sReports.reduce((sum, r) => sum + (r.morningExpense || 0), 0);
      const shiftEveningIncome = sReports.reduce((sum, r) => sum + (r.eveningIncome || 0), 0);
      const shiftEveningExpense = sReports.reduce((sum, r) => sum + (r.eveningExpense || 0), 0);

      const totalPatients = sReports.reduce((sum, r) => sum + (r.noOfPatients || 0), 0);

      const totalIncome = labIncome + opIncome + shiftMorningIncome + shiftEveningIncome;
      const totalExpense = labExpense + shiftMorningExpense + shiftEveningExpense;

      setFinancialReport({
        labIncome,
        labExpense,
        opIncome,
        shiftMorningIncome,
        shiftMorningExpense,
        shiftEveningIncome,
        shiftEveningExpense,
        totalPatients,
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        monthLabel: `${MONTHS[selectedMonth]} ${selectedYear}`,
        generatedAt: new Date().toLocaleString()
      });

      setFinGenerated(true);
    } catch (e) {
      console.error(e);
      alert('Error compiling report.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (type: 'lab' | 'op' | 'shift' | 'fin', data?: any) => {
    setPrintPreviewType(type);
    setPrintTargetData(data || null);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Filter lists
  const filteredLab = labRecords.filter(r =>
    r.patientName?.toLowerCase().includes(labSearch.toLowerCase()) ||
    r.testName?.toLowerCase().includes(labSearch.toLowerCase())
  );

  const filteredOp = opRecords.filter(r =>
    r.patientName?.toLowerCase().includes(opSearch.toLowerCase()) ||
    r.operationType?.toLowerCase().includes(opSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] via-[#f5f1ea] to-[#ede7db] text-slate-800 p-4 md:p-8 font-sans">
      {/* Dynamic Print Styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          #main-content { display: none !important; }
          #print-section { display: block !important; width: 100%; }
        }
        @media screen {
          #print-section { display: none !important; }
        }
      `}</style>

      {/* PRINT LAYOUT */}
      <div id="print-section" className="text-black p-8 bg-white font-sans">
        {printPreviewType === 'lab' && (
          <div>
            <div className="text-center border-b-2 border-emerald-600 pb-4 mb-6">
              <h1 className="text-3xl font-black uppercase tracking-wider text-emerald-700">Khan Hub Hospital</h1>
              <h2 className="text-xl font-bold text-gray-800">Lab Test Records Report</h2>
              <p className="text-sm text-gray-500 mt-1">Generated on {new Date().toLocaleString()}</p>
            </div>
            <table className="w-full border-collapse border border-gray-400 text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-2 py-2 text-center">Sr. No</th>
                  <th className="border border-gray-400 px-2 py-2">Date</th>
                  <th className="border border-gray-400 px-2 py-2">Patient Name</th>
                  <th className="border border-gray-400 px-2 py-2">Test Name</th>
                  <th className="border border-gray-400 px-2 py-2">Test Report Result</th>
                  <th className="border border-gray-400 px-2 py-2">Referred By</th>
                  <th className="border border-gray-400 px-2 py-2 text-right">Charges</th>
                  <th className="border border-gray-400 px-2 py-2 text-right">Expense</th>
                  <th className="border border-gray-400 px-2 py-2 text-right">Net Amount</th>
                  <th className="border border-gray-400 px-2 py-2">Cashier Sig</th>
                  <th className="border border-gray-400 px-2 py-2">Receiver Sig</th>
                </tr>
              </thead>
              <tbody>
                {(printTargetData || filteredLab).map((r: any, i: number) => (
                  <tr key={r.id}>
                    <td className="border border-gray-400 px-2 py-2 text-center font-bold">{i + 1}</td>
                    <td className="border border-gray-400 px-2 py-2 whitespace-nowrap">{r.date}</td>
                    <td className="border border-gray-400 px-2 py-2 font-bold">{r.patientName}</td>
                    <td className="border border-gray-400 px-2 py-2">{r.testName}</td>
                    <td className="border border-gray-400 px-2 py-2">{r.result || 'Pending'}</td>
                    <td className="border border-gray-400 px-2 py-2">{r.referredBy || 'Self'}</td>
                    <td className="border border-gray-400 px-2 py-2 text-right">Rs. {r.charges?.toLocaleString()}</td>
                    <td className="border border-gray-400 px-2 py-2 text-right">Rs. {r.expense?.toLocaleString()}</td>
                    <td className="border border-gray-400 px-2 py-2 text-right font-bold">Rs. {r.netAmount?.toLocaleString()}</td>
                    <td className="border border-gray-400 px-2 py-2 italic font-mono text-[10px]">{r.cashierSig || 'Verified'}</td>
                    <td className="border border-gray-400 px-2 py-2 italic font-mono text-[10px]">{r.receiverSig || 'Approved'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {printPreviewType === 'op' && (
          <div>
            <div className="text-center border-b-2 border-indigo-600 pb-4 mb-6">
              <h1 className="text-3xl font-black uppercase tracking-wider text-indigo-700">Khan Hub Hospital</h1>
              <h2 className="text-xl font-bold text-gray-800">Operation Records Report</h2>
              <p className="text-sm text-gray-500 mt-1">Generated on {new Date().toLocaleString()}</p>
            </div>
            <table className="w-full border-collapse border border-gray-400 text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-2 py-2 text-center">Sr. No</th>
                  <th className="border border-gray-400 px-2 py-2">Date</th>
                  <th className="border border-gray-400 px-2 py-2">Patient Name</th>
                  <th className="border border-gray-400 px-2 py-2">Operation Type</th>
                  <th className="border border-gray-400 px-2 py-2">Contact No#</th>
                  <th className="border border-gray-400 px-2 py-2">Referred By</th>
                  <th className="border border-gray-400 px-2 py-2">Admit Date</th>
                  <th className="border border-gray-400 px-2 py-2">Discharge Date</th>
                  <th className="border border-gray-400 px-2 py-2 text-right">Amount</th>
                  <th className="border border-gray-400 px-2 py-2">Cashier Sig</th>
                  <th className="border border-gray-400 px-2 py-2">Receiver Sig</th>
                </tr>
              </thead>
              <tbody>
                {(printTargetData || filteredOp).map((r: any, i: number) => (
                  <tr key={r.id}>
                    <td className="border border-gray-400 px-2 py-2 text-center font-bold">{i + 1}</td>
                    <td className="border border-gray-400 px-2 py-2 whitespace-nowrap">{r.date}</td>
                    <td className="border border-gray-400 px-2 py-2 font-bold">{r.patientName}</td>
                    <td className="border border-gray-400 px-2 py-2">{r.operationType}</td>
                    <td className="border border-gray-400 px-2 py-2">{r.contactNo || '—'}</td>
                    <td className="border border-gray-400 px-2 py-2">{r.referredBy || 'Self'}</td>
                    <td className="border border-gray-400 px-2 py-2">{r.admitDate}</td>
                    <td className="border border-gray-400 px-2 py-2">{r.dischargeDate}</td>
                    <td className="border border-gray-400 px-2 py-2 text-right font-bold">Rs. {r.amount?.toLocaleString()}</td>
                    <td className="border border-gray-400 px-2 py-2 italic font-mono text-[10px]">{r.cashierSig || 'Verified'}</td>
                    <td className="border border-gray-400 px-2 py-2 italic font-mono text-[10px]">{r.receiverSig || 'Approved'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {printPreviewType === 'shift' && (
          <div>
            <div className="text-center border-b-2 border-emerald-600 pb-4 mb-6">
              <h1 className="text-3xl font-black uppercase tracking-wider text-emerald-700">Khan Hub Medical Center</h1>
              <h2 className="text-xl font-bold text-gray-800">Daily Patient & Shift Performance Report</h2>
              <p className="text-sm text-gray-500 mt-1">Generated on {new Date().toLocaleString()}</p>
            </div>
            <table className="w-full border-collapse border border-gray-400 text-[10px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-1">Sr.No</th>
                  <th className="border border-gray-400 p-1">Date</th>
                  <th className="border border-gray-400 p-1">M.Income</th>
                  <th className="border border-gray-400 p-1">M.Expense</th>
                  <th className="border border-gray-400 p-1">Net M.</th>
                  <th className="border border-gray-400 p-1">M.Cashier</th>
                  <th className="border border-gray-400 p-1">M.Receiver</th>
                  <th className="border border-gray-400 p-1">E.Income</th>
                  <th className="border border-gray-400 p-1">E.Expense</th>
                  <th className="border border-gray-400 p-1">Net E.</th>
                  <th className="border border-gray-400 p-1">E.Cashier</th>
                  <th className="border border-gray-400 p-1">E.Receiver</th>
                  <th className="border border-gray-400 p-1">Patients</th>
                  <th className="border border-gray-400 p-1">Tot Income</th>
                  <th className="border border-gray-400 p-1">Tot Expense</th>
                  <th className="border border-gray-400 p-1 font-bold text-emerald-800">Net Amount</th>
                  <th className="border border-gray-400 p-1 font-black">Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {(printTargetData || shiftReports).map((r: any, i: number) => (
                  <tr key={r.id}>
                    <td className="border border-gray-400 p-1 text-center font-bold">{i + 1}</td>
                    <td className="border border-gray-400 p-1 whitespace-nowrap">{r.date}</td>
                    <td className="border border-gray-400 p-1">Rs. {r.morningIncome?.toLocaleString()}</td>
                    <td className="border border-gray-400 p-1">Rs. {r.morningExpense?.toLocaleString()}</td>
                    <td className="border border-gray-400 p-1 font-semibold">Rs. {r.morningNetAmount?.toLocaleString()}</td>
                    <td className="border border-gray-400 p-1 text-[9px] font-mono italic">{r.morningCashierSig}</td>
                    <td className="border border-gray-400 p-1 text-[9px] font-mono italic">{r.morningReceiverSig}</td>
                    <td className="border border-gray-400 p-1">Rs. {r.eveningIncome?.toLocaleString()}</td>
                    <td className="border border-gray-400 p-1">Rs. {r.eveningExpense?.toLocaleString()}</td>
                    <td className="border border-gray-400 p-1 font-semibold">Rs. {r.eveningNetAmount?.toLocaleString()}</td>
                    <td className="border border-gray-400 p-1 text-[9px] font-mono italic">{r.eveningCashierSig}</td>
                    <td className="border border-gray-400 p-1 text-[9px] font-mono italic">{r.eveningReceiverSig}</td>
                    <td className="border border-gray-400 p-1 text-center font-bold">{r.noOfPatients}</td>
                    <td className="border border-gray-400 p-1">Rs. {r.totalIncome?.toLocaleString()}</td>
                    <td className="border border-gray-400 p-1">Rs. {r.totalExpense?.toLocaleString()}</td>
                    <td className="border border-gray-400 p-1 font-bold text-emerald-800">Rs. {r.netAmount?.toLocaleString()}</td>
                    <td className="border border-gray-400 p-1 font-black text-emerald-950">Rs. {r.grandTotal?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {printPreviewType === 'fin' && financialReport && (
          <div>
            <div className="text-center border-b-2 border-emerald-600 pb-4 mb-6">
              <h1 className="text-3xl font-black uppercase tracking-wider text-emerald-700">Khan Hub Hospital</h1>
              <h2 className="text-xl font-bold text-gray-800">Financial Monthly Compilation Report</h2>
              <p className="text-sm text-gray-500 mt-1">For Period: {financialReport.monthLabel}</p>
              <p className="text-xs text-gray-400 mt-1">Generated: {financialReport.generatedAt}</p>
            </div>
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="border border-gray-300 p-4 rounded-xl">
                <h3 className="font-bold text-gray-700 border-b pb-2 mb-2">Revenue Summaries</h3>
                <div className="space-y-1.5 text-sm text-gray-600">
                  <div className="flex justify-between"><span>Lab Services Income:</span><span className="font-bold text-gray-800">Rs. {financialReport.labIncome?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Operations Services Income:</span><span className="font-bold text-gray-800">Rs. {financialReport.opIncome?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Morning Shift Income:</span><span className="font-bold text-gray-800">Rs. {financialReport.shiftMorningIncome?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Evening Shift Income:</span><span className="font-bold text-gray-800">Rs. {financialReport.shiftEveningIncome?.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t pt-1 font-bold text-emerald-700"><span>Grand Total Income:</span><span>Rs. {financialReport.totalIncome?.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="border border-gray-300 p-4 rounded-xl">
                <h3 className="font-bold text-gray-700 border-b pb-2 mb-2">Expense Summaries</h3>
                <div className="space-y-1.5 text-sm text-gray-600">
                  <div className="flex justify-between"><span>Lab Service Expenses:</span><span className="font-bold text-gray-800">Rs. {financialReport.labExpense?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Morning Shift Expenses:</span><span className="font-bold text-gray-800">Rs. {financialReport.shiftMorningExpense?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Evening Shift Expenses:</span><span className="font-bold text-gray-800">Rs. {financialReport.shiftEveningExpense?.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t pt-1 font-bold text-red-600"><span>Grand Total Expenses:</span><span>Rs. {financialReport.totalExpense?.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
            <div className="border-t-2 pt-4 flex justify-between items-center">
              <span className="text-lg font-bold text-gray-700">Monthly Net Performance Balance:</span>
              <span className={`text-2xl font-black ${financialReport.netBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>Rs. {financialReport.netBalance?.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* WEB DASHBOARD */}
      <div id="main-content" className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e4dcce] pb-6">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-600 flex items-center gap-2">
              <FileBarChart className="w-8 h-8 text-emerald-700" /> Hospital Logs & Reports Hub
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage and generate simple to the point patient logs, test results, and shift reports.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePrint(activeTab === 'financial' ? 'fin' : activeTab === 'lab' ? 'lab' : activeTab === 'operation' ? 'op' : 'shift')}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md hover:brightness-105 active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" /> Print Active Log Section
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-2 border-b border-[#e4dcce] pb-2">
          {[
            { id: 'financial', title: 'Monthly Summary Compiler', icon: BarChart3 },
            { id: 'lab', title: 'Lab Test Records', icon: Layers },
            { id: 'operation', title: 'Operation Records', icon: Heart },
            { id: 'shift', title: 'Daily Patient & Shift Reports', icon: ClipboardList }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === t.id
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-sm'
                  : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.title}
            </button>
          ))}
        </div>

        {/* FINANCIAL SUMMARY COMPILER TAB */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-[#e4dcce] p-6 shadow-sm">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-600" /> Select Report Period</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Year</label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    min={2020}
                    max={2100}
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={handleGenerateFinancial}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                  Compile Summary
                </button>
              </div>
            </div>

            {finGenerated && financialReport && (
              <div className="bg-white/40 rounded-2xl border border-[#e4dcce] p-6 space-y-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-[#e4dcce] pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-emerald-800">{financialReport.monthLabel} Report Summary</h3>
                    <p className="text-xs text-slate-500">Compiled on {financialReport.generatedAt}</p>
                  </div>
                  <button
                    onClick={() => handlePrint('fin')}
                    className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200/40 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100/50 transition-all shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Summary
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-xl shadow-sm">
                    <TrendingUp className="w-6 h-6 text-emerald-600 mb-2" />
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Compiled Income</div>
                    <div className="text-2xl font-black text-emerald-700">{formatPKR(financialReport.totalIncome)}</div>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-100 p-5 rounded-xl shadow-sm">
                    <TrendingDown className="w-6 h-6 text-rose-600 mb-2" />
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Compiled Expenses</div>
                    <div className="text-2xl font-black text-rose-700">{formatPKR(financialReport.totalExpense)}</div>
                  </div>
                  <div className="bg-teal-50/50 border border-teal-100 p-5 rounded-xl shadow-sm">
                    <DollarSign className="w-6 h-6 text-teal-600 mb-2" />
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Net Compiled Balance</div>
                    <div className="text-2xl font-black text-teal-700">{formatPKR(financialReport.netBalance)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/60 rounded-xl p-4 border border-[#e4dcce] shadow-sm">
                    <h4 className="font-bold text-slate-800 border-b border-[#e4dcce] pb-2 mb-3 text-sm">Income Stream Compilation</h4>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex justify-between"><span>Lab Services Income:</span><span className="font-bold text-slate-800">{formatPKR(financialReport.labIncome)}</span></div>
                      <div className="flex justify-between"><span>Operations Income:</span><span className="font-bold text-slate-800">{formatPKR(financialReport.opIncome)}</span></div>
                      <div className="flex justify-between"><span>Morning Shift Income:</span><span className="font-bold text-slate-800">{formatPKR(financialReport.shiftMorningIncome)}</span></div>
                      <div className="flex justify-between"><span>Evening Shift Income:</span><span className="font-bold text-slate-800">{formatPKR(financialReport.shiftEveningIncome)}</span></div>
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-xl p-4 border border-[#e4dcce] shadow-sm">
                    <h4 className="font-bold text-slate-800 border-b border-[#e4dcce] pb-2 mb-3 text-sm">Expense Stream Compilation</h4>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex justify-between"><span>Lab Services Expense:</span><span className="font-bold text-slate-800">{formatPKR(financialReport.labExpense)}</span></div>
                      <div className="flex justify-between"><span>Morning Shift Expense:</span><span className="font-bold text-slate-800">{formatPKR(financialReport.shiftMorningExpense)}</span></div>
                      <div className="flex justify-between"><span>Evening Shift Expense:</span><span className="font-bold text-slate-800">{formatPKR(financialReport.shiftEveningExpense)}</span></div>
                      <div className="flex justify-between border-t border-[#e4dcce] pt-2 text-slate-800 font-bold"><span>Total Month Patients:</span><span>{financialReport.totalPatients}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LAB TEST LOGS TAB */}
        {activeTab === 'lab' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Input Form Column */}
            <div className="bg-white/70 backdrop-blur-md border border-[#e4dcce] rounded-2xl p-6 h-fit space-y-4 shadow-sm">
              <h3 className="font-bold text-emerald-700 text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> Add Lab Record Entry</h3>
              <form onSubmit={handleAddLab} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Test Date</label>
                  <input
                    type="date"
                    value={labForm.date}
                    onChange={e => setLabForm({ ...labForm, date: e.target.value })}
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Patient Name</label>
                  <input
                    type="text"
                    value={labForm.patientName}
                    onChange={e => setLabForm({ ...labForm, patientName: e.target.value })}
                    placeholder="Enter Patient Name"
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Test Name</label>
                  <input
                    type="text"
                    value={labForm.testName}
                    onChange={e => setLabForm({ ...labForm, testName: e.target.value })}
                    placeholder="e.g. CBC, Lipid Profile"
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Test Result</label>
                  <input
                    type="text"
                    value={labForm.result}
                    onChange={e => setLabForm({ ...labForm, result: e.target.value })}
                    placeholder="Result Details (or Pending)"
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Referred By</label>
                  <input
                    type="text"
                    value={labForm.referredBy}
                    onChange={e => setLabForm({ ...labForm, referredBy: e.target.value })}
                    placeholder="Dr. Reference Name"
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Charges</label>
                    <input
                      type="number"
                      value={labForm.charges}
                      onChange={e => setLabForm({ ...labForm, charges: e.target.value })}
                      placeholder="Charges"
                      className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Expense</label>
                    <input
                      type="number"
                      value={labForm.expense}
                      onChange={e => setLabForm({ ...labForm, expense: e.target.value })}
                      placeholder="Expense"
                      className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Cashier Sig</label>
                    <input
                      type="text"
                      value={labForm.cashierSig}
                      onChange={e => setLabForm({ ...labForm, cashierSig: e.target.value })}
                      className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-xs text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Receiver Sig</label>
                    <input
                      type="text"
                      value={labForm.receiverSig}
                      onChange={e => setLabForm({ ...labForm, receiverSig: e.target.value })}
                      className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-xs text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Save Lab Record'}
                </button>
              </form>
            </div>

            {/* List Records Table Column */}
            <div className="lg:col-span-2 bg-white/70 border border-[#e4dcce] rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="font-bold text-emerald-700 text-lg flex items-center gap-2">Lab Test Database Logs</h3>
                <div className="relative w-full sm:w-64">
                  <span className="absolute left-3 top-2.5 text-slate-400"><Search className="w-4 h-4" /></span>
                  <input
                    type="text"
                    value={labSearch}
                    onChange={e => setLabSearch(e.target.value)}
                    placeholder="Search patient/test..."
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#e4dcce]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 border-b border-[#e4dcce] font-bold">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Patient</th>
                      <th className="p-3">Test</th>
                      <th className="p-3">Charges</th>
                      <th className="p-3">Net Amt</th>
                      <th className="p-3">Sigs</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {filteredLab.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-400">No lab records found.</td>
                      </tr>
                    ) : (
                      filteredLab.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-3 whitespace-nowrap">{r.date}</td>
                          <td className="p-3 font-bold text-slate-800">{r.patientName}</td>
                          <td className="p-3">{r.testName}</td>
                          <td className="p-3">{formatPKR(r.charges)}</td>
                          <td className="p-3 font-bold text-emerald-700">{formatPKR(r.netAmount)}</td>
                          <td className="p-3 text-[10px] font-mono italic">{r.cashierSig} / {r.receiverSig}</td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handlePrint('lab', [r])}
                                className="text-slate-400 hover:text-emerald-600 transition-all"
                                title="Print Single Slip"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteLab(r.id)}
                                className="text-slate-400 hover:text-red-500 transition-all"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* OPERATION LOGS TAB */}
        {activeTab === 'operation' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Input Form Column */}
            <div className="bg-white/70 backdrop-blur-md border border-[#e4dcce] rounded-2xl p-6 h-fit space-y-4 shadow-sm">
              <h3 className="font-bold text-indigo-700 text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> Add Operation Record</h3>
              <form onSubmit={handleAddOp} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Operation Date</label>
                  <input
                    type="date"
                    value={opForm.date}
                    onChange={e => setOpForm({ ...opForm, date: e.target.value })}
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Patient Name</label>
                  <input
                    type="text"
                    value={opForm.patientName}
                    onChange={e => setOpForm({ ...opForm, patientName: e.target.value })}
                    placeholder="Enter Patient Name"
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Operation Type</label>
                  <input
                    type="text"
                    value={opForm.operationType}
                    onChange={e => setOpForm({ ...opForm, operationType: e.target.value })}
                    placeholder="e.g. Appendectomy, Cataract"
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Contact No#</label>
                  <input
                    type="text"
                    value={opForm.contactNo}
                    onChange={e => setOpForm({ ...opForm, contactNo: e.target.value })}
                    placeholder="Patient Contact"
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Referred By</label>
                  <input
                    type="text"
                    value={opForm.referredBy}
                    onChange={e => setOpForm({ ...opForm, referredBy: e.target.value })}
                    placeholder="Referred Doctor"
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Admit Date</label>
                    <input
                      type="date"
                      value={opForm.admitDate}
                      onChange={e => setOpForm({ ...opForm, admitDate: e.target.value })}
                      className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Discharge Date</label>
                    <input
                      type="date"
                      value={opForm.dischargeDate}
                      onChange={e => setOpForm({ ...opForm, dischargeDate: e.target.value })}
                      className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Operation Charges / Amount</label>
                  <input
                    type="number"
                    value={opForm.amount}
                    onChange={e => setOpForm({ ...opForm, amount: e.target.value })}
                    placeholder="Operation Amount"
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Cashier Sig</label>
                    <input
                      type="text"
                      value={opForm.cashierSig}
                      onChange={e => setOpForm({ ...opForm, cashierSig: e.target.value })}
                      className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-xs text-slate-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Receiver Sig</label>
                    <input
                      type="text"
                      value={opForm.receiverSig}
                      onChange={e => setOpForm({ ...opForm, receiverSig: e.target.value })}
                      className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-xs text-slate-600 outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Save Operation Record'}
                </button>
              </form>
            </div>

            {/* List Records Table Column */}
            <div className="lg:col-span-2 bg-white/70 border border-[#e4dcce] rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="font-bold text-indigo-700 text-lg flex items-center gap-2">Operation Database Logs</h3>
                <div className="relative w-full sm:w-64">
                  <span className="absolute left-3 top-2.5 text-slate-400"><Search className="w-4 h-4" /></span>
                  <input
                    type="text"
                    value={opSearch}
                    onChange={e => setOpSearch(e.target.value)}
                    placeholder="Search patient/operation..."
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#e4dcce]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 border-b border-[#e4dcce] font-bold">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Patient</th>
                      <th className="p-3">Operation</th>
                      <th className="p-3">Admit / Disch.</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Sigs</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {filteredOp.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-400">No operation records found.</td>
                      </tr>
                    ) : (
                      filteredOp.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-3 whitespace-nowrap">{r.date}</td>
                          <td className="p-3 font-bold text-slate-800">{r.patientName}</td>
                          <td className="p-3">{r.operationType}</td>
                          <td className="p-3 whitespace-nowrap text-[10px]">{r.admitDate} to {r.dischargeDate}</td>
                          <td className="p-3 font-bold text-indigo-700">{formatPKR(r.amount)}</td>
                          <td className="p-3 text-[10px] font-mono italic">{r.cashierSig} / {r.receiverSig}</td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handlePrint('op', [r])}
                                className="text-slate-400 hover:text-indigo-600 transition-all"
                                title="Print Single Slip"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteOp(r.id)}
                                className="text-slate-400 hover:text-red-500 transition-all"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* DAILY PATIENT & SHIFT REPORTS TAB */}
        {activeTab === 'shift' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Input Form Column */}
            <div className="bg-white/70 backdrop-blur-md border border-[#e4dcce] rounded-2xl p-6 h-fit space-y-4 shadow-sm">
              <h3 className="font-bold text-teal-700 text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> Add Shift Performance Report</h3>
              <form onSubmit={handleAddShift} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Date</label>
                  <input
                    type="date"
                    value={shiftForm.date}
                    onChange={e => setShiftForm({ ...shiftForm, date: e.target.value })}
                    className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                
                {/* Morning section */}
                <div className="border border-[#e4dcce] rounded-xl p-3 bg-white/40 space-y-2">
                  <h4 className="text-xs font-black text-teal-700 uppercase tracking-widest border-b border-[#e4dcce] pb-1">Morning Shift Metrics</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Morning Income</label>
                      <input
                        type="number"
                        value={shiftForm.morningIncome}
                        onChange={e => setShiftForm({ ...shiftForm, morningIncome: e.target.value })}
                        placeholder="Income"
                        className="w-full bg-white border border-[#dcd3c1] rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Morning Expense</label>
                      <input
                        type="number"
                        value={shiftForm.morningExpense}
                        onChange={e => setShiftForm({ ...shiftForm, morningExpense: e.target.value })}
                        placeholder="Expense"
                        className="w-full bg-white border border-[#dcd3c1] rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Evening section */}
                <div className="border border-[#e4dcce] rounded-xl p-3 bg-white/40 space-y-2">
                  <h4 className="text-xs font-black text-teal-700 uppercase tracking-widest border-b border-[#e4dcce] pb-1">Evening Shift Metrics</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Evening Income</label>
                      <input
                        type="number"
                        value={shiftForm.eveningIncome}
                        onChange={e => setShiftForm({ ...shiftForm, eveningIncome: e.target.value })}
                        placeholder="Income"
                        className="w-full bg-white border border-[#dcd3c1] rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Evening Expense</label>
                      <input
                        type="number"
                        value={shiftForm.eveningExpense}
                        onChange={e => setShiftForm({ ...shiftForm, eveningExpense: e.target.value })}
                        placeholder="Expense"
                        className="w-full bg-white border border-[#dcd3c1] rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">No of Patients</label>
                    <input
                      type="number"
                      value={shiftForm.noOfPatients}
                      onChange={e => setShiftForm({ ...shiftForm, noOfPatients: e.target.value })}
                      placeholder="Daily Patients"
                      className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Grand Total Cash</label>
                    <input
                      type="number"
                      value={shiftForm.grandTotal}
                      onChange={e => setShiftForm({ ...shiftForm, grandTotal: e.target.value })}
                      placeholder="Cumulative"
                      className="w-full bg-white border border-[#dcd3c1] rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Shift Report'}
                </button>
              </form>
            </div>

            {/* List Records Table Column */}
            <div className="lg:col-span-2 bg-white/70 border border-[#e4dcce] rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="font-bold text-teal-700 text-lg flex items-center gap-2">Daily Performance Database Records</h3>

              <div className="overflow-x-auto rounded-xl border border-[#e4dcce]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 border-b border-[#e4dcce] font-bold">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">M. Net</th>
                      <th className="p-3">E. Net</th>
                      <th className="p-3 text-center">Patients</th>
                      <th className="p-3">Net Day</th>
                      <th className="p-3">Grand Total</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {shiftReports.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-400">No shift reports registered.</td>
                      </tr>
                    ) : (
                      shiftReports.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-3 whitespace-nowrap font-bold text-slate-800">{r.date}</td>
                          <td className="p-3 text-emerald-700">{formatPKR(r.morningNetAmount)}</td>
                          <td className="p-3 text-teal-700">{formatPKR(r.eveningNetAmount)}</td>
                          <td className="p-3 text-center font-bold text-slate-800">{r.noOfPatients}</td>
                          <td className="p-3 font-extrabold text-teal-800">{formatPKR(r.netAmount)}</td>
                          <td className="p-3 font-black text-emerald-800">{formatPKR(r.grandTotal)}</td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handlePrint('shift', [r])}
                                className="text-slate-400 hover:text-teal-600 transition-all"
                                title="Print Shift Report Slip"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteShift(r.id)}
                                className="text-slate-400 hover:text-red-500 transition-all"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
