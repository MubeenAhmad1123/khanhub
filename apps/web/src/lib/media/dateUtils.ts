// apps/web/src/lib/media/dateUtils.ts

/**
 * Returns current date in Asia/Karachi (YYYY-MM-DD)
 */
export function getTodayInKarachi(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}
