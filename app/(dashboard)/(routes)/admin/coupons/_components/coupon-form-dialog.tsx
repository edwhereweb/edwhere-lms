'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { type CouponListItem, type CourseOption } from './types';

interface CouponFormDialogProps {
  open: boolean;
  coupon: CouponListItem | null;
  courses: CourseOption[];
  onClose: () => void;
  onSuccess: (coupon: CouponListItem) => void;
}

type FormState = {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: string;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
  maxRedemptions: string;
  maxRedemptionsPerUser: string;
  applicableCourseIds: string[];
  campaignToken: string;
  autoApply: boolean;
};

const emptyForm: FormState = {
  code: '',
  type: 'PERCENT',
  value: '',
  isActive: true,
  startsAt: '',
  expiresAt: '',
  maxRedemptions: '',
  maxRedemptionsPerUser: '',
  applicableCourseIds: [],
  campaignToken: '',
  autoApply: false
};

function toDateInputValue(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export function CouponFormDialog({
  open,
  coupon,
  courses,
  onClose,
  onSuccess
}: CouponFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (coupon) {
      setForm({
        code: coupon.code,
        type: coupon.type,
        value: String(coupon.value),
        isActive: coupon.isActive,
        startsAt: toDateInputValue(coupon.startsAt),
        expiresAt: toDateInputValue(coupon.expiresAt),
        maxRedemptions: coupon.maxRedemptions ? String(coupon.maxRedemptions) : '',
        maxRedemptionsPerUser: coupon.maxRedemptionsPerUser
          ? String(coupon.maxRedemptionsPerUser)
          : '',
        applicableCourseIds: coupon.applicableCourseIds,
        campaignToken: coupon.campaignToken ?? '',
        autoApply: coupon.autoApply
      });
    } else {
      setForm(emptyForm);
    }
  }, [coupon, open]);

  const isEditing = Boolean(coupon);

  const toggleCourse = (courseId: string) => {
    setForm((prev) => ({
      ...prev,
      applicableCourseIds: prev.applicableCourseIds.includes(courseId)
        ? prev.applicableCourseIds.filter((id) => id !== courseId)
        : [...prev.applicableCourseIds, courseId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.value) return;

    const payload = {
      code: form.code.trim(),
      type: form.type,
      value: Number(form.value),
      isActive: form.isActive,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
      maxRedemptionsPerUser: form.maxRedemptionsPerUser ? Number(form.maxRedemptionsPerUser) : null,
      applicableCourseIds: form.applicableCourseIds,
      campaignToken: form.campaignToken.trim() ? form.campaignToken.trim() : null,
      autoApply: form.campaignToken.trim() ? form.autoApply : false
    };

    try {
      setLoading(true);
      const { data } = isEditing
        ? await axios.patch(`/api/admin/coupons/${coupon!.id}`, payload)
        : await axios.post('/api/admin/coupons', payload);

      toast.success(isEditing ? 'Coupon updated' : 'Coupon created');
      onSuccess({ ...data, _count: data._count ?? coupon?._count ?? { redemptions: 0 } });
      onClose();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? 'Something went wrong')
        : 'Something went wrong';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update coupon details. Changes apply immediately to future checkouts.'
              : 'Create a new discount coupon for course purchases.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="coupon-code">Code</Label>
            <Input
              id="coupon-code"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. SAVE10"
              required
              className="font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((p) => ({ ...p, type: value as 'PERCENT' | 'FIXED' }))
                }
              >
                <SelectTrigger id="coupon-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Percent (%)</SelectItem>
                  <SelectItem value="FIXED">Fixed (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-value">Value</Label>
              <Input
                id="coupon-value"
                type="number"
                min={0}
                step="0.01"
                value={form.value}
                onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-starts">Starts At</Label>
              <Input
                id="coupon-starts"
                type="date"
                value={form.startsAt}
                onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-expires">Expires At</Label>
              <Input
                id="coupon-expires"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-max">Max Redemptions</Label>
              <Input
                id="coupon-max"
                type="number"
                min={1}
                placeholder="Unlimited"
                value={form.maxRedemptions}
                onChange={(e) => setForm((p) => ({ ...p, maxRedemptions: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-max-per-user">Max Per User</Label>
              <Input
                id="coupon-max-per-user"
                type="number"
                min={1}
                placeholder="Unlimited"
                value={form.maxRedemptionsPerUser}
                onChange={(e) => setForm((p) => ({ ...p, maxRedemptionsPerUser: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <Label htmlFor="coupon-campaign-token">Campaign Token (Meta Ads auto-apply)</Label>
            <Input
              id="coupon-campaign-token"
              value={form.campaignToken}
              onChange={(e) => setForm((p) => ({ ...p, campaignToken: e.target.value }))}
              placeholder="e.g. META_AWS_50"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Ad destination URLs can include <code>?ct=&lt;token&gt;</code> to auto-apply this
              coupon at checkout. Leave blank to disable auto-apply for this coupon.
            </p>
            <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
              <Checkbox
                checked={form.autoApply}
                onCheckedChange={(checked) =>
                  setForm((p) => ({ ...p, autoApply: Boolean(checked) }))
                }
                disabled={!form.campaignToken.trim()}
              />
              Auto-apply for visitors carrying this campaign token
            </label>
          </div>

          <div className="space-y-2">
            <Label>Applicable Courses (leave empty for all courses)</Label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
              {courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No courses available.</p>
              ) : (
                courses.map((course) => (
                  <label
                    key={course.id}
                    className="flex items-center gap-2 text-sm py-1 cursor-pointer"
                  >
                    <Checkbox
                      checked={form.applicableCourseIds.includes(course.id)}
                      onCheckedChange={() => toggleCourse(course.id)}
                    />
                    {course.title}
                  </label>
                ))
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: Boolean(checked) }))}
            />
            Active
          </label>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isEditing ? 'Save Changes' : 'Create Coupon'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
