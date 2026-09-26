import * as React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Trend = 'up' | 'down' | 'neutral';

interface StatCardProps {
  label: string;
  value: string | number;
  /** Optional subtitle / context below the value */
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Tailwind classes for the icon wrapper background + text colour */
  iconColor?: string;
  trend?: Trend;
  trendLabel?: string;
  isLoading?: boolean;
  className?: string;
}

const trendConfig: Record<Trend, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  up:      { icon: TrendingUp,   color: 'text-emerald-600' },
  down:    { icon: TrendingDown, color: 'text-red-500'     },
  neutral: { icon: Minus,        color: 'text-gray-400'    },
};

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  iconColor = 'bg-indigo-50 text-indigo-600',
  trend,
  trendLabel,
  isLoading = false,
  className,
}: StatCardProps) {
  const TrendIcon = trend ? trendConfig[trend].icon : null;
  const trendColor = trend ? trendConfig[trend].color : '';

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('rounded-lg p-2', iconColor)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        {trend && TrendIcon && trendLabel && (
          <span className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            {trendLabel}
          </span>
        )}
      </div>

      <div className="mt-3">
        {isLoading ? (
          <>
            <div className="h-8 w-20 animate-pulse rounded-md bg-gray-100" />
            <div className="mt-1 h-4 w-28 animate-pulse rounded-md bg-gray-100" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
            <p className="mt-0.5 text-sm text-gray-500">{label}</p>
            {description && (
              <p className="mt-1 text-xs text-gray-400">{description}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
