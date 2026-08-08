/**
 * Date filtering and range resolution utilities.
 *
 * Centralizes date range calculation logic across the application (Admin Dashboard,
 * Stylist Dashboard, and Director Department Dashboard) ensuring uniform handling of:
 * - 'this-month' (Calendar month from 1st to end of current month)
 * - 'last-month' (Calendar month from 1st to end of previous month)
 * - 'cutoff' (Salon payroll cut-off period: 25th to 24th)
 * - 'range' (Arbitrary multi-month selection)
 */

export interface MonthOption {
  value: string;
  label: string;
}

export type MonthFilterType = 'this-month' | 'last-month' | 'cutoff' | 'range';

export interface DateFilterConfig {
  resolvedMonthType: MonthFilterType;
  startDate: string; // ISO timestamptz string e.g. "2026-07-25T00:00:00+08:00"
  endDate: string;   // ISO timestamptz string e.g. "2026-08-25T00:00:00+08:00" (exclusive)
  selStartMonthStr: string; // e.g. "2026-08"
  selEndMonthStr: string;   // e.g. "2026-08"
  dateRangeLabel: string;   // e.g. "August 2026", "Cut off (25 Jul - 24 Aug)", or "July 2026 - August 2026"
  cutoffLabel: string;      // e.g. "25 Jul - 24 Aug"
  selYear: number;
  availableMonths: MonthOption[];
  currentMonthStr: string;
  lastMonthStr: string;
  currentYear: number;
  currentMonth: number;
  currentDay: number;
}

/**
 * Resolves search parameters into concrete database start/end date filters,
 * human-readable labels, and picker options.
 */
