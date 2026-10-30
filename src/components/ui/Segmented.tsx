import React from 'react';

/** The one toggle style in the app. An option may carry a count, shown faint after its label. */
export function Segmented<T extends string>({ value, onChange, options, disabled, size = 'md', fill = true, label }: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, React.ReactNode, number?])[];
  disabled?: boolean;
  size?: 'sm' | 'md';
  /** Stretch to the container width (forms) or size to the labels (toolbars). */
  fill?: boolean;
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} style={{
      display: fill ? 'flex' : 'inline-flex', gap: 4, padding: 4, background: 'var(--paper-sunk)',
      borderRadius: 'var(--radius)', opacity: disabled ? 0.6 : 1,
    }}>
      {options.map(([v, text, count]) => {
        const on = value === v;
        return (
          <button key={v} type="button" onClick={() => !disabled && onChange(v)} disabled={disabled} aria-pressed={on} style={{
            flex: fill ? 1 : undefined, padding: size === 'sm' ? '5px 12px' : '7px 14px', borderRadius: 'var(--radius-sm)', border: 'none',
            cursor: disabled ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', fontSize: size === 'sm' ? 12.5 : 13, fontWeight: 600,
            whiteSpace: 'nowrap',
            background: on ? 'var(--surface)' : 'transparent',
            color: on ? 'var(--ink)' : 'var(--ink-faint)',
            boxShadow: on ? 'var(--shadow-sm)' : 'none',
            transition: 'background var(--dur-fast), color var(--dur-fast)',
          }}>
            {text}
            {count !== undefined && <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--ink-faint)' }}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
