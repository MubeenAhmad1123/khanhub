// apps/web/src/components/spims/student-profile/BankStatementTab.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCached, setCached } from '@/lib/queryCache';

import { Loader2, Printer, FileText } from 'lucide-react';
import type { SpimsStudent } from '@/types/spims';
import { formatDateDMY, toDate } from '@/lib/utils';

export default function BankStatementTab({
  student,
}: {
  student: SpimsStudent;
}): any {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const cacheKey = `spims_transactions_statement_${student.id}`;
        const cached = getCached<any[]>(cacheKey);
        let list: any[] = [];

        if (cached) {
          list = cached;
        } else {
          const [snapPatient, snapStudent] = await Promise.all([
            getDocs(query(collection(db, 'spims_transactions'), where('patientId', '==', student.id), limit(100))),
            getDocs(query(collection(db, 'spims_transactions'), where('studentId', '==', student.id), limit(100)))
          ]);
          
          const txMap = new Map<string, any>();
          snapPatient.docs.forEach((doc) => txMap.set(doc.id, { id: doc.id, ...doc.data() }));
          snapStudent.docs.forEach((doc) => txMap.set(doc.id, { id: doc.id, ...doc.data() }));
          const mergedDocs = Array.from(txMap.values());

          list = mergedDocs.map((x) => ({
            ...x,
            date: x.date?.toDate ? x.date.toDate() : x.date,
          }));
          setCached(cacheKey, list, 60);
        }

        setTransactions(list);
      } catch (err) {
        console.error('Error loading bank statement transactions:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [student.id]);

  const totalPackage = Number(student.totalPackage) || 0;

  // Filter for approved fee transactions and compute running balance chronologically
  const processedTransactions = useMemo(() => {
    // Filter transactions: must be approved and be a fee
    const approvedFees = transactions.filter((tx) => {
      const isApproved = tx.status === 'approved';
      if (!isApproved) return false;

      const cat = String(tx.category || '').toLowerCase();
      return cat.includes('fee') || cat.includes('admission') || !!tx.feePaymentId;
    });

    // Sort oldest first (chronological)
    const sorted = [...approvedFees].sort((a, b) => {
      const tA = toDate(a.date).getTime();
      const tB = toDate(b.date).getTime();
      return tA - tB;
    });

    let runningBalance = totalPackage;
    const computed = sorted.map((tx) => {
      const amt = Number(tx.amount) || 0;
      runningBalance -= amt;
      return {
        id: tx.id,
        date: tx.date,
        amount: amt,
        category: tx.categoryName || tx.category || 'Fee',
        receivedBy: tx.receivedBy || tx.createdByName || 'HQ',
        note: tx.description || tx.note || '',
        remainingAfter: Math.max(0, runningBalance),
      };
    });

    // Return latest first for displaying
    return computed.reverse();
  }, [transactions, totalPackage]);

  const totalPaid = useMemo(() => {
    return processedTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  }, [processedTransactions]);

  const remainingBalance = Math.max(0, totalPackage - totalPaid);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-[#1D9E75] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Statement Header */}
      <div className="border-b border-gray-900 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">
            Financial Account Statement
          </h1>
          <p className="text-gray-500 font-semibold text-xs tracking-wider uppercase mt-1">
            Student: {student.name} • SPIMS College
          </p>
        </div>
        <button 
          onClick={handlePrint}
          className="no-print flex items-center gap-2 px-4 py-2 border-2 border-gray-950 text-gray-950 hover:bg-gray-50 transition-all rounded-xl text-xs font-black uppercase tracking-wider"
        >
          <Printer size={14} /> Print Statement
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-gray-300 p-5 rounded-2xl bg-[#FCFCFC]">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Total Package Dues</span>
          <span className="text-2xl font-black text-gray-900">Rs {totalPackage.toLocaleString()}</span>
        </div>
        <div className="border border-gray-300 p-5 rounded-2xl bg-[#FCFCFC]">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Consolidated Deposited</span>
          <span className="text-2xl font-black text-[#1D9E75]">Rs {totalPaid.toLocaleString()}</span>
        </div>
        <div className="border border-gray-300 p-5 rounded-2xl bg-[#FCFCFC]">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Ending Balance / Due</span>
          <span className="text-2xl font-black text-amber-700">Rs {remainingBalance.toLocaleString()}</span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-300 rounded-2xl overflow-hidden bg-white">
        <div className="p-4 bg-gray-50 border-b border-gray-300 flex justify-between items-center">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <FileText size={14} /> Account Ledger Book
          </span>
          <span className="text-[10px] font-bold text-gray-500 uppercase">
            {processedTransactions.length} Verified Entries
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase text-[9px] font-black tracking-widest border-b border-gray-300">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Description / Note</th>
                <th className="py-3.5 px-4">Received By</th>
                <th className="py-3.5 px-4 text-right">Deposited</th>
                <th className="py-3.5 px-4 text-right">Remaining Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {processedTransactions.map((tx, idx) => (
                <tr key={tx.id || idx} className="hover:bg-gray-50 transition-colors text-xs font-bold text-gray-800">
                  <td className="py-3.5 px-4 whitespace-nowrap">{formatDateDMY(tx.date)}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap capitalize text-gray-600 font-semibold">
                    {String(tx.category).replace(/_/g, ' ')}
                  </td>
                  <td className="py-3.5 px-4 truncate max-w-[250px] font-medium text-gray-600">
                    {tx.note || 'Student Fee Payment'}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 font-semibold">
                    {tx.receivedBy}
                  </td>
                  <td className="py-3.5 px-4 text-right text-gray-900 font-black">
                    Rs {tx.amount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right text-gray-900 font-black">
                    Rs {tx.remainingAfter.toLocaleString()}
                  </td>
                </tr>
              ))}
              {processedTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest italic bg-white">
                    No approved payment transactions logged in this statement
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-950 text-gray-900 font-black text-xs">
                <td colSpan={4} className="py-4 px-4 uppercase tracking-wider text-[10px]">
                  Consolidated Received Balance
                </td>
                <td className="py-4 px-4 text-right font-black">
                  Rs {totalPaid.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-right font-black">
                  Rs {remainingBalance.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Official Disclaimers */}
      <div className="mt-8 pt-4 border-t border-dashed border-gray-300 text-center text-gray-400 text-[9px] font-semibold uppercase tracking-wider">
        This account statement is generated dynamically and displays approved financial entries only.
      </div>
    </div>
  );
}
