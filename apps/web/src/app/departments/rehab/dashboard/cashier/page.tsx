'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, getDocs, query, where,
  serverTimestamp, Timestamp
} from 'firebase/firestore';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';

const INCOME_CATEGORIES = [
  { value: 'patient_fee',      label: 'Patient Monthly Fee',   needsPatient: true,  needsStaff: false },
  { value: 'canteen_deposit',  label: 'Canteen Deposit',        needsPatient: true,  needsStaff: false },
  { value: 'donation',         label: 'Donation',               needsPatient: false, needsStaff: false },
  { value: 'other_income',     label: 'Other Income',           needsPatient: false, needsStaff: false },
];

const EXPENSE_CATEGORIES = [
  { value: 'staff_salary',     label: 'Staff Salary',           needsPatient: false, needsStaff: true },
  { value: 'rent',             label: 'Rent',                   needsPatient: false, needsStaff: false },
  { value: 'electricity',      label: 'Electricity',            needsPatient: false, needsStaff: false },
  { value: 'gas',              label: 'Gas',                    needsPatient: false, needsStaff: false },
  { value: 'water',            label: 'Water',                  needsPatient: false, needsStaff: false },
  { value: 'medicine',         label: 'Medicine',               needsPatient: false, needsStaff: false },
  { value: 'food',             label: 'Food / Ration',          needsPatient: false, needsStaff: false },
  { value: 'canteen_expense',  label: 'Canteen Expense',        needsPatient: true,  needsStaff: false },
  { value: 'maintenance',      label: 'Maintenance',            needsPatient: false, needsStaff: false },
  { value: 'transport',        label: 'Transport',              needsPatient: false, needsStaff: false },
  { value: 'equipment',        label: 'Equipment',              needsPatient: false, needsStaff: false },
  { value: 'security',         label: 'Security',               needsPatient: false, needsStaff: false },
  { value: 'cleaning',         label: 'Cleaning',               needsPatient: false, needsStaff: false },
  { value: 'patient_welfare',  label: 'Patient Welfare',        needsPatient: false, needsStaff: false },
  { value: 'office_supplies',  label: 'Office Supplies',        needsPatient: false, needsStaff: false },
  { value: 'other_expense',    label: 'Other Expense',          needsPatient: false, needsStaff: false },
];

