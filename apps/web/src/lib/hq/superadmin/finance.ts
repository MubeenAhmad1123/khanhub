// apps/web/src/lib/hq/superadmin/finance.ts

import { 
  collection, 
  getDocs, 
  limit, 
  orderBy, 
  query, 
  where, 
  Timestamp, 
  doc, 
  updateDoc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDate } from '@/lib/utils';

export type FinanceTab = 'combined' | 'rehab' | 'spims' | 'job-center' | 'hq';
export type TxType = 'fees' | 'medicine' | 'salary' | 'maintenance' | 'other' | 'session';

export interface DeptBreakdown {
  deptId: string;
  deptName: string;
  totalIncome: number;
  totalExpense: number;
  pendingCount: number;
  ways: Record<string, number>;
  percentOfTotal: number;
}

export type FinanceSummary = {
  collectedToday: number;
  collectedThisMonth: number;
  outstandingTotal: number;
  pendingApprovals: number;
  pendingReconciliations: number;
  totalTransactionsToday: number;
  // Trends (percentage change)
  collectedDailyTrend: number;
  collectedMonthlyTrend: number;
};

export type DailySeriesPoint = { 
  day: string; 
  income: number; 
  expense: number; 
  count: number;
  variance: number;
};

export type TypeBreakdown = { name: string; value: number; amount: number; color?: string };
export type TopOutstandingRow = { id: string; name: string; outstanding: number; totalReceived?: number; totalDue?: number; portal: string; daysOverdue: number; lastPaymentDate?: string };
export type WeekComparison = { week: string; income: number; expense: number; growth: number };

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function classifyTxType(t: any): TxType {
  const label = String(t.categoryName || t.category || t.type || t.transactionType || '').toLowerCase();
  
  if (label.includes('fee') || label.includes('monthly') || label.includes('admission') || label.includes('registration')) return 'fees';
  if (label.includes('med') || label.includes('pharmacy')) return 'medicine';
  if (label.includes('session') || label.includes('counsel') || label.includes('consult')) return 'session';
  if (label.includes('salary') || label.includes('wage') || label.includes('staff')) return 'salary';
  if (label.includes('maint') || label.includes('repair') || label.includes('bill')) return 'maintenance';
  
  return 'other';
}

/**
 * Robustly load approved transactions with error handling per department.
 */
export async function loadApprovedTx(dept: 'rehab' | 'spims' | 'job-center' | 'hq', days = 35) {
  try {
    let col = '';
    if (dept === 'rehab') col = 'rehab_transactions';
    else if (dept === 'spims') col = 'spims_transactions';
    else if (dept === 'job-center') col = 'job_center_transactions';
    else col = 'cashierTransactions';

    const snap = await getDocs(
      query(collection(db, col), where('status', '==', 'approved'), orderBy('createdAt', 'desc'), limit(days * 100))
    );
    
    return snap.docs.map((d: any) => {
      const data = d.data();
      return { 
        id: d.id, 
        ...data, 
        _dept: dept,
        _date: toDate(data.createdAt || data.date || data.transactionDate || data.dateStr)
      };
    });
  } catch (err) {
    console.warn(`[Finance] Permission or load error for ${dept}:`, err);
    return [];
  }
}

/**
 * Fetches data specifically tailored for the Finance Hub visualization.
 */
