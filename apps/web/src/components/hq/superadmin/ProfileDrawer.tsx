// apps/web/src/components/hq/superadmin/ProfileDrawer.tsx
'use client';

import React from 'react';
import { X } from 'lucide-react';

export function ProfileDrawer({
  open,
  onClose,
  title = 'Profile',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full sm:w-[480px] bg-white dark:bg-gray-950 border-l border-gray-100 dark:border-white/10 shadow-2xl">
        <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="text-lg font-black text-gray-900 dark:text-white">{title}</div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/10 border border-gray-100 dark:border-white/10 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-200" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto h-[calc(100vh-76px)]">{children}</div>
      </div>
    </div>
  );
}

