/**
 * `YYYY-MM-DD` is a calendar day. `new Date('YYYY-MM-DD')` is UTC midnight,
 * so local formatting shows the previous day in timezones behind UTC.
 * Full timestamps still use the local timezone.
 */
export function formatCalendarDate(rawDate: string | null | undefined): string {
  if (!rawDate) return '—';
  const trimmed = rawDate.trim();
  if (!trimmed) return '—';

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const local = new Date(year, month - 1, day);
    if (local.getFullYear() === year && local.getMonth() === month - 1 && local.getDate() === day) {
      return local.toLocaleDateString();
    }
    return trimmed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toLocaleDateString();
}
