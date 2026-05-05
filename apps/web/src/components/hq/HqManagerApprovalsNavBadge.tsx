'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDeptPrefix, StaffDept } from '@/lib/hq/superadmin/staff';

export function HqManagerApprovalsNavBadge() {
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const depts: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];
    const unsubscribes: (() => void)[] = [];
    const counts: Record<string, number> = {};

    depts.forEach(d => {
      const colName = `${getDeptPrefix(d)}_contributions`;
      const q = query(
        collection(db, colName),
        where('isApproved', '==', false)
      );

      const unsub = onSnapshot(
        q,
        (snap) => {
          // Filter out docs that have empty content to keep it consistent with the table
          const docs = snap.docs.map(docSnap => docSnap.data());
          const validDocs = docs.filter(c => c.content && typeof c.content === 'string' && c.content.trim() !== '');
          counts[d] = validDocs.length;

          // Compute total count
          const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
          setTotalCount(total);
        },
        (err) => {
          console.warn(`Permission denied or error listening to ${d} contributions:`, err);
        }
      );

      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  if (totalCount <= 0) return null;

  return (
    <span className="ml-auto min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-400 text-gray-900 text-[10px] font-black flex items-center justify-center tabular-nums">
      {totalCount > 99 ? '99+' : totalCount}
    </span>
  );
}
