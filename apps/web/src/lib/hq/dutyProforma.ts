// apps/web/src/lib/hq/dutyProforma.ts

import { resolveStaffDuties, isGenericPlaceholderDuty } from '@/data/hqConfig';

export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  SATISFACTORY: 60,
} as const;

export type ProformaCellValue = 'done' | 'notdone' | 'na' | '';

export interface ProformaDay {
  date: string; // YYYY-MM-DD
  dayNumber: number; // 1 to 31
  weekday: 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
  isSunday: boolean;
  isFuture: boolean;
}

export interface ProformaDutyRow {
  sNo: number;
  id: string;
  name: string;
  isPriority?: boolean;
  assignedAt?: string;
  cells: Record<string, ProformaCellValue>; // date -> status
}

export interface ProformaSummary {
  totalDuties: number;
  completedDuties: number;
  pendingDuties: number;
  completionPercentage: number;
  overallPerformance: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | null;
}

export interface ProformaModel {
  year: number;
  month: number;
  monthName: string;
  days: ProformaDay[];
  page1Days: ProformaDay[];
  page2Days: ProformaDay[];
  rows: ProformaDutyRow[];
  summary: ProformaSummary;
  staff: {
    id: string;
    employeeId?: string;
    name: string;
    designation: string;
    department: string;
    dutyTiming: string;
  };
}

export type StaffDutyItem = string | {
  [key: string]: any;
  id?: string;
  name?: string;
  dutyId?: string;
  dutyName?: string;
  key?: string;
  label?: string;
  description?: string;
  assignedAt?: string;
  assignedBy?: string;
  isActive?: boolean;
  isPriority?: boolean;
};

export interface DailyDutyRecord {
  date: string; // YYYY-MM-DD
  duties?: Array<{
    id?: string;
    dutyId?: string;
    key?: string;
    name?: string;
    dutyName?: string;
    label?: string;
    status?: 'done' | 'not_done' | 'na' | string;
    completed?: boolean;
    note?: string;
  }>;
  status?: string;
  isCompliant?: boolean;
}

export interface HolidayRecord {
  date: string; // YYYY-MM-DD
  label?: string;
  type?: 'holiday' | 'paid_leave' | string;
  scope?: 'all' | 'department' | 'staff' | string;
  departments?: string[];
  staffIds?: string[];
}

