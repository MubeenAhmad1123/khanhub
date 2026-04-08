import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Fire-and-forget audit logger for welfare portal actions.
 * Never throws — errors are silently logged to console.
 */
export async function logWelfareAudit(
  action: string,
  performedBy: string,
  details: Record<string, any>
): Promise<void> {
  try {
    await addDoc(collection(db, 'welfare_audit'), {
      action,
      performedBy,
      details,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('[WelfareAudit] Failed to log audit entry:', error);
  }
}
