import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  badge?: string
  isApplicable?: boolean
  isHighlight?: boolean
  trend?: { value: number; label: string }
  className?: string
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  isApplicable = true,
  isHighlight = false,
  trend,
  className,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-200',
        !isApplicable && 'opacity-40 bg-muted/30 border-dashed',
        isHighlight && 'border-primary ring-1 ring-primary bg-primary/5',
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
              {badge && (
                <Badge
                  variant={isHighlight ? 'default' : 'outline'}
                  className="text-[10px] px-1.5 py-0 h-4 font-normal"
                >
                  {badge}
                </Badge>
              )}
            </div>

            <p className={cn('text-2xl font-bold tracking-tight', !isApplicable && 'text-muted-foreground')}>
              {isApplicable ? value : 'N/A'}
            </p>

            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}

            {trend && isApplicable && (
              <p className={cn('text-xs font-medium', trend.value >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
              </p>
            )}
          </div>

          <div
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ml-2',
              isHighlight ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
              !isApplicable && 'bg-muted text-muted-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
