import { cn } from '@/lib/utils';
import { toneClasses, type BadgeTone } from '@/lib/live-sessions/ui';

interface StatusBadgeProps {
  label: string;
  tone: BadgeTone;
  className?: string;
}

export const StatusBadge = ({ label, tone, className }: StatusBadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      toneClasses[tone],
      className
    )}
  >
    {label}
  </span>
);
