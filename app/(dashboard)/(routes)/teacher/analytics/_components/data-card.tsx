import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/format';
import { type LucideIcon } from 'lucide-react';

interface DataCardProps {
  value: number | string;
  label: string;
  shouldFormat?: boolean;
  icon?: LucideIcon;
  description?: string;
}

export const DataCard = ({
  value,
  label,
  shouldFormat = true,
  icon: Icon,
  description
}: DataCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {shouldFormat && typeof value === 'number' ? formatPrice(value) : value}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};
