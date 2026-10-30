import React from 'react';
import { Ellipsis } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export interface RowMenuItem {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Shown under a disabled item to say why, e.g. "Used by 12 transactions". */
  hint?: string;
}

/**
 * Row actions behind a "⋯" button. The button is always visible but faint; a row
 * with the `group` class brings it to full contrast on hover or keyboard focus.
 * Destructive items go last, after a divider.
 */
export function RowMenu({ items }: { items: RowMenuItem[] }) {
  const firstDanger = items.findIndex(it => it.danger);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label="More actions" onClick={e => e.stopPropagation()}
          className="text-[var(--ink-faint)] group-hover:text-[var(--ink)] group-focus-within:text-[var(--ink)] hover:bg-[var(--paper-sunk)] data-[state=open]:bg-[var(--paper-sunk)] data-[state=open]:text-[var(--ink)]"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, display: 'flex', flexShrink: 0, transition: 'color var(--dur-fast)' }}>
          <Ellipsis size={15} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        {/* Items usually open a dialog; returning focus to the trigger would steal it from the dialog's first field. */}
        <DropdownMenu.Content align="end" sideOffset={4} onClick={e => e.stopPropagation()}
          onCloseAutoFocus={e => { if (document.querySelector('[role=dialog]')) e.preventDefault(); }} style={{
          zIndex: 60, minWidth: 180, maxWidth: 260, padding: 4, background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
        }}>
          {items.map((it, i) => (
            <React.Fragment key={it.label}>
              {i === firstDanger && i > 0 && (
                <DropdownMenu.Separator style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
              )}
              <DropdownMenu.Item onSelect={it.onSelect} disabled={it.disabled}
                className="outline-none cursor-pointer data-[highlighted]:bg-[var(--paper-sunk)] data-[disabled]:cursor-default"
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-sans)', fontSize: 13,
                  color: it.disabled ? 'var(--ink-faint)' : it.danger ? 'var(--negative)' : 'var(--ink)',
                }}>
                <span style={{ display: 'flex', marginTop: 2, flexShrink: 0 }}>{it.icon}</span>
                <span>
                  {it.label}
                  {it.disabled && it.hint && (
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 1, lineHeight: 1.35 }}>{it.hint}</span>
                  )}
                </span>
              </DropdownMenu.Item>
            </React.Fragment>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