export async function fetchFinanceHubData() {
  const now = new Date();
  const today = dayKey(now);
  
  const depts = [
    { id: 'rehab', name: 'Rehab' },
    { id: 'spims', name: 'SPIMS' },
    { id: 'hq', name: 'HQ' },
    { id: 'job-center', name: 'Job Center' }
  ];

  const results = await Promise.all(depts.map(async (d) => {
    const txs = await loadApprovedTx(d.id as any, 1); // Get today's txs roughly
    const todayTxs = txs.filter(t => dayKey(t._date) === today);
    
    // Fetch pending count
    let col = '';
    if (d.id === 'rehab') col = 'rehab_transactions';
    else if (d.id === 'spims') col = 'spims_transactions';
    else if (d.id === 'job-center') col = 'job_center_transactions';
    else col = 'cashierTransactions';

    const pendingSnap = await getDocs(query(collection(db, col), where('status', '==', 'pending'))).catch(() => ({ size: 0 }));
    
    const income = todayTxs.reduce((acc, t) => (t.type !== 'expense' ? acc + (Number(t.amount) || 0) : acc), 0);
    const expense = todayTxs.reduce((acc, t) => (t.type === 'expense' ? acc + (Number(t.amount) || 0) : acc), 0);
    
    const ways: Record<string, number> = {};
    todayTxs.forEach(t => {
      if (t.type !== 'expense') {
        const type = classifyTxType(t);
        ways[type] = (ways[type] || 0) + (Number(t.amount) || 0);
      }
    });

    return {
      deptId: d.id,
      deptName: d.name,
      totalIncome: income,
      totalExpense: expense,
      pendingCount: 'size' in pendingSnap ? pendingSnap.size : 0,
      ways,
      percentOfTotal: 0 // Calculated after all depts are loaded
    };
  }));

  const grandTotal = results.reduce((acc, r) => acc + r.totalIncome, 0);
  
  return results.map(r => ({
    ...r,
    percentOfTotal: grandTotal > 0 ? (r.totalIncome / grandTotal) * 100 : 0
  }));
}

/**
 * Approves a transaction across any department collection.
 */
export async function approveTransaction(deptId: string, txId: string) {
  let col = '';
  if (deptId === 'rehab') col = 'rehab_transactions';
  else if (deptId === 'spims') col = 'spims_transactions';
  else if (deptId === 'job-center') col = 'job_center_transactions';
  else col = 'cashierTransactions';

  const txRef = doc(db, col, txId);
  await updateDoc(txRef, {
    status: 'approved',
    approvedAt: Timestamp.now(),
  });
  return true;
}

export async function fetchFinanceSummary(): Promise<FinanceSummary> {
  const now = new Date();
  const today = dayKey(now);
  const thisMonth = monthKey(now);
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = dayKey(yesterday);

  // Load last 40 days to calculate trends
  const [rehab, spims, jobcenter, hq] = await Promise.all([
    loadApprovedTx('rehab', 40),
    loadApprovedTx('spims', 40),
    loadApprovedTx('job-center', 40),
    loadApprovedTx('hq', 40)
  ]);

  const allTx = [...rehab, ...spims, ...jobcenter, ...hq];

  const sumBy = (txs: any[], predicate: (d: Date) => boolean) =>
    txs.reduce((acc, r) => predicate(r._date) ? acc + (Number(r.amount) || 0) : acc, 0);

  const collectedToday = sumBy(allTx, (d) => dayKey(d) === today);
  const collectedYesterday = sumBy(allTx, (d) => dayKey(d) === yesterdayStr);
  const collectedThisMonth = sumBy(allTx, (d) => monthKey(d) === thisMonth);
  
  const collectedDailyTrend = collectedYesterday === 0 ? 0 : ((collectedToday - collectedYesterday) / collectedYesterday) * 100;

  const [rehabPending, spimsPending, jcPending, hqPending, recPending, rehabPat, spimsStu, jcSeek] = await Promise.all([
    getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'pending'))).then(s => s.size).catch(() => 0),
    getDocs(query(collection(db, 'spims_transactions'), where('status', '==', 'pending'))).then(s => s.size).catch(() => 0),
    getDocs(query(collection(db, 'job_center_transactions'), where('status', '==', 'pending'))).then(s => s.size).catch(() => 0),
    getDocs(query(collection(db, 'cashierTransactions'), where('status', '==', 'pending'))).then(s => s.size).catch(() => 0),
    getDocs(query(collection(db, 'hq_reconciliation'), where('status', '==', 'pending'))).then(s => s.size).catch(() => 0),
    getDocs(query(collection(db, 'rehab_patients'), orderBy('createdAt', 'desc'), limit(500))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, 'spims_students'), orderBy('createdAt', 'desc'), limit(500))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, 'job_center_seekers'), orderBy('createdAt', 'desc'), limit(500))).catch(() => ({ docs: [] })),
  ]);

  const outstandingTotal = [...rehabPat.docs, ...spimsStu.docs, ...jcSeek.docs].reduce((acc, d: any) => {
    const data = d.data();
    return acc + Math.max(0, Number(data.remaining ?? data.amountRemaining ?? 0));
  }, 0);

  return {
    collectedToday,
    collectedThisMonth,
    outstandingTotal,
    pendingApprovals: rehabPending + spimsPending + jcPending + hqPending,
    pendingReconciliations: recPending,
    totalTransactionsToday: allTx.filter(t => dayKey(t._date) === today).length,
    collectedDailyTrend,
    collectedMonthlyTrend: 0,
  };
}

