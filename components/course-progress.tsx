import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CourseProgressProps {
  value: number;
  variant?: 'default' | 'success';
  size?: 'default' | 'sm';
}

const colorByVariant = {
  default: 'text-[#F80602]',
  success: 'text-[#171717]'
};

const sizeByVariant = {
  default: 'text-sm',
  sm: 'text-xs'
};

export const CourseProgress = ({ value, variant, size }: CourseProgressProps) => {
  return (
    <div>
      <Progress
        className={cn(
          'h-2',
          variant === 'success' && '[&>div]:bg-emerald-600 dark:[&>div]:bg-emerald-500'
        )}
        value={value}
        variant={variant}
      />
      <p
        className={cn(
          'font-semibold mt-2',
          colorByVariant[variant || 'default'],
          sizeByVariant[size || 'default']
        )}
      >
        {Math.round(value)}% Complete
      </p>
    </div>
  );
};
