'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CouponsDataTable } from './data-table';
import { buildColumns } from './columns';
import { CouponFormDialog } from './coupon-form-dialog';
import { type CouponListItem, type CourseOption } from './types';

interface CouponsClientProps {
  initialCoupons: CouponListItem[];
  courses: CourseOption[];
}

export function CouponsClient({ initialCoupons, courses }: CouponsClientProps) {
  const [coupons, setCoupons] = useState<CouponListItem[]>(initialCoupons);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponListItem | null>(null);

  const openCreateDialog = () => {
    setEditingCoupon(null);
    setDialogOpen(true);
  };

  const openEditDialog = (coupon: CouponListItem) => {
    setEditingCoupon(coupon);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCoupon(null);
  };

  const upsertCoupon = (coupon: CouponListItem) => {
    setCoupons((prev) => {
      const exists = prev.some((c) => c.id === coupon.id);
      return exists ? prev.map((c) => (c.id === coupon.id ? coupon : c)) : [coupon, ...prev];
    });
  };

  const onToggleActive = async (coupon: CouponListItem) => {
    try {
      const { data } = await axios.patch(`/api/admin/coupons/${coupon.id}`, {
        isActive: !coupon.isActive
      });
      upsertCoupon({ ...data, _count: coupon._count });
      toast.success(data.isActive ? 'Coupon activated' : 'Coupon deactivated');
    } catch {
      toast.error('Failed to update coupon status');
    }
  };

  const columns = buildColumns({ onEdit: openEditDialog, onToggleActive });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreateDialog}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Coupon
        </Button>
      </div>

      <CouponsDataTable columns={columns} data={coupons} />

      <CouponFormDialog
        open={dialogOpen}
        coupon={editingCoupon}
        courses={courses}
        onClose={closeDialog}
        onSuccess={upsertCoupon}
      />
    </div>
  );
}
