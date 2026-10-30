import React, { useEffect, useState } from 'react';
import { ModalFrame } from './Modal';

/**
 * Only for deletes that cascade or can't be undone; everything else uses an
 * Undo toast. The body says exactly what goes. Cancel has focus, so Enter
 * never confirms by accident.
 */
export function ConfirmDialog({ title, body, confirmLabel = 'Delete', danger = true, onConfirm, onClose }: {
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  /** Red confirm button. Off for actions that undo something, like restoring a settle. */
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [busy, onClose]);

  const confirm = async () => {
    setBusy(true);
    try { await onConfirm(); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <ModalFrame title={title} onDismiss={() => !busy && onClose()} size="sm">
      <div className="px-5 py-4 text-sm" style={{ color: 'var(--ink-muted)', lineHeight: 1.5 }}>{body}</div>
      <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
        <button type="button" onClick={onClose} disabled={busy} className="btn-secondary" autoFocus>Cancel</button>
        <button type="button" onClick={confirm} disabled={busy} className={danger ? 'btn-danger' : 'btn-primary'}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </ModalFrame>
  );
}
