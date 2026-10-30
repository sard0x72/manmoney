import type { Loan } from '../types';
import { todayISO } from './utils';

type Direction = Loan['direction'];

export const left = (l: Loan) => l.amount - l.returned;
export const isSettled = (l: Loan) => left(l) <= 0.000001;
export const isZero = (n: number) => Math.abs(n) <= 0.000001;

// Loans are grouped per friend by name, ignoring case and stray spaces.
export const personKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

export interface Friend {
  key: string;
  name: string;
  loans: Loan[];
  /** Positive: they owe you. Negative: you owe them. */
  net: number;
  lentOpen: number;
  borrowedOpen: number;
  openCount: number;
  overdueCount: number;
  /** What settling both ways would close on each side; matches offset_loans, which skips overpaid loans. */
  cancellable: number;
}

export function groupByFriend(loans: Loan[]): Friend[] {
  const byKey = new Map<string, Loan[]>();
  for (const l of loans) {
    const k = personKey(l.person);
    byKey.set(k, [...(byKey.get(k) ?? []), l]);
  }
  const today = todayISO();
  return [...byKey.entries()].map(([key, ls]) => {
    const sorted = [...ls].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
    // Overpaid loans have a negative "left" and are kept on purpose: the extra is owed back the other way.
    const lentOpen = sorted.filter(l => l.direction === 'lent').reduce((s, l) => s + left(l), 0);
    const borrowedOpen = sorted.filter(l => l.direction === 'borrowed').reduce((s, l) => s + left(l), 0);
    const open = sorted.filter(l => !isSettled(l));
    const openOn = (d: Direction) => open.filter(l => l.direction === d).reduce((s, l) => s + left(l), 0);
    // Show the spelling used most often; ties go to the most recent loan.
    const spellings = new Map<string, number>();
    for (const l of sorted) {
      const s = l.person.trim().replace(/\s+/g, ' ');
      spellings.set(s, (spellings.get(s) ?? 0) + 1);
    }
    const name = [...spellings.entries()].reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0];
    return {
      key,
      name,
      loans: sorted,
      net: lentOpen - borrowedOpen,
      lentOpen,
      borrowedOpen,
      openCount: open.length,
      overdueCount: open.filter(l => !!l.due_date && l.due_date < today).length,
      cancellable: Math.min(openOn('lent'), openOn('borrowed')),
    };
  });
}

/** What friends owe you and what you owe them, each friend counted once by their net. */
export function friendTotals(loans: Loan[]): { owedToYou: number; youOwe: number } {
  const friends = groupByFriend(loans);
  return {
    owedToYou: friends.filter(f => f.net > 0.000001).reduce((s, f) => s + f.net, 0),
    youOwe: friends.filter(f => f.net < -0.000001).reduce((s, f) => s - f.net, 0),
  };
}
