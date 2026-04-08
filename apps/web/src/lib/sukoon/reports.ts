import { getTransactionsByDateRange } from './transactions';
import type { Transaction } from '@/types/sukoon';

export async function generateMonthlyReport(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  
  const transactions = await getTransactionsByDateRange(start, end);
  const approved = transactions.filter(t => t.status === 'approved');
  
  const income = approved.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = approved.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  const categoryBreakdown = approved.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + (t.type === 'income' ? t.amount : -t.amount);
    return acc;
  }, {} as Record<string, number>);

  return {
    period: `${year}-${month.toString().padStart(2, '0')}`,
    totalIncome: income,
    totalExpenses: expenses,
    netBalance: income - expenses,
    categoryBreakdown,
    transactionCount: approved.length
  };
}
