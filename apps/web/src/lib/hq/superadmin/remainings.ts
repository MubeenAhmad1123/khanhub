// src/lib/hq/superadmin/remainings.ts
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface RemainingItem {
  id: string;
  name: string;
  rollNo?: string;
  patientId?: string;
  remaining: number;
  course?: string;
  packageAmount?: number;
}

export interface RemainingDataResult {
  rehabTotal: number;
  spimsTotal: number;
  total: number;
  rehabList: RemainingItem[];
  spimsList: RemainingItem[];
}

export async function fetchRemainingBalances(): Promise<RemainingDataResult> {
  try {
    const [rehabSnap, spimsSnap] = await Promise.all([
      getDocs(collection(db, 'rehab_patients')),
      getDocs(collection(db, 'spims_students')),
    ]);

    // 1. Process Rehab Patients
    const rehabList: RemainingItem[] = [];
    let rehabTotal = 0;

    rehabSnap.docs.forEach((d) => {
      const data = d.data();
      // Only include active patients
      if (data.isActive === false) return;

      const rem = Number(data.remaining ?? data.overallRemaining ?? data.remainingAmount ?? data.amountRemaining ?? 0);
      if (rem > 0) {
        rehabList.push({
          id: d.id,
          name: data.name || 'Anonymous Patient',
          patientId: data.patientId || d.id,
          remaining: rem,
          packageAmount: Number(data.monthlyPackage ?? data.packageAmount ?? 0),
        });
        rehabTotal += rem;
      }
    });

    // Sort Rehab patients by remaining balance descending
    rehabList.sort((a, b) => b.remaining - a.remaining);

    // 2. Process SPIMS Students
    const spimsList: RemainingItem[] = [];
    let spimsTotal = 0;

    spimsSnap.docs.forEach((d) => {
      const data = d.data();
      // Skip inactive/pass/left statuses
      const status = (data.status || '').toLowerCase();
      if (status === 'left' || status === 'pass' || status === 'fail' || status === 'terminated') return;

      const rem = Number(data.remaining ?? data.remainingBalance ?? 0);
      if (rem > 0) {
        spimsList.push({
          id: d.id,
          name: data.name || 'Anonymous Student',
          rollNo: data.rollNo || d.id,
          remaining: rem,
          course: data.course || 'Academy',
          packageAmount: Number(data.totalPackage ?? data.totalCourseFee ?? 0),
        });
        spimsTotal += rem;
      }
    });

    // Sort SPIMS students by remaining balance descending
    spimsList.sort((a, b) => b.remaining - a.remaining);

    return {
      rehabTotal,
      spimsTotal,
      total: rehabTotal + spimsTotal,
      rehabList,
      spimsList,
    };
  } catch (error) {
    console.error('Error fetching remaining balances:', error);
    return {
      rehabTotal: 0,
      spimsTotal: 0,
      total: 0,
      rehabList: [],
      spimsList: [],
    };
  }
}
