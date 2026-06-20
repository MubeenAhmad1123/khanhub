import { App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Checks if a customId already exists across all user collections (case-insensitive).
 * Ignores the check for the provided ignoreUid (the user's own UID).
 */
export async function isCustomIdTaken(
  app: App,
  customId: string,
  ignoreUid?: string
): Promise<boolean> {
  const cleanId = customId.trim();
  const lowerId = cleanId.toLowerCase();
  const upperId = cleanId.toUpperCase();
  const values = Array.from(new Set([cleanId, lowerId, upperId]));

  const collections = [
    'hq_users',
    'rehab_users',
    'spims_users',
    'hospital_users',
    'sukoon_users',
    'welfare_users',
    'jobcenter_users',
    'media_users'
  ];

  const adminDb = getFirestore(app);

  for (const col of collections) {
    const snap = await adminDb.collection(col)
      .where('customId', 'in', values)
      .limit(1)
      .get();
      
    if (!snap.empty) {
      const doc = snap.docs[0];
      if (ignoreUid && doc.id === ignoreUid) {
        continue;
      }
      return true;
    }
  }

  return false;
}
