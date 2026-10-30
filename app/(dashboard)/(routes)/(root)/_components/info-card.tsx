import { LucideIcon } from 'lucide-react';

import { IconBadge } from '@/components/icon-badge';

interface InfoCardProps {
  numberOfItems: number;
  variant?: 'default' | 'success';
  label: string;
  icon: LucideIcon;
}

export const InfoCard = ({ variant, icon: Icon, numberOfItems, label }: InfoCardProps) => {
  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-sm flex items-center gap-x-3 p-4">
      <IconBadge variant={variant} icon={Icon} />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground text-sm">
          {numberOfItems} {numberOfItems === 1 ? 'Course' : 'Courses'}
        </p>
      </div>
    </div>
  );
};
