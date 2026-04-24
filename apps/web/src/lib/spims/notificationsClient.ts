// apps/web/src/lib/spims/notificationsClient.ts
'use client';

/**
 * Sends a personalized notification to a student or staff member.
 * This calls the /api/hq/send-notification endpoint.
 */
export async function sendSpimsNotification(params: {
  recipientUid: string;
  title: string;
  body: string;
  type?: 'test' | 'fee' | 'attendance' | 'general';
  actionUrl?: string;
  imageUrl?: string;
  icon?: string;
}) {
  try {
    const response = await fetch('/api/hq/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        tag: params.type ? `spims_${params.type}` : 'spims_general',
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to send notification');
    return data;
  } catch (error) {
    console.error('[SPIMS Notification] Error:', error);
    return { success: false, error };
  }
}

/**
 * Convenience helper for Test notifications
 */
export async function notifyStudentTest(params: {
  studentUid: string;
  studentName: string;
  testTitle: string;
  course: string;
  testId: string;
}) {
  return sendSpimsNotification({
    recipientUid: params.studentUid,
    title: `📝 New Test Announced`,
    body: `Hi ${params.studentName}, a new test "${params.testTitle}" has been scheduled for your ${params.course} course.`,
    type: 'test',
    actionUrl: `/departments/spims/dashboard/student/${params.studentUid}?tab=tests`,
    icon: '/icons/spims-logo.png', // Fallback to department logo
  });
}
