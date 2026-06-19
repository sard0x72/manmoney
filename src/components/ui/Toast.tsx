import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';

export function Toast() {
  const { toast, clearToast } = useAppStore();
  if (!toast) return null;

  const icons = {
    success: <CheckCircle size={16} className="text-green-500" />,
    error: <XCircle size={16} className="text-red-500" />,
    info: <Info size={16} className="text-blue-500" />,
  };

  const colors = {
    success: 'border-green-200 dark:border-green-800',
    error: 'border-red-200 dark:border-red-800',
    info: 'border-blue-200 dark:border-blue-800',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] animate-slide-up">
      <div className={cn('card shadow-modal flex items-center gap-3 px-4 py-3 min-w-[260px] max-w-sm', colors[toast.type])}>
        {icons[toast.type]}
        <p className="flex-1 text-sm text-[hsl(var(--text))]">{toast.message}</p>
        <button onClick={clearToast} className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