export type FinanceReport = {
  income: number;
  expense: number;
  net: number;
  categories: Record<string, number>;
  transactions: any[];
  start: Date;
  end: Date;
};

export async function fetchFinanceInsights(tab: FinanceTab) {
  const now = new Date();
  const days = 30;
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const deptList = tab === 'combined' ? (['rehab', 'spims', 'job-center', 'hq'] as const) : ([tab] as const);
  const approvedRows = (await Promise.all(deptList.map((d) => loadApprovedTx(d, 45)))).flat();

  // 1. Daily Series (Income vs Expense)
  const map: Record<string, { income: number; expense: number; count: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    map[dayKey(d)] = { income: 0, expense: 0, count: 0 };
  }

  for (const r of approvedRows) {
    const k = dayKey(r._date);
    if (k in map) {
      const amt = Number(r.amount) || 0;
      if (r.type === 'expense' || String(r.category || r.categoryName || '').toLowerCase().includes('expense')) {
        map[k].expense += amt;
      } else {
        map[k].income += amt;
      }
      map[k].count++;
    }
  }

  const daily: DailySeriesPoint[] = Object.keys(map)
    .sort()
    .map((k) => ({ 
      day: k, 
      income: map[k].income, 
      expense: map[k].expense, 
      count: map[k].count,
      variance: map[k].income - map[k].expense
    }));

  // 2. Type Breakdown (Pie Chart)
  const typeMap: Record<TxType, number> = { fees: 0, medicine: 0, salary: 0, maintenance: 0, session: 0, other: 0 };
  const typeColors: Record<TxType, string> = {
    fees: '#FBBF24', // Amber 400
    medicine: '#10B981', // Emerald 500
    session: '#8B5CF6', // Violet 500
    salary: '#6366F1', // Indigo 500
    maintenance: '#F87171', // Red 400
    other: '#94A3B8', // Slate 400
  };

  for (const r of approvedRows) {
    if (r._date >= start) {
      const type = classifyTxType(r);
      typeMap[type] += Number(r.amount) || 0;
    }
  }

  const totalTypeAmount = Object.values(typeMap).reduce((a, b) => a + b, 0);
  const types: TypeBreakdown[] = (Object.keys(typeMap) as TxType[]).map((t) => ({
    name: t.toUpperCase(),
    amount: typeMap[t],
    value: totalTypeAmount > 0 ? (typeMap[t] / totalTypeAmount) * 100 : 0,
    color: typeColors[t]
  })).filter(t => t.amount > 0);

  // 3. Week over Week Comparison (Bar Chart)
  const weeks: WeekComparison[] = [];
  for (let i = 3; i >= 0; i--) {
    const wStart = new Date();
    wStart.setDate(wStart.getDate() - (i * 7 + 6));
    wStart.setHours(0,0,0,0);
    const wEnd = new Date(wStart);
    wEnd.setDate(wStart.getDate() + 6);
    wEnd.setHours(23,59,59,999);

    const weekRows = approvedRows.filter(r => r._date >= wStart && r._date <= wEnd);
    const inc = weekRows.reduce((s, r) => (r.type !== 'expense' && !String(r.category || '').toLowerCase().includes('expense')) ? s + (Number(r.amount) || 0) : s, 0);
    const exp = weekRows.reduce((s, r) => (r.type === 'expense' || String(r.category || '').toLowerCase().includes('expense')) ? s + (Number(r.amount) || 0) : s, 0);
    
    weeks.push({
      week: `Week ${4-i}`,
      income: inc,
      expense: exp,
      growth: 0 
    });
  }

  // 4. Top Outstanding
  const [rehabEntities, spimsEntities, jcEntities] = await Promise.all([
    tab !== 'rehab' && tab !== 'combined' ? Promise.resolve([]) : getDocs(query(collection(db, 'rehab_patients'), orderBy('createdAt', 'desc'), limit(800))).then(s => s.docs.map(d => ({ id: d.id, ...d.data(), _dept: 'rehab' }))),
    tab !== 'spims' && tab !== 'combined' ? Promise.resolve([]) : getDocs(query(collection(db, 'spims_students'), orderBy('createdAt', 'desc'), limit(800))).then(s => s.docs.map(d => ({ id: d.id, ...d.data(), _dept: 'spims' }))),
    tab !== 'job-center' && tab !== 'combined' ? Promise.resolve([]) : getDocs(query(collection(db, 'job_center_seekers'), orderBy('createdAt', 'desc'), limit(800))).then(s => s.docs.map(d => ({ id: d.id, ...d.data(), _dept: 'job-center' }))),
  ]);

  const top: TopOutstandingRow[] = [...rehabEntities, ...spimsEntities, ...jcEntities]
    .map((e: any) => {
      const outstanding = Number(e.remaining ?? e.amountRemaining ?? 0) || 0;
      const lastPay = e.lastPaymentDate || e.updatedAt || e.createdAt;
      const created = toDate(e.createdAt);
      const daysOverdue = created ? Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))) : 0;

      return {
        id: e.id,
        name: e.name || '—',
        outstanding,
        totalReceived: e.totalReceived ?? e.amountPaid ?? 0,
        totalDue: e.packageAmount ?? e.totalCourseFee ?? 0,
        portal: e._dept,
        daysOverdue,
        lastPaymentDate: lastPay ? dayKey(toDate(lastPay)) : undefined
      };
    })
    .filter(r => r.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 15);

  const recSnap = await getDocs(query(collection(db, 'hq_reconciliation'), orderBy('createdAt', 'desc'), limit(5)));
  const recentReconciliations = recSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return { daily, types, weeks, topOutstanding: top, recentReconciliations };
}

