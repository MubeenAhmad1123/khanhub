import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Transaction } from '@/types/job-center';
import { getCached, setCached } from '@/lib/queryCache';
import { toDate } from '@/lib/utils';


export async function createTransaction(data: Omit<Transaction, 'id' | 'status' | 'approvedBy' | 'approvedAt'>): Promise<string> {
  const res = await addDoc(collection(db, 'jobcenter_transactions'), {
    ...data,
    date: data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date,
    status: 'pending'
  });
  return res.id;
}

export async function getTodayTransactions(cashierId: string): Promise<Transaction[]> {
  const cacheKey = `jobcenter_today_tx_${cashierId}`;
  const cached = getCached<Transaction[]>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, 'jobcenter_transactions'), 
    where('cashierId', '==', cashierId), 
    where('date', '>=', Timestamp.fromDate(today)),
    limit(50)
  );
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => {
    const d = doc.data();
    return { 
      id: doc.id, 
      ...d, 
      date: d.date.toDate() 
    } as Transaction;
  }).sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());


  setCached(cacheKey, data, 60);
  return data;
}

export async function getPendingTransactions(): Promise<Transaction[]> {
  const cacheKey = 'jobcenter_pending_tx';
  const cached = getCached<Transaction[]>(cacheKey);
  if (cached) return cached;

  const q = query(
    collection(db, 'jobcenter_transactions'), 
    where('status', '==', 'pending'),
    limit(50)
  );
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => {
    const d = doc.data();
    return { 
      id: doc.id, 
      ...d, 
      date: d.date.toDate() 
    } as Transaction;
  }).sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());


  setCached(cacheKey, data, 60);
  return data;
}

export async function approveTransaction(id: string, superAdminId: string): Promise<void> {
  await updateDoc(doc(db, 'jobcenter_transactions', id), {
    status: 'approved',
    approvedBy: superAdminId,
    approvedAt: Timestamp.now()
  });
}

export async function rejectTransaction(id: string, superAdminId: string): Promise<void> {
  await updateDoc(doc(db, 'jobcenter_transactions', id), {
    status: 'rejected',
    approvedBy: superAdminId,
    approvedAt: Timestamp.now()
  });
}

export async function getTransactionsByDateRange(start: Date, end: Date): Promise<Transaction[]> {
  const cacheKey = `jobcenter_tx_range_${start.getTime()}_${end.getTime()}`;
  const cached = getCached<Transaction[]>(cacheKey);
  if (cached) return cached;

  const q = query(
    collection(db, 'jobcenter_transactions'), 
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end)),
    limit(100)
  );
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => {
    const d = doc.data();
    return { 
      id: doc.id, 
      ...d, 
      date: d.date.toDate() 
    } as Transaction;
  }).sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());


  setCached(cacheKey, data, 60);
  return data;
}

export async function getRecentTransactions(limitCount: number = 10): Promise<Transaction[]> {
    const q = query(
      collection(db, 'jobcenter_transactions'), 
      limit(Math.min(limitCount, 50))
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const d = doc.data();
      return { 
        id: doc.id, 
        ...d, 
        date: d.date.toDate() 
      } as Transaction;
    }).sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());
  }

