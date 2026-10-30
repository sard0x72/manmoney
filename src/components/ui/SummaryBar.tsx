import { formatCurrency } from '../../lib/utils';

export interface SummaryItem {
  label: string;
  value: number;
  tone?: 'positive' | 'negative' | 'neutral';
  /** Show + or − in front of the amount. */
  sign?: boolean;
}

const TONES = { positive: 'var(--positive)', negative: 'var(--negative)', neutral: 'var(--ink-strong)' };

/** Two or three headline figures under a page header: a faint label over a mono amount. */
export function SummaryBar({ items }: { items: SummaryItem[] }) {
  return (
    <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 24 }}>
      {items.map(it => (
        <div key={it.label}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-faint)', marginBottom: 4 }}>{it.label}</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 500,
            color: TONES[it.tone ?? 'neutral'],
          }}>
            {it.sign ? (it.value < 0 ? '−' : '+') : ''}{formatCurrency(it.sign ? Math.abs(it.value) : it.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
