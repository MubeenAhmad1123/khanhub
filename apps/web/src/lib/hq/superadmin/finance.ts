// apps/web/src/lib/hq/superadmin/finance.ts

import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDate } from '@/lib/utils';

export type FinanceTab = 'combined' | 'rehab' | 'spims';
export type TxType = 'monthly' | 'admission' | 'registration' | 'examination' | 'other';

export type FinanceSummary = {
  collectedToday: number;
  collectedThisMonth: number;
  outstandingTotal: number;
  pendingApprovals: number;
};

export type DailySeriesPoint = { day: string; amount: number };
export type TypeBreakdown = { type: TxType; amount: number };
export type TopOutstandingRow = { id: string; name: string; outstanding: number; totalReceived?: number; totalDue?: number };

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function classifyTxType(t: any): TxType {
  const label = String(t.categoryName || t.category || t.type || '').toLowerCase();
  if (label.includes('monthly')) return 'monthly';
  if (label.includes('admission')) return 'admission';
  if (label.includes('registration')) return 'registration';
  if (label.includes('exam')) return 'examination';
  return 'other';
}

export async function loadApprovedTx(dept: 'rehab' | 'spims', days = 35) {
  const col = dept === 'rehab' ? 'rehab_transactions' : 'spims_transactions';
  const snap = await getDocs(
    query(collection(db, col), where('status', '==', 'approved'), orderBy('createdAt', 'desc'), limit(days * 300))
  ).catch(() => ({ docs: [] } as any));
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data(), _dept: dept }));
}

export async function fetchFinanceSummary(): Promise<FinanceSummary> {
  const now = new Date();
  const today = dayKey(now);
  const thisMonth = monthKey(now);

  const [rehabApproved, spimsApproved, rehabPending, spimsPending, rehabOutstanding, spimsOutstanding] =
    await Promise.all([
      loadApprovedTx('rehab', 5),
      loadApprovedTx('spims', 5),
      getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'pending'))).then((s) => s.size).catch(() => 0),
      getDocs(query(collection(db, 'spims_transactions'), where('status', '==', 'pending'))).then((s) => s.size).catch(() => 0),
      getDocs(query(collection(db, 'rehab_patients'), orderBy('createdAt', 'desc'), limit(500))).catch(() => ({ docs: [] } as any)),
      getDocs(query(collection(db, 'spims_students'), orderBy('createdAt', 'desc'), limit(500))).catch(() => ({ docs: [] } as any)),
    ]);

  const sumApproved = (rows: any[], predicate: (d: Date) => boolean) =>
    rows.reduce((acc, r) => {
      const d = toDate(r.createdAt || r.date || r.transactionDate);
      if (!predicate(d)) return acc;
      return acc + (Number(r.amount) || 0);
    }, 0);

  const collectedToday = sumApproved([...rehabApproved, ...spimsApproved], (d) => dayKey(d) === today);
  const collectedThisMonth = sumApproved([...rehabApproved, ...spimsApproved], (d) => monthKey(d) === thisMonth);

  const outstandingFrom = (snap: any) =>
    snap.docs.reduce((acc: number, d: any) => {
      const data = d.data();
      const rem = Number(data.remaining ?? data.amountRemaining ?? 0) || 0;
      return acc + Math.max(0, rem);
    }, 0);

  return {
    collectedToday,
    collectedThisMonth,
    outstandingTotal: outstandingFrom(rehabOutstanding) + outstandingFrom(spimsOutstanding),
    pendingApprovals: rehabPending + spimsPending,
  };
}

