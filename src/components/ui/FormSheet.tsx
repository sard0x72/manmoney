import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ModalFrame } from './Modal';

/**
 * True once any of `values` differs from what it was on the first render.
 * Forms pass their fields here and hand the result to FormSheet as `dirty`.
 */
export function useDirty(values: unknown): boolean {
  const [initial] = useState(() => JSON.stringify(values));
  return JSON.stringify(values) !== initial;
}

interface FormSheetProps {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  /** With unsaved changes, closing asks first instead of dropping them. */
  dirty?: boolean;
  saving?: boolean;
  submitLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * The shell every form opens in. Enter saves (the submit button is a real
 * submit), and Esc, the backdrop and ✕ never silently drop typed data: with
 * unsaved changes they show a "Discard changes?" bar in place of the footer.
 *
 * Every other button inside must be `type="button"`, or clicking it submits.
 */
export function FormSheet({ title, onClose, onSubmit, dirty = false, saving = false, submitLabel = 'Save', size = 'sm', children }: FormSheetProps) {
  const [confirming, setConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);

  const requestClose = useCallback(() => {
    if (dirty) setConfirming(true);
    else onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (confirming) setConfirming(false);
      else requestClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [confirming, requestClose]);

  useEffect(() => { if (confirming) keepRef.current?.focus(); }, [confirming]);

  return (
    <ModalFrame title={title} onDismiss={requestClose} size={size}>
      <form noValidate onSubmit={e => { e.preventDefault(); if (!saving && !confirming) onSubmit(); }}>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto space-y-4">{children}</div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]"
          style={confirming ? { background: 'var(--paper-sunk)' } : undefined}>
          {confirming ? (
            <>
              <span role="alert" style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>
                Discard changes?
              </span>
              <button ref={keepRef} type="button" onClick={() => setConfirming(false)} className="btn-secondary">Keep editing</button>
              <button type="button" onClick={onClose} className="btn-danger">Discard</button>
            </>
          ) : (
            <>
              <button type="button" onClick={requestClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : submitLabel}</button>
            </>
          )}
        </div>
      </form>
    </ModalFrame>
  );
}
