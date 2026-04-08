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
import type { Transaction } from '@/types/hospital';

export async function createTransaction(data: Omit<Transaction, 'id' | 'status' | 'approvedBy' | 'approvedAt'>): Promise<string> {
  const res = await addDoc(collection(db, 'hospital_transactions'), {
    ...data,
    date: data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date,
    status: 'pending'
  });
  return res.id;
}

export async function getTodayTransactions(cashierId: string): Promise<Transaction[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, 'hospital_transactions'), 
    where('cashierId', '==', cashierId), 
    where('date', '>=', Timestamp.fromDate(today)),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data, 
      date: data.date.toDate() 
    } as Transaction;
  });
}

export async function getPendingTransactions(): Promise<Transaction[]> {
  const q = query(
    collection(db, 'hospital_transactions'), 
    where('status', '==', 'pending'),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data, 
      date: data.date.toDate() 
    } as Transaction;
  });
}

export async function approveTransaction(id: string, superAdminId: string): Promise<void> {
  await updateDoc(doc(db, 'hospital_transactions', id), {
    status: 'approved',
    approvedBy: superAdminId,
    approvedAt: Timestamp.now()
  });
}

export async function rejectTransaction(id: string, superAdminId: string): Promise<void> {
  await updateDoc(doc(db, 'hospital_transactions', id), {
    status: 'rejected',
    approvedBy: superAdminId,
    approvedAt: Timestamp.now()
  });
}

export async function getTransactionsByDateRange(start: Date, end: Date): Promise<Transaction[]> {
  const q = query(
    collection(db, 'hospital_transactions'), 
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end)),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data, 
      date: data.date.toDate() 
    } as Transaction;
  });
}

export async function getRecentTransactions(limitCount: number = 10): Promise<Transaction[]> {
    const q = query(
      collection(db, 'hospital_transactions'), 
      orderBy('date', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data, 
        date: data.date.toDate() 
      } as Transaction;
    });
  }