export default function CashierPage() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useRehabSession();

  // form state
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('patient_fee');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<{id: string; name: string; admissionDate?: any; customId?: string} | null>(null);
  const [patientResults, setPatientResults] = useState<{id: string; name: string; admissionDate?: any; customId?: string}[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allPatients, setAllPatients] = useState<{id: string; name: string; admissionDate?: any; customId?: string}[]>([]);

  // staff state
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<{id: string; name: string; salary: number} | null>(null);
  const [staffResults, setStaffResults] = useState<{id: string; name: string; salary: number}[]>([]);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [allStaff, setAllStaff] = useState<{id: string; name: string; salary: number}[]>([]);

  // today's transactions
  const [todayEntries, setTodayEntries] = useState<any[]>([]);
  const [todayIncome, setTodayIncome] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);

  // ui state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isStaffPaid, setIsStaffPaid] = useState(false);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const currentCat = categories.find(c => c.value === category);
  const needsPatient = currentCat?.needsPatient ?? false;
  const needsStaff = (currentCat as any)?.needsStaff ?? false;

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || (user.role !== 'cashier' && user.role !== 'superadmin')) {
      router.push('/departments/rehab/login');
      return;
    }
    loadPatients();
    loadStaff();
    loadTodayEntries();
  }, [user, sessionLoading]);

  // Reset category when type changes
  useEffect(() => {
    setCategory(type === 'income' ? 'patient_fee' : 'staff_salary');
    setSelectedPatient(null);
    setPatientSearch('');
    setSelectedStaff(null);
    setStaffSearch('');
  }, [type]);

  // Reset patient when category changes to non-patient
  useEffect(() => {
    if (!needsPatient) {
      setSelectedPatient(null);
      setPatientSearch('');
    }
  }, [category]);

  async function loadPatients() {
    try {
      const snap = await getDocs(collection(db, 'rehab_patients'));
      const list = snap.docs.map(d => ({
        id: d.id,
        name: d.data().name || 'Unknown',
        admissionDate: d.data().admissionDate || null,
        customId: d.data().customId || d.id.slice(0, 8),
      }));
      console.log('Loaded patients:', list.length);
      setAllPatients(list);
    } catch (e) {
      console.error('Load patients error:', e);
    }
  }

  async function loadStaff() {
    try {
      const snap = await getDocs(collection(db, 'rehab_staff'));
      const list = snap.docs.map(d => ({
        id: d.id,
        name: d.data().name || 'Unknown',
        salary: d.data().salary || 0,
      }));
      setAllStaff(list);
    } catch (e) {
      console.error('Load staff error:', e);
    }
  }

  async function loadTodayEntries() {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const snap = await getDocs(
        query(collection(db, 'rehab_transactions'),
          where('cashierId', '==', user!.uid))
      );
      const entries = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((e: any) => {
          const entryDate = e.date instanceof Timestamp
            ? e.date.toDate().toISOString().split('T')[0]
            : String(e.date).split('T')[0];
          return entryDate === todayStr;
        })
        .sort((a: any, b: any) => {
          const ta = a.createdAt?.toDate?.() || new Date(0);
          const tb = b.createdAt?.toDate?.() || new Date(0);
          return tb - ta;
        });

      setTodayEntries(entries);
      setTodayIncome(entries.filter((e: any) => e.type === 'income')
        .reduce((s: number, e: any) => s + (e.amount || 0), 0));
      setTodayExpense(entries.filter((e: any) => e.type === 'expense')
        .reduce((s: number, e: any) => s + (e.amount || 0), 0));
    } catch (e) {
      console.error('Load today entries error:', e);
    }
  }

  function handlePatientSearch(val: string) {
    setPatientSearch(val);
    setSelectedPatient(null);
    if (val.length < 1) { setPatientResults([]); setShowDropdown(false); return; }
    const results = allPatients.filter(p =>
      p.name.toLowerCase().includes(val.toLowerCase()) ||
      p.id.toLowerCase().includes(val.toLowerCase()) ||
      (p as any).customId?.toLowerCase().includes(val.toLowerCase())
    );
    setPatientResults(results);
    setShowDropdown(true);
  }

  function selectPatient(p: any) {
    setSelectedPatient(p);
    setPatientSearch(p.name);
    setShowDropdown(false);
  }

  function handleStaffSearch(val: string) {
    setStaffSearch(val);
    setSelectedStaff(null);
    if (val.length < 1) { setStaffResults([]); setShowStaffDropdown(false); return; }
    const results = allStaff.filter(s =>
      s.name.toLowerCase().includes(val.toLowerCase())
    );
    setStaffResults(results);
    setShowStaffDropdown(true);
  }

  async function selectStaff(s: {id: string; name: string; salary: number}) {
    setSelectedStaff(s);
    setStaffSearch(s.name);
    setShowStaffDropdown(false);
    setAmount(String(s.salary));
    
    // Check if ALREADY PAID for this month
    try {
      const monthStr = date.slice(0, 7); // "2026-03"
      const startOfMonth = new Date(date);
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      
      const endOfMonth = new Date(date);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23,59,59,999);

      const qSalary = query(
        collection(db, 'rehab_transactions'),
        where('staffId', '==', s.id),
        where('category', '==', 'staff_salary'),
        where('status', '==', 'approved'),
        where('date', '>=', Timestamp.fromDate(startOfMonth)),
        where('date', '<=', Timestamp.fromDate(endOfMonth))
      );
      const snap = await getDocs(qSalary);
      setIsStaffPaid(!snap.empty);
    } catch (err) {
      console.error("Check paid error", err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (needsPatient && !selectedPatient) {
      setError('Please select a patient for this category');
      return;
    }
    if (needsStaff && !selectedStaff) {
      setError('Please select a staff member for salary payment');
      return;
    }

    setSubmitting(true);
    try {
      // Anti-Cheat: 5-minute duplicate check
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const dupSnap = await getDocs(
        query(
          collection(db, 'rehab_transactions'),
          where('cashierId', '==', user!.uid),
          where('amount', '==', Number(amount)),
          where('category', '==', category)
        )
      );
      const recentDup = dupSnap.docs.find(d => {
        const created = d.data().createdAt?.toDate?.()
        return created && created >= fiveMinutesAgo
      });
      if (recentDup) {
        setError('Duplicate transaction detected! Please wait 5 minutes.');
        setSubmitting(false);
        return;
      }

      const txData: any = {
        type,
        category,
        amount: Number(amount),
        description: description || currentCat?.label || category,
        date: Timestamp.fromDate(new Date(date)),
        cashierId: user!.uid,
        cashierName: user!.displayName,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      if (needsPatient && selectedPatient) {
        txData.patientId = selectedPatient.id;
        txData.patientName = selectedPatient.name;
      }

      if (needsStaff && selectedStaff) {
        txData.staffId = selectedStaff.id;
        txData.staffName = selectedStaff.name;
      }

      await addDoc(collection(db, 'rehab_transactions'), txData);

      setSuccess(`Transaction recorded! Awaiting super admin approval.`);
      setAmount('');
      setDescription('');
      setSelectedPatient(null);
      setPatientSearch('');
      await loadTodayEntries();

      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to record transaction');
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Cashier Station</h1>
        <p className="text-gray-400 text-sm mt-1">All transactions require super admin approval</p>
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-teal-50 rounded-2xl p-4">
          <p className="text-teal-700 font-black text-xl">PKR {todayIncome.toLocaleString()}</p>
          <p className="text-teal-600 text-xs font-semibold mt-1">Today's Income Recorded</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4">
          <p className="text-red-700 font-black text-xl">PKR {todayExpense.toLocaleString()}</p>
          <p className="text-red-600 text-xs font-semibold mt-1">Today's Expenses Recorded</p>
        </div>
      </div>

      {/* New Transaction Form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-black text-gray-900 mb-5">New Transaction</h2>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm font-semibold mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-teal-50 text-teal-600 rounded-xl px-4 py-3 text-sm font-semibold mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type toggle */}
          <div className="flex gap-2 bg-gray-50 rounded-xl p-1">
            <button type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                type === 'income'
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              Income
            </button>
            <button type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                type === 'expense'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              Expense
            </button>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20">
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Patient search — shown only when needed */}
          {needsPatient && (
            <div className="relative">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Patient <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={patientSearch}
                onChange={e => handlePatientSearch(e.target.value)}
                placeholder="Search patient by name..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              <p className="text-xs text-gray-400 mt-1 ml-1">
                Type any letter to search from {allPatients.length} patients
              </p>
              {selectedPatient && (
                <div className="mt-1.5 flex items-center gap-2 bg-teal-50 rounded-lg px-3 py-2">
                  <span className="text-teal-600 text-sm font-bold">✓ {selectedPatient.name}</span>
                  <button type="button" onClick={() => { setSelectedPatient(null); setPatientSearch(''); }}
                    className="ml-auto text-gray-400 hover:text-red-500 text-xs">✕</button>
                </div>
              )}
              {showDropdown && patientResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden">
                  {patientResults.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => selectPatient(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-teal-50 transition-colors border-b border-gray-50 last:border-0">
                      <p className="text-sm font-semibold text-gray-700">{p.name}</p>
                      <p className="text-xs text-gray-400">
                        ID: {p.customId} • 
                        Admitted: {p.admissionDate
                          ? new Date(p.admissionDate?.toDate?.() || p.admissionDate).toLocaleDateString('en-PK')
                          : 'N/A'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && patientResults.length === 0 && patientSearch.length > 1 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white rounded-xl border border-gray-100 shadow-lg px-4 py-3 text-sm text-gray-400">
                  No patient found
                </div>
              )}
            </div>
          )}

          {/* Staff search — shown only when needed */}
          {needsStaff && (
            <div className="relative">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Staff Member <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={staffSearch}
                onChange={e => handleStaffSearch(e.target.value)}
                placeholder="Type staff name..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              {selectedStaff && (
                <div className={`mt-1.5 flex items-center gap-2 rounded-lg px-3 py-2 ${isStaffPaid ? 'bg-red-50' : 'bg-teal-50'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`${isStaffPaid ? 'text-red-600' : 'text-teal-600'} text-sm font-bold`}>
                        {isStaffPaid ? '⚠ ALREADY PAID' : '✓'} {selectedStaff.name}
                      </p>
                      {isStaffPaid && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                          DUPLICATE WARNING
                        </span>
                      )}
                    </div>
                    <p className={`${isStaffPaid ? 'text-red-500' : 'text-teal-500'} text-xs font-medium`}>
                      Monthly salary: PKR {selectedStaff.salary.toLocaleString()}
                    </p>
                  </div>
                  <button type="button"
                    onClick={() => { setSelectedStaff(null); setStaffSearch(''); setAmount(''); setIsStaffPaid(false); }}
                    className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                </div>
              )}
              {showStaffDropdown && staffResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden">
                  {staffResults.map(s => (
                    <button key={s.id} type="button"
                      onClick={() => selectStaff(s)}
                      className="w-full text-left px-4 py-2.5 hover:bg-teal-50 transition-colors border-b border-gray-50 last:border-0">
                      <p className="text-sm font-semibold text-gray-700">{s.name}</p>
                      <p className="text-xs text-gray-400">Monthly: PKR {s.salary.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1 ml-1">
                Salary amount will be auto-filled when you select staff
              </p>
            </div>
          )}

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Amount (PKR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Note (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Any extra details..."
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gray-900 text-white rounded-xl py-3.5 text-sm font-black transition-all hover:bg-gray-800 disabled:opacity-50">
            {submitting ? 'Recording...' : 'Record Transaction →'}
          </button>

          <p className="text-center text-gray-400 text-xs">
            This will be sent to Super Admin for approval before reflecting in reports.
          </p>
        </form>
      </div>

      {/* Today's entries */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-black text-gray-900 mb-4">Today's Entries ({todayEntries.length})</h2>
        {todayEntries.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No transactions recorded today yet.</p>
        ) : (
          <div className="space-y-2">
            {todayEntries.map((entry: any) => (
              <div key={entry.id}
                className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    {entry.description || entry.category}
                    {entry.patientName && (
                      <span className="ml-2 text-xs text-teal-600 font-semibold">
                        ({entry.patientName})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {entry.type === 'income' ? '↑ Income' : '↓ Expense'} •{' '}
                    <span className={`font-semibold ${
                      entry.status === 'approved' ? 'text-teal-600' :
                      entry.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                    }`}>{entry.status}</span>
                  </p>
                </div>
                <p className={`text-sm font-black ${
                  entry.type === 'income' ? 'text-teal-600' : 'text-red-500'
                }`}>
                  {entry.type === 'income' ? '+' : '-'} PKR {(entry.amount || 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
