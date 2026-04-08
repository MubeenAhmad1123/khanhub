import { addDoc, collection, getDocs, query, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface HqNotification {
  id?: string;
  recipientId: string;
  recipientRole: string;
  type: 'tx_forwarded' | 'tx_approved' | 'tx_rejected' | 'reconciliation_flagged' | 'salary_approved';
  title: string;
  body: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

export async function sendHqNotification(notif: Omit<HqNotification, 'id' | 'isRead' | 'createdAt'>) {
  try {
    await addDoc(collection(db, 'hq_notifications'), {
      ...notif,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('HQ notification send failed:', err);
  }
}

export async function markHqNotificationRead(notifId: string) {
  await updateDoc(doc(db, 'hq_notifications', notifId), { isRead: true });
}

export async function markAllHqNotificationsRead(recipientId: string) {
  const snap = await getDocs(
    query(
      collection(db, 'hq_notifications'),
      where('recipientId', '==', recipientId),
      where('isRead', '==', false)
    )
  );
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { isRead: true })));
}
