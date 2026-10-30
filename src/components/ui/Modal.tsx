import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

/** Backdrop, card and title bar shared by every dialog, so they all look the same. */
export function ModalFrame({ title, onDismiss, size = 'md', children }: {
  title: string;
  /** Backdrop click and the ✕ button. */
  onDismiss: () => void;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onDismiss} />
      <div role="dialog" aria-modal="true" aria-label={title} className={cn('relative w-full mx-4 card shadow-modal animate-slide-up', SIZES[size])}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-base font-semibold text-[hsl(var(--text))]">{title}</h2>
          <button type="button" onClick={onDismiss} className="btn-ghost rounded-lg p-1.5" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ModalFrame title={title} onDismiss={onClose} size={size}>
      <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
      {footer && (
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
          {footer}
        </div>
      )}
    </ModalFrame>
  );
}