export interface LeaveRecord {
  date: string; // YYYY-MM-DD
  status?: 'leave' | 'paid_leave' | 'unpaid_leave' | string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES: Array<'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'> = [
  'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'
];

/**
 * Computes today's date in Asia/Karachi (YYYY-MM-DD)
 */
export function getKarachiTodayKey(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Pure function to build the Monthly Duty & Performance Proforma model.
 */
export function buildProformaModel({
  staff,
  logs = [],
  holidays = [],
  leaves = [],
  year,
  month,
  todayKey = getKarachiTodayKey(),
}: {
  staff: {
    id: string;
    employeeId?: string;
    name: string;
    designation?: string;
    department?: string;
    dutyStartTime?: string;
    dutyEndTime?: string;
    dutyStart?: string;
    dutyEnd?: string;
    duties?: StaffDutyItem[];
    dutyConfig?: StaffDutyItem[];
  };
  logs?: DailyDutyRecord[];
  holidays?: HolidayRecord[];
  leaves?: LeaveRecord[];
  year: number;
  month: number; // 1 to 12
  todayKey?: string;
}): ProformaModel {
  const monthIndex = month - 1;
  const monthName = MONTH_NAMES[monthIndex] || `Month ${month}`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // 1. Build days of the month without timezone shifts
  const days: ProformaDay[] = [];
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const utcDate = new Date(Date.UTC(year, monthIndex, dayNum));
    const weekday = WEEKDAY_NAMES[utcDate.getUTCDay()];
    const isSunday = weekday === 'SUN';
    const isFuture = dateStr > todayKey;

    days.push({
      date: dateStr,
      dayNumber: dayNum,
      weekday,
      isSunday,
      isFuture,
    });
  }

  const page1Days = days.filter((d) => d.dayNumber <= 15);
  const page2Days = days.filter((d) => d.dayNumber >= 16);

  // 2. Index logs by date
  const logMap = new Map<string, DailyDutyRecord>();
  logs.forEach((log) => {
    if (log && log.date) {
      logMap.set(log.date, log);
    }
  });

  // 3. Index holidays applicable to this staff
  const staffDept = String(staff.department || '').toLowerCase().trim();
  const staffSimpleId = staff.id.replace(/^[a-z0-9_-]+_/, '');
  const holidayDateSet = new Set<string>();

  holidays.forEach((h) => {
    if (!h || !h.date) return;
    const scope = h.scope || 'all';
    if (scope === 'all') {
      holidayDateSet.add(h.date);
    } else if (scope === 'department') {
      if (h.departments && h.departments.some((d) => d.toLowerCase() === staffDept)) {
        holidayDateSet.add(h.date);
      }
    } else if (scope === 'staff') {
      if (
        h.staffIds &&
        (h.staffIds.includes(staff.id) || h.staffIds.includes(staffSimpleId))
      ) {
        holidayDateSet.add(h.date);
      }
    }
  });

  // 4. Index leaves
  const leaveDateSet = new Set<string>();
  leaves.forEach((l) => {
    if (l && l.date) {
      const st = String(l.status || '').toLowerCase();
      if (st === 'leave' || st === 'paid_leave' || st === 'unpaid_leave') {
        leaveDateSet.add(l.date);
      }
    }
  });

  // 5. Gather duties: Resolve comprehensive profile duties
  const resolvedDuties = resolveStaffDuties(staff);
  const profileDuties: Array<{
    id: string;
    name: string;
    assignedAt?: string;
    isPriority?: boolean;
  }> = [];

  const seenDutyKeys = new Set<string>();

  resolvedDuties.forEach((d: any, idx: number) => {
    if (!d) return;
    const name = String(d.label || d.name || d.dutyName || '').trim();
    if (!name || isGenericPlaceholderDuty(name)) return;
    if (d && typeof d === 'object' && d.isActive === false) return;

    const id = String(d.key || d.id || `duty-${idx + 1}`);
    const key = name.toLowerCase();
    if (!seenDutyKeys.has(key)) {
      seenDutyKeys.add(key);
      profileDuties.push({
        id,
        name,
        assignedAt: typeof d === 'object' ? d.assignedAt : undefined,
        isPriority: typeof d === 'object' ? Boolean(d.isPriority) : false,
      });
    }
  });

  // Also check logs for historical custom duties not in current profile, excluding generic placeholders
  const historicalDuties: Array<{
    id: string;
    name: string;
    assignedAt?: string;
    isPriority?: boolean;
  }> = [];

  logs.forEach((log) => {
    if (!log || !log.duties) return;
    log.duties.forEach((item) => {
      const name = String(item.name || item.dutyName || item.label || '').trim();
      const rawKey = String(item.key || item.id || '').trim();
      if (!name || isGenericPlaceholderDuty(name) || isGenericPlaceholderDuty(rawKey)) return;
      const key = name.toLowerCase();
      if (!seenDutyKeys.has(key)) {
        seenDutyKeys.add(key);
        const id = String(item.id || item.dutyId || item.key || `hist-${historicalDuties.length + 1}`);
        historicalDuties.push({
          id,
          name,
          isPriority: false,
        });
      }
    });
  });

  const allDuties = [...profileDuties, ...historicalDuties];

  // 6. Build Row Cells & Summary
  let totalEvaluatedDuties = 0;
  let completedDuties = 0;
  let pendingDuties = 0;

  const rows: ProformaDutyRow[] = allDuties.map((duty, idx) => {
    const sNo = idx + 1;
    const cells: Record<string, ProformaCellValue> = {};

    days.forEach((day) => {
      const { date: dayDate, isSunday, isFuture } = day;

      // Rule: Day before assignedAt is "na"
      if (duty.assignedAt) {
        const assignedDate = duty.assignedAt.slice(0, 10);
        if (dayDate < assignedDate) {
          cells[dayDate] = 'na';
          return;
        }
      }

      // Rule: Holiday or approved leave is "na"
      if (holidayDateSet.has(dayDate) || leaveDateSet.has(dayDate)) {
        cells[dayDate] = 'na';
        return;
      }

      // Rule: Future day is blank
      if (isFuture) {
        cells[dayDate] = '';
        return;
      }

      // Check log
      const dayLog = logMap.get(dayDate);
      if (!dayLog) {
        // Rule: Past day with no log record at all is blank
        cells[dayDate] = '';
        return;
      }

      // Look up duty in dayLog.duties
      const items = dayLog.duties || [];
      const dutyKey = duty.name.toLowerCase();
      const matched = items.find((it) => {
        if (!it) return false;
        const itId = String(it.id || it.dutyId || it.key || '').trim().toLowerCase();
        if (itId && itId === duty.id.toLowerCase()) return true;
        const itName = String(it.name || it.dutyName || it.label || '').trim().toLowerCase();
        return itName === dutyKey;
      });

      if (!matched) {
        // If duty was not individually itemized in that day's log:
        // Check overall day duty status
        const dayStatus = String(dayLog.status || '').toLowerCase();
        if (dayStatus === 'yes' || dayStatus === 'done' || dayStatus === 'completed' || dayLog.isCompliant === true) {
          cells[dayDate] = 'done';
          totalEvaluatedDuties++;
          completedDuties++;
          return;
        }
        if (dayStatus === 'no' || dayStatus === 'failed') {
          cells[dayDate] = 'notdone';
          totalEvaluatedDuties++;
          pendingDuties++;
          return;
        }
        if (dayStatus === 'na') {
          cells[dayDate] = 'na';
          return;
        }
        cells[dayDate] = '';
        return;
      }

      const st = String(matched.status || '').toLowerCase();
      const isDone = st === 'done' || st === 'yes' || matched.completed === true;
      const isNa = st === 'na';
      const isNotDone = st === 'not_done' || st === 'no' || (matched.completed === false && !isNa);

      if (isDone) {
        cells[dayDate] = 'done';
        totalEvaluatedDuties++;
        completedDuties++;
      } else if (isNa) {
        cells[dayDate] = 'na';
      } else if (isNotDone) {
        cells[dayDate] = 'notdone';
        totalEvaluatedDuties++;
        pendingDuties++;
      } else {
        const dayStatus = String(dayLog.status || '').toLowerCase();
        if (dayStatus === 'yes' || dayStatus === 'done' || dayLog.isCompliant === true) {
          cells[dayDate] = 'done';
          totalEvaluatedDuties++;
          completedDuties++;
        } else {
          cells[dayDate] = '';
        }
      }
    });

    return {
      sNo,
      id: duty.id,
      name: duty.name,
      isPriority: duty.isPriority,
      assignedAt: duty.assignedAt,
      cells,
    };
  });

  // 7. Calculate Performance Summary
  const completionPercentage =
    totalEvaluatedDuties > 0
      ? Math.round((completedDuties / totalEvaluatedDuties) * 100)
      : 0;

  let overallPerformance: ProformaSummary['overallPerformance'] = null;
  if (totalEvaluatedDuties > 0) {
    if (completionPercentage >= PERFORMANCE_THRESHOLDS.EXCELLENT) {
      overallPerformance = 'excellent';
    } else if (completionPercentage >= PERFORMANCE_THRESHOLDS.GOOD) {
      overallPerformance = 'good';
    } else if (completionPercentage >= PERFORMANCE_THRESHOLDS.SATISFACTORY) {
      overallPerformance = 'satisfactory';
    } else {
      overallPerformance = 'needs_improvement';
    }
  }

  // 8. Timings display
  const start = staff.dutyStartTime || staff.dutyStart || '';
  const end = staff.dutyEndTime || staff.dutyEnd || '';
  const dutyTiming = start && end ? `${start} – ${end}` : 'As per roster';

  const deptLabel = formatDepartmentLabel(staff.department);

  return {
    year,
    month,
    monthName,
    days,
    page1Days,
    page2Days,
    rows,
    summary: {
      totalDuties: totalEvaluatedDuties,
      completedDuties,
      pendingDuties,
      completionPercentage,
      overallPerformance,
    },
    staff: {
      id: staff.id,
      employeeId: staff.employeeId,
      name: staff.name || 'Staff Member',
      designation: staff.designation || 'STAFF',
      department: deptLabel,
      dutyTiming,
    },
  };
}

export function formatDepartmentLabel(dept?: string): string {
  if (!dept) return 'Khan Hub';
  const d = dept.toLowerCase().replace(/[-_]/g, ' ');
  switch (d) {
    case 'hq':
      return 'Head Office';
    case 'hospital':
      return 'Khan Hub Hospital';
    case 'rehab':
      return 'Rehabilitation Center';
    case 'spims':
      return 'SPIMS College';
    case 'sukoon':
      return 'Sukoon Center';
    case 'welfare':
      return 'Khan Welfare Foundation';
    case 'job center':
    case 'jobcenter':
      return 'Khan Job Center';
    case 'social media':
    case 'media':
      return 'Marketing & Media Agency';
    case 'it':
      return 'Khan Hub IT Department';
    default:
      return dept.toUpperCase();
  }
}
