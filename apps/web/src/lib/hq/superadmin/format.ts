// apps/web/src/lib/hq/superadmin/format.ts

export function formatPKR(amount: number): string {
  return `PKR ${Number(amount || 0).toLocaleString('en-PK')}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

