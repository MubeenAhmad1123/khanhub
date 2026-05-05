// apps/web/src/app/hq/actions/points.ts
'use server';

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';

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

export type PointCategory = 'attendance' | 'dress' | 'duty' | 'contribution';

/**
 * Awards 1 point to a staff member for a specific category today.
 * Ensures only 1 point per category per day.
 */
export async function awardStaffPoint(
  uid: string,
  dept: string,
  category: PointCategory,
  date: string // YYYY-MM-DD
) {
  try {
    const app = getAdminApp();
    const db = getFirestore(app);
    
    const prefix = dept.replace('-', '_');
    const pointsCol = `${prefix}_growth_points`;
    const usersCol = dept === 'hq' ? 'hq_users' : (dept === 'job-center' ? 'jobcenter_users' : `${prefix}_users`);
    
    // 1. Check if already awarded for this category/date
    const existing = await db.collection(pointsCol)
      .where('staffId', '==', uid)
      .where('date', '==', date)
      .where('category', '==', category)
      .limit(1)
      .get();
      
    if (!existing.empty) return { success: true, alreadyAwarded: true };

    // 2. Add Point record
    await db.collection(pointsCol).add({
      staffId: uid,
      date,
      month: date.substring(0, 7), // YYYY-MM for historical queries
      category,
      points: 1,
      createdAt: new Date(),
      note: `Point awarded for ${category}`,
    });

    // 3. Increment total points in staff profile
    await db.collection(usersCol).doc(uid).update({
      totalGrowthPoints: FieldValue.increment(1)
    }).catch(() => null); // Ignore if field doesn't exist yet

    return { success: true };
  } catch (err: any) {
    console.error('[AwardPoint] Error:', err);
    return { success: false, error: err.message };
  }
}
