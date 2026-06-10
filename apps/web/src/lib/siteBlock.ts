// apps/web/src/lib/siteBlock.ts
import { adminDb } from '@/lib/firebaseAdmin';

export async function getSiteBlockState(): Promise<{
  isBlocked: boolean;
  heading: string;
  message: string;
  scheduledUnblockAt: Date | null;
}> {
  const docRef = adminDb.doc('settings/siteBlock');
  const defaults = {
    isBlocked: false,
    heading: 'Site Unavailable',
    message: 'This site is currently unavailable.',
    scheduledUnblockAt: null as Date | null,
  };

  try {
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return defaults;
    }

    const data = docSnap.data();
    if (!data) {
      return defaults;
    }

    const isBlocked = typeof data.isBlocked === 'boolean' ? data.isBlocked : defaults.isBlocked;
    const heading = typeof data.heading === 'string' ? data.heading : defaults.heading;
    const message = typeof data.message === 'string' ? data.message : defaults.message;
    
    let scheduledUnblockAt: Date | null = null;
    if (data.scheduledUnblockAt) {
      if (typeof data.scheduledUnblockAt.toDate === 'function') {
        scheduledUnblockAt = data.scheduledUnblockAt.toDate();
      } else if (data.scheduledUnblockAt instanceof Date) {
        scheduledUnblockAt = data.scheduledUnblockAt;
      } else if (typeof data.scheduledUnblockAt === 'string') {
        scheduledUnblockAt = new Date(data.scheduledUnblockAt);
      }
    }

    // Check if auto-unblock is scheduled and has passed
    if (scheduledUnblockAt && scheduledUnblockAt.getTime() < Date.now()) {
      await docRef.update({
        isBlocked: false,
        scheduledUnblockAt: null,
        updatedAt: new Date(),
      });

      return {
        isBlocked: false,
        heading,
        message,
        scheduledUnblockAt: null,
      };
    }

    return {
      isBlocked,
      heading,
      message,
      scheduledUnblockAt,
    };
  } catch (error) {
    console.error('[siteBlock] Failed to read or update site block settings:', error);
    return defaults;
  }
}
