// apps/web/src/lib/hq/superadmin/analytics.ts

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type AnalyticsMetrics = {
  grossRevenue: number;
  revenueGrowth: number;
  retentionRate: number;
  retentionGrowth: number;
  activeNodes: number;
  nodeGrowth: number;
  conversionIndex: number;
  conversionGrowth: number;
};

export type FinanceInsights = {
  dailySeries: { date: string; amount: number }[];
  typeBreakdown: { name: string; value: number }[];
  topOutstanding: { id: string; name: string; amount: number; type: string }[];
};

export interface TimeSeriesData {
  date: string;
  rehab: number;
  spims: number;
  jobCenter: number;
  total: number;
};

export type GrowthMetrics = {
  currentMonth: number;
  previousMonth: number;
  percentageChange: number;
};

export type AnalyticsData = {
  revenueGrowth: TimeSeriesData[];
  userGrowth: TimeSeriesData[];
  revenueByDept: { name: string; value: number; color: string }[];
  totalRevenue: number;
  totalUsers: number;
};

const DEPT_COLORS = {
  rehab: '#ef4444', // Tailwind rose-500
  spims: '#14b8a6', // Tailwind teal-500
  jobCenter: '#f59e0b', // Tailwind amber-500
};

export async function fetchAnalyticsMetrics(tab: string, range: string): Promise<AnalyticsMetrics> {
  // Mocking detailed metrics until actual aggregation is implemented
  return {
    grossRevenue: 12450000,
    revenueGrowth: 12.4,
    retentionRate: 94,
    retentionGrowth: 2.1,
    activeNodes: 124,
    nodeGrowth: 8,
    conversionIndex: 68,
    conversionGrowth: -1.2
  };
}

export async function fetchFinanceInsights(): Promise<FinanceInsights> {
  // This would typically aggregate from all departments
  return {
    dailySeries: [
      { date: 'Apr 01', amount: 450000 },
      { date: 'Apr 02', amount: 520000 },
      { date: 'Apr 03', amount: 480000 },
      { date: 'Apr 04', amount: 610000 },
      { date: 'Apr 05', amount: 550000 },
      { date: 'Apr 06', amount: 670000 },
      { date: 'Apr 07', amount: 720000 },
    ],
    typeBreakdown: [
      { name: 'Rehab', value: 45 },
      { name: 'SPIMS', value: 25 },
      { name: 'Job Center', value: 20 },
      { name: 'HQ', value: 10 },
    ],
    topOutstanding: [
      { id: '1', name: 'Zeeshan Ahmad', amount: 125000, type: 'Rehab' },
      { id: '2', name: 'Mubeen Khan', amount: 85000, type: 'SPIMS' },
      { id: '3', name: 'Sajid Ali', amount: 45000, type: 'Job Center' },
    ]
  };
}

export async function fetchAnalyticsData(): Promise<AnalyticsData> {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  // 1. Fetch Transactions for Revenue Growth
  const [rehabTxs, spimsTxs, jobTxs] = await Promise.all([
    getDocs(query(
      collection(db, 'rehab_transactions'),
      where('status', '==', 'approved'),
      where('createdAt', '>=', Timestamp.fromDate(sixMonthsAgo)),
      orderBy('createdAt', 'asc')
    )).catch(() => ({ docs: [] } as any)),
    getDocs(query(
      collection(db, 'spims_transactions'),
      where('status', '==', 'approved'),
      where('createdAt', '>=', Timestamp.fromDate(sixMonthsAgo)),
      orderBy('createdAt', 'asc')
    )).catch(() => ({ docs: [] } as any)),
    getDocs(query(
      collection(db, 'job_center_transactions'),
      where('status', '==', 'approved'),
      where('createdAt', '>=', Timestamp.fromDate(sixMonthsAgo)),
      orderBy('createdAt', 'asc')
    )).catch(() => ({ docs: [] } as any)),
  ]);

  // Aggregate monthly revenue
  const monthlyRevenue: Record<string, TimeSeriesData> = {};
  
  const processTxs = (docs: any[], deptKey: keyof Omit<TimeSeriesData, 'date' | 'total'>) => {
    docs.forEach(doc => {
      const data = doc.data();
      const rawDate = data.createdAt || data.date || data.transactionDate;
      if (!rawDate) return;
      
      const date = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
      const monthYear = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      
      if (!monthlyRevenue[monthYear]) {
        monthlyRevenue[monthYear] = { date: monthYear, rehab: 0, spims: 0, jobCenter: 0, total: 0 };
      }
      
      const amount = Number(data.amount) || 0;
      monthlyRevenue[monthYear][deptKey] += amount;
      monthlyRevenue[monthYear].total += amount;
    });
  };

  processTxs(rehabTxs.docs, 'rehab');
  processTxs(spimsTxs.docs, 'spims');
  processTxs(jobTxs.docs, 'jobCenter');

  const revenueGrowth = Object.values(monthlyRevenue);

  // 2. Fetch User Growth (Last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [rehabUsers, spimsUsers, jobUsers] = await Promise.all([
    getDocs(query(
      collection(db, 'rehab_patients'),
      where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('createdAt', 'asc')
    )).catch(() => ({ docs: [] } as any)),
    getDocs(query(
      collection(db, 'spims_students'),
      where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('createdAt', 'asc')
    )).catch(() => ({ docs: [] } as any)),
    getDocs(query(
      collection(db, 'job_center_seekers'),
      where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('createdAt', 'asc')
    )).catch(() => ({ docs: [] } as any)),
  ]);

  const dailyUsers: Record<string, TimeSeriesData> = {};
  
  const processUsers = (docs: any[], deptKey: keyof Omit<TimeSeriesData, 'date' | 'total'>) => {
    docs.forEach(doc => {
      const data = doc.data();
      const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
      const dateStr = date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      
      if (!dailyUsers[dateStr]) {
        dailyUsers[dateStr] = { date: dateStr, rehab: 0, spims: 0, jobCenter: 0, total: 0 };
      }
      
      dailyUsers[dateStr][deptKey] += 1;
      dailyUsers[dateStr].total += 1;
    });
  };

  processUsers(rehabUsers.docs, 'rehab');
  processUsers(spimsUsers.docs, 'spims');
  processUsers(jobUsers.docs, 'jobCenter');

  const userGrowth = Object.values(dailyUsers);

  // 3. Totals and Dept Split
  let totalRehabRev = 0;
  let totalSpimsRev = 0;
  let totalJobRev = 0;
  
  revenueGrowth.forEach(m => {
    totalRehabRev += m.rehab;
    totalSpimsRev += m.spims;
    totalJobRev += m.jobCenter;
  });

  const totalRevenue = totalRehabRev + totalSpimsRev + totalJobRev;

  return {
    revenueGrowth,
    userGrowth,
    revenueByDept: [
      { name: 'Rehab', value: totalRehabRev, color: DEPT_COLORS.rehab },
      { name: 'SPIMS', value: totalSpimsRev, color: DEPT_COLORS.spims },
      { name: 'Job Center', value: totalJobRev, color: DEPT_COLORS.jobCenter },
    ],
    totalRevenue,
    totalUsers: rehabUsers.size + spimsUsers.size + jobUsers.size,
  };
}
