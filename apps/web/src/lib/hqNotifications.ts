import {
  addDoc,
  collection,
  getDocs,
  query,
  updateDoc,
  doc,
  where,
  onSnapshot,
  orderBy,
  limit,
  type Unsubscribe,
} from 'firebase/firestore';
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

/** Write a Firestore notification document */
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

/** Send a Firestore notification + trigger an FCM push via the API route */
export async function sendHqPushNotification(params: {
  recipientId: string;
  recipientRole: string;
  type: HqNotification['type'];
  title: string;
  body: string;
  relatedId?: string;
  actionUrl?: string;
  recipientUid?: string;
}) {
  // Always write to Firestore first (notification bell source)
  await sendHqNotification({
    recipientId: params.recipientId,
    recipientRole: params.recipientRole,
    type: params.type,
    title: params.title,
    body: params.body,
    relatedId: params.relatedId,
  });

  // Then attempt FCM push in background — fail silently so it never breaks UX
  try {
    await fetch('/api/hq/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: params.recipientUid || params.recipientId,
        title: params.title,
        body: params.body,
        type: params.type,
        actionUrl: params.actionUrl,
      }),
    });
  } catch (err) {
    console.warn('[FCM] Push delivery failed (non-critical):', err);
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
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { isRead: true })));
}

/**
 * Subscribe to real-time notifications for a user.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export function subscribeHqNotifications(
  recipientId: string,
  onUpdate: (notifications: HqNotification[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'hq_notifications'),
    where('recipientId', '==', recipientId),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as HqNotification));
    onUpdate(data);
  });
}
