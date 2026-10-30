import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';

export function Toast() {
  const { toast, clearToast } = useAppStore();
  if (!toast) return null;

  const icons = {
    success: <CheckCircle size={16} style={{ color: 'var(--positive)' }} />,
    error:   <XCircle size={16} style={{ color: 'var(--negative)' }} />,
    info:    <Info size={16} style={{ color: 'var(--clay)' }} />,
  };

  const borderColors: Record<string, string> = {
    success: 'var(--positive)',
    error:   'var(--negative)',
    info:    'var(--clay)',
  };

  // Keyed by id so a new toast replays the slide-in instead of swapping text in place.
  return (
    <div key={toast.id} className="fixed bottom-4 right-4 z-[100] animate-slide-up" role="status" aria-live="polite">
      <div
        className={cn('card shadow-modal flex items-center gap-3 px-4 py-3 min-w-[260px] max-w-sm')}
        style={{ borderColor: borderColors[toast.type] }}
      >
        {icons[toast.type]}
        <p className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{toast.message}</p>
        {toast.action && (
          <button onClick={toast.action.run} className="btn-ghost"
            style={{ padding: '3px 8px', fontSize: 13, fontWeight: 600, color: 'var(--clay-ink)' }}>
            {toast.action.label}
          </button>
        )}
        <button
          onClick={clearToast}
          aria-label="Dismiss"
          className="transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
