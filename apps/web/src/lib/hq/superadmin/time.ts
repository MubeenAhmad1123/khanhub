// apps/web/src/lib/hq/superadmin/time.ts

export type DateRangePreset = 'today' | 'yesterday' | 'this_week' | 'custom';

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function getPresetRange(preset: DateRangePreset): { from: Date; to: Date } {
  const now = new Date();
  if (preset === 'today') return { from: startOfDay(now), to: endOfDay(now) };
  if (preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }
  // this_week (Mon..Sun)
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - day);
  const from = startOfDay(d);
  const to = endOfDay(now);
  return { from, to };
}

