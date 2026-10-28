export interface QuarterlyDeadlineInfo {
  quarterLabel: string; // e.g., "Q3 2026" or "Q4 2026"
  quarterNumber: 1 | 2 | 3 | 4;
  quarterYear: number;
  periodDescription: string; // e.g., "Jul 1 – Sep 30, 2026"
  deadlineDate: Date;
  deadlineFormatted: string; // e.g., "October 15, 2026"
  daysRemaining: number;
  isFiled: boolean;
  filedDocument?: any;
}

interface StatutoryQuarterWindow {
  quarterNumber: 1 | 2 | 3 | 4;
  quarterYear: number;
  quarterLabel: string;
  periodDescription: string;
  quarterStart: Date;
  quarterEnd: Date;
  deadlineDate: Date;
}

function buildStatutoryQuarters(year: number): StatutoryQuarterWindow[] {
  return [
    {
      quarterNumber: 4,
      quarterYear: year - 1,
      quarterLabel: `Q4 ${year - 1}`,
      periodDescription: `Oct 1 – Dec 31, ${year - 1}`,
      quarterStart: new Date(year - 1, 9, 1),
      quarterEnd: new Date(year - 1, 11, 31, 23, 59, 59),
      deadlineDate: new Date(year, 0, 15, 23, 59, 59), // Jan 15
    },
    {
      quarterNumber: 1,
      quarterYear: year,
      quarterLabel: `Q1 ${year}`,
      periodDescription: `Jan 1 – Mar 31, ${year}`,
      quarterStart: new Date(year, 0, 1),
      quarterEnd: new Date(year, 2, 31, 23, 59, 59),
      deadlineDate: new Date(year, 3, 15, 23, 59, 59), // Apr 15
    },
    {
      quarterNumber: 2,
      quarterYear: year,
      quarterLabel: `Q2 ${year}`,
      periodDescription: `Apr 1 – Jun 30, ${year}`,
      quarterStart: new Date(year, 3, 1),
      quarterEnd: new Date(year, 5, 30, 23, 59, 59),
      deadlineDate: new Date(year, 6, 15, 23, 59, 59), // Jul 15
    },
    {
      quarterNumber: 3,
      quarterYear: year,
      quarterLabel: `Q3 ${year}`,
      periodDescription: `Jul 1 – Sep 30, ${year}`,
      quarterStart: new Date(year, 6, 1),
      quarterEnd: new Date(year, 8, 30, 23, 59, 59),
      deadlineDate: new Date(year, 9, 15, 23, 59, 59), // Oct 15
    },
    {
      quarterNumber: 4,
      quarterYear: year,
      quarterLabel: `Q4 ${year}`,
      periodDescription: `Oct 1 – Dec 31, ${year}`,
      quarterStart: new Date(year, 9, 1),
      quarterEnd: new Date(year, 11, 31, 23, 59, 59),
      deadlineDate: new Date(year + 1, 0, 15, 23, 59, 59), // Jan 15 of next year
    },
  ];
}

/**
 * Checks whether any uploaded document in the "Quarterly Reports" category
 * satisfies the given statutory quarter window.
 */
export function findMatchingQuarterlyFiling(
  quarterWindow: StatutoryQuarterWindow,
  quarterlyDocs: any[]
): any | undefined {
  if (!quarterlyDocs || quarterlyDocs.length === 0) return undefined;

  const qNum = quarterWindow.quarterNumber;
  const qYear = String(quarterWindow.quarterYear);
  const titleRegex = new RegExp(`(q${qNum}|quarter\\s*${qNum}|${qNum}(st|nd|rd|th)\\s*quarter)`, 'i');

  return quarterlyDocs.find((docItem) => {
    const title = String(docItem.documentTitle || '');
    // Match by explicit quarter & year in the title
    if (titleRegex.test(title) && title.includes(qYear)) {
      return true;
    }

    // Or match if the document's effective/upload date is within the active filing window
    // (from the last month of the quarter through 60 days after the statutory deadline)
    const rawDate = docItem.date || docItem.createdAt;
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        const windowOpen = new Date(quarterWindow.quarterEnd);
        windowOpen.setDate(windowOpen.getDate() - 15);
        const windowClose = new Date(quarterWindow.deadlineDate);
        windowClose.setDate(windowClose.getDate() + 60);
        if (parsed >= windowOpen && parsed <= windowClose) {
          return true;
        }
      }
    }

    return false;
  });
}

/**
 * Statutory Deadline Calculation Logic for MSHA Form 7000-2:
 * - Q1 (ends Mar 31) -> Due April 15
 * - Q2 (ends Jun 30) -> Due July 15
 * - Q3 (ends Sep 30) -> Due October 15
 * - Q4 (ends Dec 31) -> Due January 15 of next year
 */
export function getNextQuarterlyReportDeadline(
  quarterlyDocs: any[] = [],
  today: Date = new Date()
): QuarterlyDeadlineInfo {
  const year = today.getFullYear();
  const candidates = buildStatutoryQuarters(year);

  // Determine the next upcoming deadline (>= today)
  let targetWindow =
    candidates.find((c) => c.deadlineDate.getTime() >= today.getTime()) ||
    candidates[candidates.length - 1];

  // Also check if the immediately preceding deadline passed within the last 30 days
  // and has NOT been filed yet (so overdue filings are surfaced urgently)
  const targetIndex = candidates.indexOf(targetWindow);
  if (targetIndex > 0) {
    const previousWindow = candidates[targetIndex - 1];
    const daysSincePrevDeadline = Math.ceil(
      (today.getTime() - previousWindow.deadlineDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const prevFiled = findMatchingQuarterlyFiling(previousWindow, quarterlyDocs);
    if (daysSincePrevDeadline <= 30 && !prevFiled) {
      targetWindow = previousWindow;
    }
  }

  const daysRemaining = Math.ceil(
    (targetWindow.deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const matchedFiling = findMatchingQuarterlyFiling(targetWindow, quarterlyDocs);

  return {
    quarterLabel: targetWindow.quarterLabel,
    quarterNumber: targetWindow.quarterNumber,
    quarterYear: targetWindow.quarterYear,
    periodDescription: targetWindow.periodDescription,
    deadlineDate: targetWindow.deadlineDate,
    deadlineFormatted: targetWindow.deadlineDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    daysRemaining,
    isFiled: Boolean(matchedFiling),
    filedDocument: matchedFiling,
  };
}
