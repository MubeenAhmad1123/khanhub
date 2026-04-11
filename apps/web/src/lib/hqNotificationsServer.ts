// filepath: src/lib/hqNotificationsServer.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === 'hq-admin');
  if (existing) return existing;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const sa = JSON.parse(json);
    return initializeApp(
      { credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) },
      'hq-admin'
    );
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin credentials missing.');
  }

  return initializeApp(
    { credential: cert({ projectId, clientEmail, privateKey }) },
    'hq-admin'
  );
}

export async function sendHqPushServer(params: {
  recipientId: string;
  recipientUid?: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  relatedId?: string;
}) {
  try {
    const app = getAdminApp();
    const adminDb = getFirestore(app);
    const messaging = getMessaging(app);

    // 1. Write to Firestore notifications collection
    await adminDb.collection('hq_notifications').add({
      recipientId: params.recipientId,
      type: params.type,
      title: params.title,
      body: params.body,
      relatedId: params.relatedId || null,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // 2. Fetch FCM tokens - Use recipientUid if provided, otherwise fallback to recipientId (for backward compatibility if IDs match)
    const tokenPathId = params.recipientUid || params.recipientId;
    const tokensSnap = await adminDb.collection(`hq_users/${tokenPathId}/fcmTokens`).get();
    const tokens = tokensSnap.docs.map((d) => d.id);

    if (tokens.length === 0) return;

    // 3. Send via FCM
    await messaging.sendEachForMulticast({
      notification: { title: params.title, body: params.body },
      data: {
        type: params.type,
        route: params.actionUrl || '/hq/dashboard',
        title: params.title,
        body: params.body,
      },
      tokens,
    });
  } catch (error) {
    console.error('[NotificationServer] Failed to send push:', error);
  }
}