export async function fetchFinanceReport(tab: FinanceTab, startDate: Date, endDate: Date) {
  const deptList = tab === 'combined' ? (['rehab', 'spims', 'job-center', 'hq'] as const) : ([tab] as const);
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const results = await Promise.all(deptList.map(async (dept) => {
    let col = '';
    if (dept === 'rehab') col = 'rehab_transactions';
    else if (dept === 'spims') col = 'spims_transactions';
    else if (dept === 'job-center') col = 'job_center_transactions';
    else col = 'cashierTransactions';

    const q = query(
      collection(db, col),
      where('status', '==', 'approved'),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end))
    );
    
    const snap = await getDocs(q).catch((err) => {
      console.error(`Failed to fetch ${dept} report data:`, err);
      return { docs: [] } as any;
    });
    
    return snap.docs.map((d: any) => ({ 
      id: d.id, 
      ...d.data(), 
      _dept: dept,
      _date: toDate(d.data().createdAt || d.data().date)
    }));
  }));

  const rows = results.flat();
  let income = 0;
  let expense = 0;
  const categories: Record<string, number> = {};

  for (const r of rows) {
    const amt = Number(r.amount) || 0;
    const isExp = r.type === 'expense' || String(r.categoryName || r.category || '').toLowerCase().includes('expense');
    if (isExp) expense += amt; else income += amt;
    
    const cat = r.categoryName || r.category || 'Revenue';
    categories[cat] = (categories[cat] || 0) + amt;
  }

  const transactions = rows.sort((a, b) => b._date.getTime() - a._date.getTime());

  return {
    income,
    expense,
    net: income - expense,
    categories,
    transactions,
    start,
    end
  };
}
