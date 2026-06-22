import React from 'react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function StatCard({ label, value, sub, icon, accent, trend, trendValue, className }: StatCardProps) {
  return (
    <div className={cn('card p-5 flex flex-col gap-3 hover:shadow-card-hover transition-shadow', className)}>
      <div className="flex items-start justify-between">
        <p className="label">{label}</p>
        {icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: accent ? `${accent}18` : undefined }}>
            <span style={{ color: accent }}>{icon}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
        {(sub || trendValue) && (
          <div className="flex items-center gap-2 mt-1">
            {trendValue && (
              <span
                className={cn('text-xs font-medium')}
                style={{ color: trend === 'up' ? 'var(--positive)' : trend === 'down' ? 'var(--negative)' : 'var(--text-secondary)' }}
              >
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} {trendValue}
              </span>
            )}
            {sub && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sub}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
