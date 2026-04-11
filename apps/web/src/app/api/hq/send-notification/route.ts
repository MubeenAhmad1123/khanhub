// filepath: src/app/api/hq/send-notification/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === 'hq-admin');
  if (existing) return existing;

  // Support both full JSON blob (Vercel secret) and split keys (local dev)
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
    throw new Error('Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.');
  }

  return initializeApp(
    { credential: cert({ projectId, clientEmail, privateKey }) },
    'hq-admin'
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { recipientId, title, body: notifBody, type, actionUrl } = body;

    if (!recipientId || !title || !notifBody) {
      return NextResponse.json({ error: 'Missing required fields: recipientId, title, body' }, { status: 400 });
    }

    const app = getAdminApp();
    const adminDb = getFirestore(app);
    const messaging = getMessaging(app);

    // Fetch all registered FCM tokens for this HQ user
    const tokensSnap = await adminDb.collection(`hq_users/${recipientId}/fcmTokens`).get();
    const tokens = tokensSnap.docs.map((d) => d.id);

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, message: 'No registered devices for this user', successCount: 0 });
    }

    const payload = {
      notification: { title, body: notifBody },
      data: {
        type: type || 'default',
        route: actionUrl || '/hq/dashboard',
        title,
        body: notifBody,
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(payload);

    // Clean up stale / revoked tokens automatically
    const staleTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code ?? '';
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          staleTokens.push(tokens[idx]);
        }
      }
    });

    if (staleTokens.length > 0) {
      const batch = adminDb.batch();
      staleTokens.forEach((token) => {
        batch.delete(adminDb.doc(`hq_users/${recipientId}/fcmTokens/${token}`));
      });
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      staleTokensRemoved: staleTokens.length,
    });
  } catch (error: any) {
    console.error('[FCM API] Error sending notification:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
