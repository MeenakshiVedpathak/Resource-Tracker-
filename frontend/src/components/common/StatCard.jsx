import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  description,
  gradient,
  isLoading,
  className,
}) => {
  if (isLoading) {
    return (
      <Card className={cn('p-5', className)}>
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </Card>
    );
  }

  const trendIsPositive = trend > 0;
  const trendIsNeutral = trend === 0 || trend == null;
  const TrendIcon = trendIsNeutral ? Minus : trendIsPositive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className={cn('relative overflow-hidden', className)}>
        {gradient && (
          <div className={cn('absolute inset-0 opacity-[0.06] pointer-events-none', `stat-gradient-${gradient}`)} />
        )}
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
              {description && (
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              )}
              {trend != null && (
                <div className={cn(
                  'mt-2 inline-flex items-center gap-1 text-xs font-medium',
                  trendIsNeutral ? 'text-muted-foreground' : trendIsPositive ? 'text-success' : 'text-destructive'
                )}>
                  <TrendIcon className="h-3.5 w-3.5" />
                  <span>{trendIsPositive ? '+' : ''}{trend}%</span>
                  {trendLabel && <span className="text-muted-foreground font-normal">{trendLabel}</span>}
                </div>
              )}
            </div>
            {Icon && (
              <div className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                gradient ? `stat-gradient-${gradient} text-white` : 'bg-primary/10 text-primary'
              )}>
                <Icon className="h-5 w-5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StatCard;
