'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, DollarSign, CheckCircle, XCircle, Clock, Search } from 'lucide-react';

const CATEGORIES = {
  rehab: {
    income: ['Monthly Fee', 'Admission Fee', 'Extra Charge', 'Canteen Top-up', 'Donation'],
    expense: ['Medicine', 'Food', 'Utilities', 'Staff Salary', 'Maintenance', 'Other'],
  },
  spims: {
    income: ['Tuition Fee', 'Admission Fee', 'Exam Fee', 'Other'],
    expense: ['Staff Salary', 'Utilities', 'Equipment', 'Other'],
  },
};

export default function CashierStationPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [dept, setDept] = useState<'rehab' | 'spims'>('rehab');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [todayStats, setTodayStats] = useState({ income: 0, expense: 0, pending: 0, approved: 0, rejected: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'cashier') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    setCategory('');
  }, [dept, type]);

  useEffect(() => {
    if (!session || session.role !== 'cashier') return;

    const fetchStats = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [rehabSnap, spimsSnap] = await Promise.all([
          getDocs(collection(db, 'rehab_transactions')),
          getDocs(collection(db, 'spims_transactions')).catch(() => ({ docs: [] })),
        ]);

        const all = [
          ...rehabSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)),
          ...spimsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)),
        ];

        const myToday = all.filter(t =>
          t.cashierId === session.customId && t.date === today
        );

        let income = 0, expense = 0, pending = 0, approved = 0, rejected = 0;
        myToday.forEach(t => {
          if (t.type === 'income') income += t.amount || 0;
          else expense += t.amount || 0;
          if (t.status === 'pending') pending++;
          else if (t.status === 'approved') approved++;
          else if (t.status === 'rejected') rejected++;
        });

        setTodayStats({ income, expense, pending, approved, rejected, count: myToday.length });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [session]);

  const handlePatientSearch = async (term: string) => {
    setPatientSearch(term);
    if (term.length < 2) {
      setPatientResults([]);
      return;
    }

    try {
      const col = dept === 'rehab' ? 'rehab_patients' : 'spims_students';
      const snap = await getDocs(collection(db, col));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const filtered = list.filter(p =>
        (p.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.rollNumber || '').toLowerCase().includes(term.toLowerCase())
      );
      setPatientResults(filtered.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    setSubmitting(true);
    try {
      const col = dept === 'rehab' ? 'rehab_transactions' : 'spims_transactions';
      await addDoc(collection(db, col), {
        dept,
        type,
        category,
        amount: parseFloat(amount),
        patientId: selectedPatient?.id || null,
        patientName: selectedPatient?.name || null,
        note: note || null,
        cashierId: session?.customId,
        cashierName: session?.name,
        status: 'pending',
        date,
        createdAt: new Date().toISOString(),
      });

      setMessage({ type: 'success', text: 'Transaction submitted for manager approval' });
      setAmount('');
      setPatientSearch('');
      setSelectedPatient(null);
      setPatientResults([]);
      setNote('');

      const today = new Date().toISOString().split('T')[0];
      const snap = await getDocs(collection(db, col));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const myToday = all.filter(t => t.cashierId === session?.customId && t.date === today);
      let income = 0, expense = 0, pending = 0, approved = 0, rejected = 0;
      myToday.forEach(t => {
        if (t.type === 'income') income += t.amount || 0;
        else expense += t.amount || 0;
        if (t.status === 'pending') pending++;
        else if (t.status === 'approved') approved++;
        else if (t.status === 'rejected') rejected++;
      });
      setTodayStats({ income, expense, pending, approved, rejected, count: myToday.length });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to record transaction' });
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 p-4 md:p-8 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900 flex items-center gap-2">
          <DollarSign className="w-8 h-8 text-gray-800" />
          Cashier Station
        </h1>
        <p className="text-gray-400 text-sm mt-1">Record transactions for approval</p>
      </div>

      {message.text && (
        <div className={`p-6 rounded-3xl border font-bold flex items-center gap-4 ${
          message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
        }`}>
          <span>{message.type === 'success' ? '✓' : '!'}</span>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
            <div className="flex gap-2">
              {(['rehab', 'spims'] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDept(d)}
                  className={`flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                    dept === d ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {d === 'rehab' ? 'Rehab' : 'SPIMS'}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {(['income', 'expense'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                    type === t
                      ? t === 'income' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {t === 'income' ? '↑ Income' : '↓ Expense'}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Category</label>
              <select
                required
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-gray-200"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="">Select category...</option>
                {CATEGORIES[dept][type].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Patient / Student</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  className="w-full bg-gray-50 border-none rounded-2xl pl-10 pr-6 py-4 text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-gray-200 placeholder:text-gray-300"
                  value={patientSearch}
                  onChange={e => handlePatientSearch(e.target.value)}
                />
              </div>
              {patientResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                  {patientResults.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedPatient(p); setPatientSearch(p.name); setPatientResults([]); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{p.rollNumber || p.id}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedPatient && (
              <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center font-black text-gray-600">
                  {(selectedPatient.name || '?').charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{selectedPatient.name}</p>
                  <p className="text-[10px] text-gray-400">{selectedPatient.rollNumber || selectedPatient.id}</p>
                </div>
                <button type="button" onClick={() => { setSelectedPatient(null); setPatientSearch(''); }} className="ml-auto text-gray-400 hover:text-gray-600">
                  <XCircle size={16} />
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-gray-200"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Date</label>
                <input
                  type="date"
                  required
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-gray-200"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Note (optional)</label>
              <textarea
                rows={2}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-gray-200 placeholder:text-gray-300 resize-none"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gray-800 text-white py-5 rounded-2xl font-black shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 uppercase tracking-widest text-sm"
            >
              {submitting ? 'Recording...' : 'Record Transaction'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today's Summary</h2>
          <div className="bg-green-50 rounded-3xl p-6 border border-green-100">
            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Total Income</p>
            <p className="text-2xl font-black text-green-700 mt-1">₨{todayStats.income.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 rounded-3xl p-6 border border-red-100">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Total Expenses</p>
            <p className="text-2xl font-black text-red-700 mt-1">₨{todayStats.expense.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Transaction Status</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-xs font-bold text-amber-600"><Clock size={12} /> Pending</span>
                <span className="font-black">{todayStats.pending}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-xs font-bold text-green-600"><CheckCircle size={12} /> Approved</span>
                <span className="font-black">{todayStats.approved}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-xs font-bold text-red-600"><XCircle size={12} /> Rejected</span>
                <span className="font-black">{todayStats.rejected}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}