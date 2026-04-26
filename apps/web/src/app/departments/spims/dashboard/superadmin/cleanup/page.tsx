'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, getDocs, query, where, doc, updateDoc, 
  deleteDoc, writeBatch, Timestamp, serverTimestamp, getDoc,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Shield, Search, AlertTriangle, Trash2, CheckCircle, 
  ArrowRight, Users, Receipt, Database, Loader2, Info,
  Filter, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SpimsStudent, SpimsFeePayment } from '@/types/spims';
import { cn } from '@/lib/utils';
import { formatDateDMY } from '@/lib/utils';

interface DuplicateGroup {
  normalizedName: string;
  students: SpimsStudent[];
}

interface OrphanRecord {
  id: string;
  collection: 'spims_fees' | 'spims_transactions';
  amount: number;
  date: any;
  studentId?: string;
  patientId?: string;
  category?: string;
}

interface DoubleTransaction {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  studentId: string;
  category: string;
  txs: any[];
}

export default function SpimsCleanupPage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    duplicateGroups: 0,
    orphanFees: 0,
    orphanTransactions: 0,
    doubleTxs: 0
  });

  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [orphans, setOrphans] = useState<OrphanRecord[]>([]);
  const [doubles, setDoubles] = useState<DoubleTransaction[]>([]);
  
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'duplicates' | 'orphans' | 'doubles'>('duplicates');

  const normalizeName = (name: string) => name?.toLowerCase().trim().replace(/\s+/g, ' ') || 'unknown';

  const runScanner = async () => {
    setScanning(true);
    setScanProgress(0);
    try {
      // 1. Fetch all students
      setScanProgress(10);
      const studentSnap = await getDocs(collection(db, 'spims_students'));
      const allStudents = studentSnap.docs.map(d => ({ id: d.id, ...d.data() } as SpimsStudent));
      
      setStats(prev => ({ ...prev, totalStudents: allStudents.length }));
      
      // 2. Find Duplicates
      setScanProgress(30);
      const groups: Record<string, SpimsStudent[]> = {};
      allStudents.forEach(s => {
        const norm = normalizeName(s.name);
        if (!groups[norm]) groups[norm] = [];
        groups[norm].push(s);
      });
      
      const duplicateList = Object.entries(groups)
        .filter(([_, list]) => list.length > 1)
        .map(([name, list]) => ({ normalizedName: name, students: list }));
      
      setDuplicates(duplicateList);
      setStats(prev => ({ ...prev, duplicateGroups: duplicateList.length }));

      // 3. Find Orphans (Sample first 500 for speed if needed, but we try all)
      setScanProgress(60);
      const studentIds = new Set(allStudents.map(s => s.id));
      
      const feeSnap = await getDocs(collection(db, 'spims_fees'));
      const txSnap = await getDocs(collection(db, 'spims_transactions'));
      
      const orphanFeeList: OrphanRecord[] = [];
      feeSnap.docs.forEach(d => {
        const data = d.data();
        if (!studentIds.has(data.studentId)) {
          orphanFeeList.push({ id: d.id, collection: 'spims_fees', ...data } as any);
        }
      });
      
      const orphanTxList: OrphanRecord[] = [];
      txSnap.docs.forEach(d => {
        const data = d.data();
        const sid = data.studentId || data.patientId;
        if (sid && !studentIds.has(sid)) {
          orphanTxList.push({ id: d.id, collection: 'spims_transactions', ...data } as any);
        }
      });
      
      setOrphans([...orphanFeeList, ...orphanTxList]);
      setStats(prev => ({ 
        ...prev, 
        orphanFees: orphanFeeList.length,
        orphanTransactions: orphanTxList.length 
      }));

      // 4. Find Double Transactions
      setScanProgress(90);
      const txMap: Record<string, any[]> = {};
      txSnap.docs.forEach(d => {
        const data = d.data();
        const sid = data.studentId || data.patientId;
        if (!sid) return;
        
        const dateStr = data.date?.toDate ? formatDateDMY(data.date.toDate()) : 'unknown';
        const key = `${sid}_${data.amount}_${dateStr}_${data.category}`;
        
        if (!txMap[key]) txMap[key] = [];
        txMap[key].push({ id: d.id, ...data });
      });
      
      const doubleList = Object.entries(txMap)
        .filter(([_, list]) => list.length > 1)
        .map(([key, list]) => {
          const [sid, amount, date, cat] = key.split('_');
          return {
            id: key,
            studentId: sid,
            amount: Number(amount),
            date,
            category: cat,
            txs: list
          };
        });
      
      setDoubles(doubleList);
      setStats(prev => ({ ...prev, doubleTxs: doubleList.length }));
      
      setScanProgress(100);
      toast.success('Scan complete!');
    } catch (err) {
      console.error('Scanner error:', err);
      toast.error('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const mergeStudents = async (primaryId: string, duplicateIds: string[]) => {
    if (!confirm(`Are you sure you want to merge ${duplicateIds.length} students into the primary account? This will move all fees and transactions.`)) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Update Fees
      const feeSnap = await getDocs(query(collection(db, 'spims_fees'), where('studentId', 'in', duplicateIds)));
      feeSnap.docs.forEach(d => {
        batch.update(d.ref, { 
          studentId: primaryId,
          _mergedFrom: d.data().studentId,
          _mergedAt: serverTimestamp()
        });
      });
      
      // 2. Update Transactions
      // Handle both studentId and patientId
      const txSnap1 = await getDocs(query(collection(db, 'spims_transactions'), where('studentId', 'in', duplicateIds)));
      txSnap1.docs.forEach(d => {
        batch.update(d.ref, { 
          studentId: primaryId,
          patientId: primaryId,
          _mergedFrom: d.data().studentId || d.data().patientId,
          _mergedAt: serverTimestamp()
        });
      });
      
      const txSnap2 = await getDocs(query(collection(db, 'spims_transactions'), where('patientId', 'in', duplicateIds)));
      txSnap2.docs.forEach(d => {
        batch.update(d.ref, { 
          studentId: primaryId,
          patientId: primaryId,
          _mergedFrom: d.data().studentId || d.data().patientId,
          _mergedAt: serverTimestamp()
        });
      });

      // 3. Delete Duplicates
      duplicateIds.forEach(id => {
        batch.delete(doc(db, 'spims_students', id));
      });

      // 4. Log Audit
      const auditRef = doc(collection(db, 'spims_audit'));
      batch.set(auditRef, {
        type: 'merge_students',
        primaryId,
        duplicateIds,
        mergedBy: 'system_cleanup',
        createdAt: serverTimestamp()
      });

      await batch.commit();
      toast.success('Merge successful!');
      runScanner(); // Refresh
    } catch (err) {
      console.error('Merge error:', err);
      toast.error('Merge failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteOrphan = async (orphan: OrphanRecord) => {
    if (!confirm('Delete this orphan record? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, orphan.collection, orphan.id));
      toast.success('Orphan deleted');
      setOrphans(prev => prev.filter(o => o.id !== orphan.id));
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const deleteDouble = async (txId: string) => {
    if (!confirm('Delete this duplicate transaction?')) return;
    try {
      await deleteDoc(doc(db, 'spims_transactions', txId));
      toast.success('Transaction deleted');
      runScanner();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF8] pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-[1000] text-black tracking-tighter flex items-center gap-3">
            <Shield className="w-10 h-10 text-teal-600" />
            DATA CLEANUP
          </h1>
          <p className="text-sm font-black text-black/40 uppercase tracking-[0.2em] mt-2">
            Superadmin Maintenance & Integrity Tool
          </p>
        </div>
        <button 
          onClick={runScanner} 
          disabled={scanning}
          className="bg-black text-white px-8 py-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-3 disabled:opacity-50"
        >
          {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          <span className="font-black uppercase tracking-widest text-xs">Run Deep Scan</span>
        </button>
      </div>

      {scanning && (
        <div className="mb-12">
          <div className="flex justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest">Scanning Database...</span>
            <span className="text-[10px] font-black uppercase tracking-widest">{scanProgress}%</span>
          </div>
          <div className="h-4 bg-gray-100 border-2 border-black overflow-hidden">
            <div 
              className="h-full bg-teal-500 transition-all duration-500" 
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">Total Students</p>
          <p className="text-3xl font-[1000] text-black">{stats.totalStudents}</p>
        </div>
        <div className={cn("bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]", stats.duplicateGroups > 0 ? "border-rose-500" : "")}>
          <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">Duplicates</p>
          <p className={cn("text-3xl font-[1000]", stats.duplicateGroups > 0 ? "text-rose-500" : "text-black")}>{stats.duplicateGroups}</p>
        </div>
        <div className={cn("bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]", (stats.orphanFees + stats.orphanTransactions) > 0 ? "border-amber-500" : "")}>
          <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">Orphans</p>
          <p className={cn("text-3xl font-[1000]", (stats.orphanFees + stats.orphanTransactions) > 0 ? "text-amber-500" : "text-black")}>{stats.orphanFees + stats.orphanTransactions}</p>
        </div>
        <div className={cn("bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]", stats.doubleTxs > 0 ? "border-purple-500" : "")}>
          <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">Double Txs</p>
          <p className={cn("text-3xl font-[1000]", stats.doubleTxs > 0 ? "text-purple-500" : "text-black")}>{stats.doubleTxs}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-4 border-black mb-8">
        <button 
          onClick={() => setActiveTab('duplicates')}
          className={cn(
            "px-8 py-4 text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'duplicates' ? "bg-black text-white" : "text-black hover:bg-gray-100"
          )}
        >
          Duplicate Students ({duplicates.length})
        </button>
        <button 
          onClick={() => setActiveTab('orphans')}
          className={cn(
            "px-8 py-4 text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'orphans' ? "bg-black text-white" : "text-black hover:bg-gray-100"
          )}
        >
          Orphan Records ({orphans.length})
        </button>
        <button 
          onClick={() => setActiveTab('doubles')}
          className={cn(
            "px-8 py-4 text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'doubles' ? "bg-black text-white" : "text-black hover:bg-gray-100"
          )}
        >
          Double Txs ({doubles.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'duplicates' && (
          <div className="space-y-4">
            {duplicates.length === 0 ? (
              <div className="bg-white border-4 border-black p-12 text-center">
                <CheckCircle className="w-12 h-12 text-teal-500 mx-auto mb-4" />
                <p className="text-xl font-black uppercase">No duplicates found</p>
              </div>
            ) : duplicates.map((group, idx) => (
              <div key={idx} className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-[1000] text-black uppercase tracking-tight">{group.normalizedName}</h3>
                    <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mt-1">
                      {group.students.length} entries found for this identity
                    </p>
                  </div>
                  <AlertTriangle className="text-rose-500 w-8 h-8" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {group.students.map((s) => (
                    <div key={s.id} className="border-2 border-black p-4 bg-gray-50 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-black">{s.name}</p>
                          <p className="text-[10px] font-bold text-gray-500">ID: {s.id}</p>
                        </div>
                        <span className="bg-black text-white px-2 py-0.5 text-[8px] font-black uppercase">Roll: {s.rollNo}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-[9px] font-bold uppercase text-gray-500">
                        <span>Course: {s.course}</span>
                        <span>Session: {s.session}</span>
                      </div>
                      <button 
                        onClick={() => mergeStudents(s.id, group.students.filter(x => x.id !== s.id).map(x => x.id))}
                        className="mt-4 w-full bg-teal-500 text-white py-2 text-[10px] font-black uppercase tracking-widest border-2 border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                      >
                        Set as Primary & Merge Others
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'orphans' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orphans.length === 0 ? (
              <div className="md:col-span-2 bg-white border-4 border-black p-12 text-center">
                <CheckCircle className="w-12 h-12 text-teal-500 mx-auto mb-4" />
                <p className="text-xl font-black uppercase">No orphan records found</p>
              </div>
            ) : orphans.map((o) => (
              <div key={o.id} className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">{o.collection}</p>
                  <p className="text-xl font-[1000] text-black">Rs {o.amount.toLocaleString()}</p>
                  <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mt-1">
                    Missing Parent: {o.studentId || o.patientId}
                  </p>
                </div>
                <button 
                  onClick={() => deleteOrphan(o)}
                  className="w-12 h-12 bg-rose-50 text-rose-600 border-2 border-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'doubles' && (
          <div className="space-y-4">
             {doubles.length === 0 ? (
              <div className="bg-white border-4 border-black p-12 text-center">
                <CheckCircle className="w-12 h-12 text-teal-500 mx-auto mb-4" />
                <p className="text-xl font-black uppercase">No double transactions found</p>
              </div>
            ) : doubles.map((d) => (
              <div key={d.id} className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-black uppercase">Double Payment Detected</h3>
                    <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mt-1">
                      {d.date} • Rs {d.amount.toLocaleString()} • Student: {d.studentId}
                    </p>
                  </div>
                  <Receipt className="text-purple-500 w-8 h-8" />
                </div>
                
                <div className="space-y-2">
                  {d.txs.map((tx, idx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 border-2 border-black">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest">{tx.categoryName || tx.category}</p>
                        <p className="text-[10px] font-bold text-gray-500">TX ID: {tx.id}</p>
                      </div>
                      {idx > 0 && (
                        <button 
                          onClick={() => deleteDouble(tx.id)}
                          className="bg-rose-600 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest border-2 border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                          Delete Duplicate
                        </button>
                      )}
                      {idx === 0 && (
                        <span className="text-[10px] font-black text-teal-600 uppercase bg-teal-50 px-3 py-1 border border-teal-200">Keep this one</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
