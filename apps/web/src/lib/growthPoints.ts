// src/lib/growthPoints.ts
// Growth Point & Score calculation utilities for Khan Hub (April 2026)

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MONTHLY_REWARDS, WEEKLY_RULE } from '@/data/scoreRules';

// Calculate monthly score from all 4 categories (Group removed)
export function calculateMonthlyScore(data: {
  attendanceDays: number;   // days present on time
  uniformDays: number;      // days full uniform worn
  workingDays: number;      // days all tasks complete
  growthPoints: number;     // growth contributions submitted
  totalWorkingDays: number; // total days in period
}): {
  scores: Record<string, number>;
  total: number;
  reward: typeof MONTHLY_REWARDS[0] | null;
  weeklyEligible: boolean;
} {
  const scores = {
    attendance: Math.min(data.attendanceDays, 30),
    uniform: Math.min(data.uniformDays, 30),
    working: Math.min(data.workingDays, 30),
    growthPoint: Math.min(data.growthPoints, 30),
  };

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const reward = MONTHLY_REWARDS.find(r => total >= r.minScore) || null;
  const weeklyEligible = total >= WEEKLY_RULE.minScore;

  return { scores, total, reward, weeklyEligible };
}

// Get staff monthly performance doc
// Doc ID format: {staffId}_{YYYY-MM}
export async function getStaffMonthlyScore(staffId: string, month: string) {
  try {
    const docRef = doc(db, 'rehab_growth_points', `${staffId}_${month}`);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  } catch { 
    return null; 
  }
}

// Save monthly growth points
export async function saveGrowthPoints(staffId: string, month: string, data: object) {
  const docRef = doc(db, 'rehab_growth_points', `${staffId}_${month}`);
  await setDoc(docRef, { staffId, month, ...data, updatedAt: new Date().toISOString() }, { merge: true });
}
