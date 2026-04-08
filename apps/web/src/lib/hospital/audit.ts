import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Fire-and-forget audit logger for hospital portal actions.
 * Never throws — errors are silently logged to console.
 */
export async function logHospitalAudit(
  action: string,
  performedBy: string,
  details: Record<string, any>
): Promise<void> {
  try {
    await addDoc(collection(db, 'hospital_audit'), {
      action,
      performedBy,
      details,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('[HospitalAudit] Failed to log audit entry:', error);
  }
}
