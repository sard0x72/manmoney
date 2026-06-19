import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--text-muted))] mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[hsl(var(--text))] mb-1">{title}</h3>
      {description && <p className="text-sm text-[hsl(var(--text-muted))] max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  );
}
