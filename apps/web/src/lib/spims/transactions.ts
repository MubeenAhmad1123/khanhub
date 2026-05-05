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
import type { Transaction } from '@/types/spims';
import { getCached, setCached } from '@/lib/queryCache';
import { toDate } from '@/lib/utils';


const CACHE_TTL = 60; // 60 seconds for transactions

export async function createTransaction(data: Omit<Transaction, 'id' | 'status' | 'approvedBy' | 'approvedAt'>): Promise<string> {
  const d = data.date instanceof Timestamp ? data.date.toDate() : (data.date as Date);
  const res = await addDoc(collection(db, 'spims_transactions'), {
    ...data,
    date: Timestamp.fromDate(d),
    status: 'pending'
  });
  return res.id;
}

export async function getTodayTransactions(cashierId: string): Promise<Transaction[]> {
  const cacheKey = `spims_today_tx_${cashierId}`;
  const cached = getCached<Transaction[]>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Removed orderBy to avoid composite index errors with where
  const q = query(
    collection(db, 'spims_transactions'), 
    where('cashierId', '==', cashierId), 
    where('date', '>=', Timestamp.fromDate(today)),
    limit(50)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data, 
      date: data.date.toDate() 
    } as Transaction;
  }).sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());


  setCached(cacheKey, results, CACHE_TTL);
  return results;
}

export async function getPendingTransactions(): Promise<Transaction[]> {
  const cacheKey = 'spims_pending_tx';
  const cached = getCached<Transaction[]>(cacheKey);
  if (cached) return cached;

  const q = query(
    collection(db, 'spims_transactions'), 
    where('status', '==', 'pending'),
    limit(50)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data, 
      date: data.date.toDate() 
    } as Transaction;
  }).sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());


  setCached(cacheKey, results, CACHE_TTL);
  return results;
}

export async function approveTransaction(id: string, superAdminId: string): Promise<void> {
  await updateDoc(doc(db, 'spims_transactions', id), {
    status: 'approved',
    approvedBy: superAdminId,
    approvedAt: Timestamp.now()
  });
}

export async function rejectTransaction(id: string, superAdminId: string): Promise<void> {
  await updateDoc(doc(db, 'spims_transactions', id), {
    status: 'rejected',
    approvedBy: superAdminId,
    approvedAt: Timestamp.now()
  });
}

export async function getTransactionsByDateRange(start: Date, end: Date): Promise<Transaction[]> {
  const cacheKey = `spims_tx_range_${start.getTime()}_${end.getTime()}`;
  const cached = getCached<Transaction[]>(cacheKey);
  if (cached) return cached;

  const q = query(
    collection(db, 'spims_transactions'), 
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end)),
    limit(50)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data, 
      date: data.date.toDate() 
    } as Transaction;
  }).sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());


  setCached(cacheKey, results, CACHE_TTL);
  return results;
}

export async function getRecentTransactions(limitCount: number = 10): Promise<Transaction[]> {
    const cacheKey = `spims_recent_tx_${limitCount}`;
    const cached = getCached<Transaction[]>(cacheKey);
    if (cached) return cached;

    const q = query(
      collection(db, 'spims_transactions'), 
      orderBy('date', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data, 
        date: data.date.toDate() 
      } as Transaction;
    });

    setCached(cacheKey, results, CACHE_TTL);
    return results;
}

