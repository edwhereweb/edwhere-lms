'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCouponStatus, type CouponStatus } from '@/lib/coupon-utils';
import { type CouponListItem } from './types';

const statusBadgeVariant: Record<
  CouponStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  active: 'default',
  scheduled: 'secondary',
  inactive: 'outline',
  expired: 'destructive'
};

const statusLabel: Record<CouponStatus, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  inactive: 'Inactive',
  expired: 'Expired'
};

function toDate(value: string | null) {
  return value ? new Date(value) : null;
}

export function buildColumns({
  onEdit,
  onToggleActive
}: {
  onEdit: (coupon: CouponListItem) => void;
  onToggleActive: (coupon: CouponListItem) => void;
}): ColumnDef<CouponListItem>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => <span className="font-mono font-medium">{row.original.code}</span>
    },
    {
      id: 'typeValue',
      header: 'Type / Value',
      cell: ({ row }) => {
        const { type, value } = row.original;
        return type === 'PERCENT' ? `${value}%` : `₹${value}`;
      }
    },
    {
      id: 'validity',
      header: 'Validity',
      cell: ({ row }) => {
        const startsAt = toDate(row.original.startsAt);
        const expiresAt = toDate(row.original.expiresAt);
        if (!startsAt && !expiresAt) return <span className="text-muted-foreground">Always</span>;
        return (
          <span className="text-xs">
            {startsAt ? startsAt.toLocaleDateString() : 'Now'} →{' '}
            {expiresAt ? expiresAt.toLocaleDateString() : 'No expiry'}
          </span>
        );
      }
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = getCouponStatus({
          isActive: row.original.isActive,
          startsAt: toDate(row.original.startsAt),
          expiresAt: toDate(row.original.expiresAt)
        });
        return <Badge variant={statusBadgeVariant[status]}>{statusLabel[status]}</Badge>;
      }
    },
    {
      id: 'usage',
      header: 'Usage',
      cell: ({ row }) => {
        const { _count, maxRedemptions } = row.original;
        return (
          <span className="text-sm">
            {_count.redemptions}
            {typeof maxRedemptions === 'number' ? ` / ${maxRedemptions}` : ''}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const coupon = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(coupon)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onToggleActive(coupon)}>
              {coupon.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        );
      }
    }
  ];
}