export function resolveDateFilterParams(resolvedParams?: {
  [key: string]: string | string[] | undefined;
}): DateFilterConfig {
  const now = new Date();

  // Get date components in Asia/Kuala_Lumpur timezone to handle UTC / server-local mismatch
  const klParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);

  const currentYear = Number(klParts.find((p) => p.type === 'year')?.value);
  const currentMonth = Number(klParts.find((p) => p.type === 'month')?.value) - 1; // 0-indexed
  const currentDay = Number(klParts.find((p) => p.type === 'day')?.value);

  // Generate list of available months (from Jan 2026 to current calendar month)
  const availableMonths: MonthOption[] = [];
  const startYear = 2026;
  const startMonth = 0; // January

  let y = startYear;
  let m = startMonth;

  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    const dateObj = new Date(y, m, 1);
    const value = `${y}-${(m + 1).toString().padStart(2, '0')}`;
    const label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    availableMonths.push({ value, label });

    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  availableMonths.reverse();

  const currentMonthStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;

  // Calculate Last Month
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const lastMonthVal = currentMonth === 0 ? 12 : currentMonth;
  const lastMonthStr = `${lastMonthYear}-${lastMonthVal.toString().padStart(2, '0')}`;

  // Calculate Cutoff (25th to 24th range)
  // If currentDay >= 25: 25th of current month to 24th of next month (< 25th of next month)
  // If currentDay < 25: 25th of previous month to 24th of current month (< 25th of current month)
  let cutoffStartYear = currentYear;
  let cutoffStartMonth = currentMonth + 1; // 1-indexed
  let cutoffEndYear = currentYear;
  let cutoffEndMonth = currentMonth + 1; // 1-indexed

  if (currentDay >= 25) {
    cutoffStartYear = currentYear;
    cutoffStartMonth = currentMonth + 1;
    if (cutoffStartMonth === 12) {
      cutoffEndYear = currentYear + 1;
      cutoffEndMonth = 1;
    } else {
      cutoffEndYear = currentYear;
      cutoffEndMonth = cutoffStartMonth + 1;
    }
  } else {
    if (currentMonth === 0) {
      cutoffStartYear = currentYear - 1;
      cutoffStartMonth = 12;
    } else {
      cutoffStartYear = currentYear;
      cutoffStartMonth = currentMonth;
    }
    cutoffEndYear = currentYear;
    cutoffEndMonth = currentMonth + 1;
  }

  const cutoffStartDateStr = `${cutoffStartYear}-${cutoffStartMonth.toString().padStart(2, '0')}-25T00:00:00+08:00`;
  const cutoffEndDateStr = `${cutoffEndYear}-${cutoffEndMonth.toString().padStart(2, '0')}-25T00:00:00+08:00`;

  const startMonthNameShort = new Date(cutoffStartYear, cutoffStartMonth - 1, 1).toLocaleString('en-US', { month: 'short' });
  const endMonthNameShort = new Date(cutoffEndYear, cutoffEndMonth - 1, 1).toLocaleString('en-US', { month: 'short' });

  let cutoffLabel = '';
  if (cutoffStartYear === cutoffEndYear) {
    cutoffLabel = `25 ${startMonthNameShort} - 24 ${endMonthNameShort}`;
  } else {
    cutoffLabel = `25 ${startMonthNameShort} ${cutoffStartYear} - 24 ${endMonthNameShort} ${cutoffEndYear}`;
  }

  let resolvedMonthType: MonthFilterType = 'this-month';
  let selStartMonthStr = currentMonthStr;
  let selEndMonthStr = currentMonthStr;

  const paramMonthType = resolvedParams?.monthType;
  const paramStartMonth = resolvedParams?.startMonth;
  const paramEndMonth = resolvedParams?.endMonth;
  const paramLegacyMonth = resolvedParams?.month;

  if (paramMonthType === 'last-month') {
    resolvedMonthType = 'last-month';
    selStartMonthStr = lastMonthStr;
    selEndMonthStr = lastMonthStr;
  } else if (paramMonthType === 'cutoff') {
    resolvedMonthType = 'cutoff';
    selStartMonthStr = currentMonthStr;
    selEndMonthStr = currentMonthStr;
  } else if (paramMonthType === 'range') {
    resolvedMonthType = 'range';
    const isValidStart = typeof paramStartMonth === 'string' && /^\d{4}-\d{2}$/.test(paramStartMonth);
    const isValidEnd = typeof paramEndMonth === 'string' && /^\d{4}-\d{2}$/.test(paramEndMonth);
    selStartMonthStr = isValidStart ? paramStartMonth : currentMonthStr;
    selEndMonthStr = isValidEnd ? paramEndMonth : currentMonthStr;
  } else if (typeof paramLegacyMonth === 'string' && /^\d{4}-\d{2}$/.test(paramLegacyMonth)) {
    resolvedMonthType = 'range';
    selStartMonthStr = paramLegacyMonth;
    selEndMonthStr = paramLegacyMonth;
  }

  let startDate = '';
  let endDate = '';
  let selYear = currentYear;
  let dateRangeLabel = '';

  const getMonthLabel = (monthStr: string) => {
    const [yearNum, monthNum] = monthStr.split('-').map(Number);
    return new Date(yearNum, monthNum - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  if (resolvedMonthType === 'cutoff') {
    startDate = cutoffStartDateStr;
    endDate = cutoffEndDateStr;
    selYear = cutoffEndYear;
    dateRangeLabel = `Cut off (${cutoffLabel})`;
  } else {
    const [startYearVal, startMonthVal] = selStartMonthStr.split('-').map(Number);
    const [endYearVal, endMonthVal] = selEndMonthStr.split('-').map(Number);
    selYear = endYearVal;

    startDate = `${startYearVal}-${startMonthVal.toString().padStart(2, '0')}-01T00:00:00+08:00`;
    const nextMonthYear = endMonthVal === 12 ? endYearVal + 1 : endYearVal;
    const nextMonthVal = endMonthVal === 12 ? 1 : endMonthVal + 1;
    endDate = `${nextMonthYear}-${nextMonthVal.toString().padStart(2, '0')}-01T00:00:00+08:00`;

    if (resolvedMonthType === 'this-month') {
      dateRangeLabel = getMonthLabel(currentMonthStr);
    } else if (resolvedMonthType === 'last-month') {
      dateRangeLabel = getMonthLabel(lastMonthStr);
    } else {
      if (selStartMonthStr === selEndMonthStr) {
        dateRangeLabel = getMonthLabel(selStartMonthStr);
      } else {
        dateRangeLabel = `${getMonthLabel(selStartMonthStr)} - ${getMonthLabel(selEndMonthStr)}`;
      }
    }
  }

  return {
    resolvedMonthType,
    startDate,
    endDate,
    selStartMonthStr,
    selEndMonthStr,
    dateRangeLabel,
    cutoffLabel,
    selYear,
    availableMonths,
    currentMonthStr,
    lastMonthStr,
    currentYear,
    currentMonth,
    currentDay,
  };
}
