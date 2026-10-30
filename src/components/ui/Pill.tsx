import React from 'react';

const TONES = {
  positive: ['var(--positive-tint)', 'var(--positive)'],
  negative: ['var(--negative-tint)', 'var(--negative)'],
  clay: ['var(--clay-tint)', 'var(--clay-ink)'],
  neutral: ['var(--paper-sunk)', 'var(--ink-muted)'],
} as const;

/** A small status tag: "Paused", "Reached", "Settled". */
export function Pill({ tone = 'neutral', icon, children }: { tone?: keyof typeof TONES; icon?: React.ReactNode; children: React.ReactNode }) {
  const [bg, fg] = TONES[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, padding: '2px 8px',
      fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', background: bg, color: fg,
    }}>{icon}{children}</span>
  );
}
