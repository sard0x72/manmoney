import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CURRENCIES = ['USD','EUR','GBP','JPY','CNY','KRW','CAD','AUD','CHF','INR','BRL','MXN','RUB','TRY','KZT','UZS'];

// The app-wide display currency, chosen in Settings. Kept here rather than read
// from the store so formatCurrency stays a plain function (the store imports utils).
let appCurrency = 'USD';
export function setAppCurrency(currency: string) { appCurrency = currency; }
export function getAppCurrency(): string { return appCurrency; }

// Whole amounts drop the ".00" (UZS 1,125,000); amounts with real cents keep
// them (USD 12.50). The tolerance absorbs float noise from summing many values.
export function formatCurrency(amount: number, currency = appCurrency): string {
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
  }).format(whole ? Math.round(amount) : amount);
}

export function currencySymbol(currency = appCurrency): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
    .formatToParts(0).find(p => p.type === 'currency')?.value ?? currency;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

// Local calendar date as YYYY-MM-DD. toISOString() would give the UTC date,
// which is a day behind for the first hours of the day east of UTC (e.g. UZT+5).
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export function currentMonth(): number {
  return new Date().getMonth() + 1;
}

export function monthName(month: number): string {
  return new Date(2024, month - 1, 1).toLocaleString('en-US', { month: 'long' });
}

export function getMonthDateRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export function getLast12Months(): { year: number; month: number; label: string }[] {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
    });
  }
  return months;
}

export function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
