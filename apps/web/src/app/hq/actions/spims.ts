'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { sendHqPushServer } from '@/lib/hqNotificationsServer';
import { requireHqSuperadmin } from './auth';

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === 'hq-admin');
  if (existing) return existing;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing');
  const sa = JSON.parse(json);
  return initializeApp(
    {
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    },
    'hq-admin'
  );
}

export async function announceSpimsTestServer(params: {
  title: string;
  scope: 'all' | 'course_session' | 'student';
  course?: string | null;
  session?: string | null;
  studentId?: string | null;
  note?: string | null;
  createdBy: string;
  testDate?: string | null;
}) {
  try {
    const app = getAdminApp();
    const adminDb = getFirestore(app);

    // 1. Create the test record
    const testRef = await adminDb.collection('spims_tests').add({
      ...params,
      createdAt: new Date(),
    });

    // 2. Determine target students
    let studentQuery: FirebaseFirestore.Query = adminDb.collection('spims_users')
      .where('role', '==', 'student')
      .where('isActive', '==', true);

    if (params.scope === 'course_session') {
      studentQuery = studentQuery.where('course', '==', params.course).where('session', '==', params.session);
    } else if (params.scope === 'student') {
      studentQuery = studentQuery.where('studentId', '==', params.studentId);
    }

    const studentSnaps = await studentQuery.get();
    const studentUids = studentSnaps.docs.map(d => d.id);

    // 3. Send notifications to all target students
    const notificationPromises = studentSnaps.docs.map(async (doc) => {
      const data = doc.data();
      return sendHqPushServer({
        recipientId: data.customId || data.studentId || doc.id,
        recipientUid: doc.id,
        userCollection: 'spims_users',
        type: 'test_announcement',
        title: 'New Test Announced! 📝',
        body: `${params.title}${params.note ? `\nNote: ${params.note}` : ''}`,
        actionUrl: `/departments/spims/dashboard/student/${data.studentId || doc.id}`,
        imageUrl: 'https://www.khanhub.com.pk/icons/test-banner.png', // Example banner
        tag: 'spims_test'
      });
    });

    await Promise.all(notificationPromises);

    return { success: true, testId: testRef.id, notifiedCount: studentUids.length };
  } catch (error: any) {
    console.error('[SpimsAction] Failed to announce test:', error);
    return { success: false, error: error?.message || 'Internal error' };
  }
}
