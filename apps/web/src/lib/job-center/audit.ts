import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Fire-and-forget audit logger for job-center portal actions.
 * Never throws — errors are silently logged to console.
 */
export async function logJobCenterAudit(
  action: string,
  performedBy: string,
  details: Record<string, any>
): Promise<void> {
  try {
    await addDoc(collection(db, 'job-center_audit'), {
      action,
      performedBy,
      details,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('[JobCenterAudit] Failed to log audit entry:', error);
  }
}
