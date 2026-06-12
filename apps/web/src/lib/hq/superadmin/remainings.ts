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
  disease?: string;
  phone?: string;
}

export interface RemainingDataResult {
  rehabTotal: number;
  spimsTotal: number;
  hospitalTotal: number;
  total: number;
  rehabList: RemainingItem[];
  spimsList: RemainingItem[];
  hospitalList: RemainingItem[];
}

export async function fetchRemainingBalances(): Promise<RemainingDataResult> {
  try {
    const [rehabSnap, spimsSnap, hospitalSnap] = await Promise.all([
      getDocs(collection(db, 'rehab_patients')),
      getDocs(collection(db, 'spims_students')),
      getDocs(collection(db, 'hospital_patients')),
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

    rehabList.sort((a, b) => b.remaining - a.remaining);

    // 2. Process SPIMS Students
    const spimsList: RemainingItem[] = [];
    let spimsTotal = 0;

    spimsSnap.docs.forEach((d) => {
      const data = d.data();
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

    spimsList.sort((a, b) => b.remaining - a.remaining);

    // 3. Process Hospital Left Patients
    const hospitalList: RemainingItem[] = [];
    let hospitalTotal = 0;

    hospitalSnap.docs.forEach((d) => {
      const data = d.data();
      const rem = Number(data.remaining ?? data.remainingAmount ?? 0);
      if (rem > 0) {
        hospitalList.push({
          id: d.id,
          name: data.name || data.fullName || 'Anonymous Patient',
          patientId: d.id,
          remaining: rem,
          disease: data.disease,
          phone: data.phone,
        });
        hospitalTotal += rem;
      }
    });

    hospitalList.sort((a, b) => b.remaining - a.remaining);

    return {
      rehabTotal,
      spimsTotal,
      hospitalTotal,
      total: rehabTotal + spimsTotal + hospitalTotal,
      rehabList,
      spimsList,
      hospitalList,
    };
  } catch (error) {
    console.error('Error fetching remaining balances:', error);
    return {
      rehabTotal: 0,
      spimsTotal: 0,
      hospitalTotal: 0,
      total: 0,
      rehabList: [],
      spimsList: [],
      hospitalList: [],
    };
  }
}