export async function fetchFinanceInsights(tab: FinanceTab) {
  const now = new Date();
  const days = 30;
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));

  const deptList = tab === 'combined' ? (['rehab', 'spims'] as const) : ([tab] as const);
  const approvedRows = (await Promise.all(deptList.map((d) => loadApprovedTx(d, 40)))).flat();

  // Daily series (last 30 days)
  const map: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    map[dayKey(d)] = 0;
  }
  for (const r of approvedRows) {
    const d = toDate(r.createdAt || r.date || r.transactionDate);
    const k = dayKey(d);
    if (k in map) map[k] += Number(r.amount) || 0;
  }
  const daily: DailySeriesPoint[] = Object.keys(map)
    .sort()
    .map((k) => ({ day: k, amount: map[k] }));

  // Type breakdown (last 30 days)
  const typeMap: Record<TxType, number> = { monthly: 0, admission: 0, registration: 0, examination: 0, other: 0 };
  for (const r of approvedRows) {
    const d = toDate(r.createdAt || r.date || r.transactionDate);
    if (d < start) continue;
    const t = classifyTxType(r);
    typeMap[t] += Number(r.amount) || 0;
  }
  const types: TypeBreakdown[] = (Object.keys(typeMap) as TxType[]).map((t) => ({ type: t, amount: typeMap[t] }));

  // Top outstanding (patients/students)
  const [rehabEntities, spimsEntities] = await Promise.all([
    tab === 'spims' ? Promise.resolve([] as any[]) : getDocs(query(collection(db, 'rehab_patients'), orderBy('createdAt', 'desc'), limit(800))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data(), _dept: 'rehab' }))).catch(() => []),
    tab === 'rehab' ? Promise.resolve([] as any[]) : getDocs(query(collection(db, 'spims_students'), orderBy('createdAt', 'desc'), limit(800))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data(), _dept: 'spims' }))).catch(() => []),
  ]);

  const top = [...rehabEntities, ...spimsEntities]
    .map((e) => {
      const outstanding = Number(e.remaining ?? e.amountRemaining ?? 0) || 0;
      return {
        id: `${e._dept}_${e.id}`,
        name: String(e.name || '—'),
        outstanding,
        totalReceived: e.totalReceived ?? e.amountPaid,
        totalDue: e.packageAmount ?? e.totalCourseFee,
      } as TopOutstandingRow;
    })
    .filter((r) => r.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 10);

  return { daily, types, topOutstanding: top };
}

export async function loadTransactions(dept: 'rehab' | 'spims', start: Date, end: Date) {
  const col = dept === 'rehab' ? 'rehab_transactions' : 'spims_transactions';
  const { query, collection, where, orderBy, getDocs } = await import('firebase/firestore');
  const snap = await getDocs(
    query(
      collection(db, col), 
      where('status', '==', 'approved'), 
      where('transactionDate', '>=', start),
      where('transactionDate', '<=', end),
      orderBy('transactionDate', 'desc')
    )
  ).catch(async () => {
    return getDocs(
      query(
        collection(db, col), 
        where('status', '==', 'approved'),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end),
        orderBy('createdAt', 'desc')
      )
    ).catch(() => ({ docs: [] } as any));
  });
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data(), _dept: dept }));
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

export async function fetchFinanceReport(tab: FinanceTab, start: Date, end: Date): Promise<FinanceReport> {
  const deptList = tab === 'combined' ? (['rehab', 'spims'] as const) : ([tab] as const);
  const rows = (await Promise.all(deptList.map((d) => loadTransactions(d, start, end)))).flat();

  let income = 0;
  let expense = 0;
  const categories: Record<string, number> = {};

  for (const r of rows) {
    const amt = Number(r.amount) || 0;
    const isExpense = r.type === 'expense' || String(r.categoryName || r.category || '').toLowerCase().includes('expense');
    
    if (isExpense) {
      expense += amt;
    } else {
      income += amt;
    }

    const cat = r.categoryName || r.category || 'Other';
    categories[cat] = (categories[cat] || 0) + amt;
  }

  return {
    income,
    expense,
    net: income - expense,
    categories,
    transactions: rows.sort((a, b) => toDate(b.transactionDate || b.createdAt).getTime() - toDate(a.transactionDate || a.createdAt).getTime()),
    start,
    end
  };
}

