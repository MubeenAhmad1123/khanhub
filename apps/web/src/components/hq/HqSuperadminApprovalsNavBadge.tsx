// apps/web/src/components/hq/HqSuperadminApprovalsNavBadge.tsx
'use client';

import { useEffect, useState } from 'react';
import { subscribePendingApprovalsCount } from '@/lib/hq/superadmin/approvals';

export function HqSuperadminApprovalsNavBadge() {
  const [n, setN] = useState(0);

  useEffect(() => {
    return subscribePendingApprovalsCount({ onCount: setN });
  }, []);

  if (n <= 0) return null;

  return (
    <span className="ml-auto min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-400 text-gray-900 text-[10px] font-black flex items-center justify-center tabular-nums">
      {n > 99 ? '99+' : n}
    </span>
  );
}
