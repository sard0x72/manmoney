import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
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

export function healthScore(income: number, expenses: number, budgetTotal: number, budgetSpent: number): number {
  if (income === 0) return 50;
  const savingsRate = Math.max(0, (income - expenses) / income);
  const budgetAdherence = budgetTotal > 0 ? Math.max(0, 1 - budgetSpent / budgetTotal) : 1;
  const score = Math.round((savingsRate * 60 + budgetAdherence * 40) * 100);
  return Math.min(100, Math.max(0, score));
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#4E7A52';
  if (score >= 60) return '#A87E2E';
  if (score >= 40) return '#B5852A';
  return '#B23E2E';
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Work';
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
