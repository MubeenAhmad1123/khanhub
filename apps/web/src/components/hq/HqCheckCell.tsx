// src/components/hq/HqCheckCell.tsx
// Reusable animated check cell for monthly grid tables.
// Used by manager (editable) and staff (read-only).
// Three states: yes/done (teal), no/not_done (red), na (gray)

'use client';

import { useState } from 'react';

export type CheckState = 'yes' | 'no' | 'na';
export type DutyState = 'done' | 'not_done' | 'na';
export type AttendanceState = 'present' | 'absent' | 'leave' | 'paid_leave' | 'unpaid_leave' | 'unmarked';

interface HqCheckCellProps {
  value: CheckState | DutyState | AttendanceState;
  readOnly?: boolean;
  size?: 'sm' | 'md';
  onToggle?: (next: CheckState | DutyState | AttendanceState) => void;
  type?: 'dresscode' | 'duty' | 'attendance';
}

const DRESSCODE_CYCLE: CheckState[] = ['yes', 'no', 'na'];
const DUTY_CYCLE: DutyState[] = ['done', 'not_done', 'na'];
const ATTENDANCE_CYCLE: AttendanceState[] = ['present', 'absent', 'leave', 'paid_leave', 'unpaid_leave', 'unmarked'];

const CONFIG = {
  dresscode: {
    yes: {
      bg: 'bg-teal-500',
      border: 'border-teal-500',
      icon: '✓',
      textColor: 'text-white',
    },
    no: {
      bg: 'bg-red-500',
      border: 'border-red-500',
      icon: '✗',
      textColor: 'text-white',
    },
    na: {
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      icon: '–',
      textColor: 'text-gray-400',
    },
  },
  duty: {
    done: {
      bg: 'bg-teal-500',
      border: 'border-teal-500',
      icon: '✓',
      textColor: 'text-white',
    },
    not_done: {
      bg: 'bg-red-500',
      border: 'border-red-500',
      icon: '✗',
      textColor: 'text-white',
    },
    na: {
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      icon: '–',
      textColor: 'text-gray-400',
    },
  },
  attendance: {
    present: {
      bg: 'bg-teal-500',
      border: 'border-teal-500',
      icon: 'P',
      textColor: 'text-white',
    },
    absent: {
      bg: 'bg-red-500',
      border: 'border-red-500',
      icon: 'A',
      textColor: 'text-white',
    },
    leave: {
      bg: 'bg-amber-400',
      border: 'border-amber-400',
      icon: 'L',
      textColor: 'text-white',
    },
    paid_leave: {
      bg: 'bg-blue-500',
      border: 'border-blue-500',
      icon: 'PL',
      textColor: 'text-white',
    },
    unpaid_leave: {
      bg: 'bg-purple-500',
      border: 'border-purple-500',
      icon: 'UL',
      textColor: 'text-white',
    },
    unmarked: {
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      icon: '·',
      textColor: 'text-gray-300',
    },
  },
};

export function HqCheckCell({
  value,
  readOnly = false,
  size = 'sm',
  onToggle,
  type = 'dresscode',
}: HqCheckCellProps) {
  const [animating, setAnimating] = useState(false);

  const cfg = (CONFIG[type] as any)[value] ?? CONFIG.dresscode.na;
  const sizeClass = size === 'md' ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-[10px]';

  const handleClick = () => {
    if (readOnly || !onToggle) return;
    
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    let next: any;
    if (type === 'dresscode') {
      const idx = DRESSCODE_CYCLE.indexOf(value as CheckState);
      next = DRESSCODE_CYCLE[(idx + 1) % DRESSCODE_CYCLE.length];
    } else if (type === 'duty') {
      const idx = DUTY_CYCLE.indexOf(value as DutyState);
      next = DUTY_CYCLE[(idx + 1) % DUTY_CYCLE.length];
    } else {
      const idx = ATTENDANCE_CYCLE.indexOf(value as AttendanceState);
      next = ATTENDANCE_CYCLE[(idx + 1) % ATTENDANCE_CYCLE.length];
    }
    onToggle(next);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={readOnly}
      className={[
        sizeClass,
        'rounded-md border-2 flex items-center justify-center font-black transition-all duration-200 select-none',
        cfg.bg,
        cfg.border,
        cfg.textColor,
        animating ? 'scale-125' : 'scale-100',
        !readOnly ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default',
      ].join(' ')}
    >
      {cfg.icon}
    </button>
  );
}
