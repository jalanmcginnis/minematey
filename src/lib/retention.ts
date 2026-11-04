/**
 * Retention for workplace exams, equipment exams, and their photo/PDF attachments.
 * Required documents and training records are not covered.
 */
export const EXAM_RETENTION_MONTHS = 24;

export function retentionCutoff(months = EXAM_RETENTION_MONTHS): Date {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff;
}

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') {
      const date = maybe.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function examRecordDate(record: {
  examDate?: unknown;
  date?: unknown;
  createdAt?: unknown;
}): Date | null {
  return toDate(record.examDate) || toDate(record.date) || toDate(record.createdAt);
}

export function isPastRetention(
  value: unknown,
  months = EXAM_RETENTION_MONTHS,
): boolean {
  const date = toDate(value);
  if (!date) return false;
  return date.getTime() < retentionCutoff(months).getTime();
}

export function isExamPastRetention(
  record: { examDate?: unknown; date?: unknown; createdAt?: unknown },
  months = EXAM_RETENTION_MONTHS,
): boolean {
  const date = examRecordDate(record);
  if (!date) return false;
  return date.getTime() < retentionCutoff(months).getTime();
}
