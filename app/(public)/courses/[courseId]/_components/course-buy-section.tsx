'use client';

import axios from 'axios';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ShieldCheck, Award, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/format';
import { trackFunnelEvent } from '@/lib/funnel-analytics';
import { cn } from '@/lib/utils';

export type CouponPreviewInfo = {
  code: string;
  type?: 'PERCENT' | 'FIXED';
  value?: number;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  message: string;
  isAutoApplied?: boolean;
};

type CourseBuySectionProps = {
  courseId: string;
  originalPrice: number | null;
  isAuthenticated: boolean;
  isEnrolled: boolean;
  initialCouponInfo?: CouponPreviewInfo | null;
  initialCouponError?: string | null;
  className?: string;
};

export function CourseBuySection({
  courseId,
  originalPrice: originalAmount,
  isAuthenticated,
  isEnrolled,
  initialCouponInfo: initialCoupon = null,
  initialCouponError: initialError = null,
  className
}: CourseBuySectionProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPreviewInfo | null>(initialCoupon);
  const [couponError, setCouponError] = useState<string | null>(initialError);

  const whatsappNumber = '+91 8138041614';
  const whatsappLink = 'https://wa.me/918138041614';

  const payableAmount = appliedCoupon ? appliedCoupon.finalPrice : originalAmount;

  const checkoutTarget = isEnrolled
    ? `/courses/${courseId}/start`
    : `/checkout?courseId=${courseId}${appliedCoupon ? `&coupon=${encodeURIComponent(appliedCoupon.code)}` : ''}&intent=buy`;

  const finalTarget = isAuthenticated
    ? checkoutTarget
    : isEnrolled
      ? `/courses/${courseId}/start`
      : `/sign-in?next=${encodeURIComponent(checkoutTarget)}`;

  const label = isEnrolled ? 'Go to Course' : 'Buy Now';

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;

    try {
      setIsApplying(true);
      setCouponError(null);

      const { data } = await axios.post('/api/coupons/validate', {
        courseId,
        couponCode: code
      });

      const isApplied = data?.valid === true || data?.status === 'applied';

      if (!isApplied) {
        setAppliedCoupon(null);
        setCouponError(data?.message ?? 'Invalid coupon code.');
        return;
      }

      const couponInfo: CouponPreviewInfo = {
        code: data.code ?? code,
        type: data.type,
        value: data.value,
        originalPrice: data.originalPrice,
        discountAmount: data.discountAmount,
        finalPrice: data.finalPrice,
        message: data.message ?? `Coupon "${data.code ?? code}" applied.`,
        isAutoApplied: data.isAutoApplied
      };

      setAppliedCoupon(couponInfo);
      setCouponError(null);
      setCouponInput('');
      toast.success(couponInfo.message);
    } catch (error) {
      setAppliedCoupon(null);
      const serverMessage = axios.isAxiosError(error)
        ? ((error.response?.data as { error?: string; message?: string } | undefined)?.error ??
          (error.response?.data as { error?: string; message?: string } | undefined)?.message)
        : undefined;
      setCouponError(serverMessage ?? 'Failed to validate coupon. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponInput('');
    toast.success('Coupon removed');
  };

  const handleCtaClick = async () => {
    if (isNavigating) return;
    setIsNavigating(true);

    await trackFunnelEvent({
      event: 'buy_click',
      courseId,
      amount: payableAmount ?? undefined,
      dedupeKey: `buy_click:${courseId}:${isAuthenticated ? 'auth' : 'guest'}:${isEnrolled ? 'enrolled' : 'open'}`
    });

    if (!isAuthenticated && !isEnrolled) {
      await trackFunnelEvent({
        event: 'login_prompt_from_buy',
        courseId,
        amount: payableAmount ?? undefined,
        dedupeKey: `login_prompt_from_buy:${courseId}`
      });
    }

    router.push(finalTarget);
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Price Display */}
      {originalAmount !== null && originalAmount > 0 && (
        <div className="flex flex-wrap items-baseline gap-3">
          {appliedCoupon ? (
            <>
              <span className="font-poppins text-3xl md:text-4xl font-bold text-white">
                {formatPrice(appliedCoupon.finalPrice)}
              </span>
              <span className="font-inter text-lg text-gray-400 line-through">
                {formatPrice(originalAmount)}
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Tag className="h-3 w-3" /> Save {formatPrice(appliedCoupon.discountAmount)}
                {appliedCoupon.type === 'PERCENT' && appliedCoupon.value
                  ? ` (${appliedCoupon.value}% OFF)`
                  : ''}
              </span>
            </>
          ) : (
            <span className="font-poppins text-3xl md:text-4xl font-bold text-white">
              {formatPrice(originalAmount)}
            </span>
          )}
        </div>
      )}

      {/* Coupon UI (Show only if course has a price and user is not enrolled) */}
      {!isEnrolled && originalAmount !== null && originalAmount > 0 && (
        <div className="max-w-md space-y-2">
          {appliedCoupon ? (
            <div className="flex items-center justify-between gap-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl px-4 py-3 text-sm text-emerald-300">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  Coupon <span className="font-mono font-bold">{appliedCoupon.code}</span> applied
                  {appliedCoupon.isAutoApplied ? ' automatically' : ''} — you save{' '}
                  <span className="font-semibold">{formatPrice(appliedCoupon.discountAmount)}</span>
                  !
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveCoupon}
                className="text-xs text-emerald-400 hover:text-emerald-200 hover:bg-emerald-900/40 h-8 px-2 shrink-0"
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="course-coupon-input" className="text-xs font-medium text-gray-300">
                Have a coupon code?
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="course-coupon-input"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  disabled={isApplying}
                  className="h-10 bg-black/40 border-gray-700 text-white placeholder:text-gray-500 font-mono text-sm uppercase max-w-[200px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleApplyCoupon();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => void handleApplyCoupon()}
                  disabled={isApplying || !couponInput.trim()}
                  variant="outline"
                  className="h-10 px-4 border-gray-700 hover:bg-gray-800 text-white font-medium text-sm"
                >
                  {isApplying ? 'Applying...' : 'Apply'}
                </Button>
              </div>
            </div>
          )}

          {couponError && <p className="text-xs text-rose-400 font-medium">{couponError}</p>}
        </div>
      )}

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
        <Button
          onClick={() => void handleCtaClick()}
          disabled={isNavigating}
          className="h-12 px-8 bg-[#6715FF] hover:bg-[#5210CC] text-white font-semibold rounded-xl"
        >
          {isNavigating
            ? 'Please wait...'
            : `${label}${payableAmount !== null && payableAmount > 0 ? ` — ${formatPrice(payableAmount)}` : ''}`}
        </Button>
        <Button asChild variant="success" className="h-12 px-6 font-semibold rounded-xl">
          <a href={whatsappLink} target="_blank" rel="noreferrer">
            WhatsApp: {whatsappNumber}
          </a>
        </Button>
      </div>

      {/* Trust Badges */}
      <div className="text-xs text-gray-400 flex flex-wrap items-center gap-4 pt-1">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Secure payment
        </span>
        <span className="inline-flex items-center gap-1">
          <Award className="h-4 w-4 text-purple-400" /> Trusted instructors
        </span>
      </div>
    </div>
  );
}
