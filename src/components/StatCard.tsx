import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'gold' | 'primary';
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  variant = 'default',
  className,
}: StatCardProps) {
  const variantStyles = {
    default: '',
    success: 'success-glow',
    gold: '',
    primary: 'glow-effect',
  };

  const valueStyles = {
    default: 'text-foreground',
    success: 'text-success',
    gold: 'gradient-gold-text',
    primary: 'gradient-text',
  };

  return (
    <div className={cn('stat-card animate-fade-in', variantStyles[variant], className)}>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {icon && (
            <div className="p-2 rounded-lg bg-secondary/50">
              {icon}
            </div>
          )}
        </div>
        
        <div className={cn('font-display text-3xl font-bold mb-1', valueStyles[variant])}>
          {value}
        </div>
        
        {(subtitle || trendValue) && (
          <div className="flex items-center gap-2 text-sm">
            {trendValue && (
              <span className={cn(
                'font-medium',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}>
                {trend === 'up' && '↑'}
                {trend === 'down' && '↓'}
                {trendValue}
              </span>
            )}
            {subtitle && (
              <span className="text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
