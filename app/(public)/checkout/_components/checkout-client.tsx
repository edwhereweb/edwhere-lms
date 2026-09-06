'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trackFunnelEvent } from '@/lib/funnel-analytics';
import { formatPrice } from '@/lib/format';
import { useMetaPixel } from '@/components/providers/meta-pixel-provider';

type LatestOrder = {
  id: string;
  status: 'PENDING' | 'FAILED' | 'CANCELLED' | 'PAID';
  failureDescription: string | null;
  updatedAt: string | Date;
} | null;

type CheckoutClientProps = {
  courseId: string;
  courseSlug: string | null;
  courseTitle: string;
  amount: number;
  amountLabel: string;
  userName: string;
  userEmail: string;
  latestOrder: LatestOrder;
  intent: string | null;
  autoAppliedCoupon: CouponPreview | null;
};

type CouponPreview = {
  code: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  message: string;
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function loadRazorpayScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(script);
  });
}

export function CheckoutClient({
  courseId,
  courseSlug,
  courseTitle,
  amount,
  amountLabel,
  userName,
  userEmail,
  latestOrder,
  intent,
  autoAppliedCoupon
}: CheckoutClientProps) {
  const router = useRouter();
  const { track } = useMetaPixel();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    latestOrder?.failureDescription ?? null
  );
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPreview | null>(autoAppliedCoupon);
  const [couponIsAutoApplied, setCouponIsAutoApplied] = useState(Boolean(autoAppliedCoupon));

  const payableAmountLabel = appliedCoupon ? formatPrice(appliedCoupon.finalPrice) : amountLabel;

  const retrying = latestOrder?.status === 'FAILED' || latestOrder?.status === 'CANCELLED';
  const checkoutStartedDedupe = useMemo(() => `checkout_started:${courseId}`, [courseId]);

  useEffect(() => {
    void trackFunnelEvent({
      event: 'checkout_started',
      courseId,
      amount,
      dedupeKey: checkoutStartedDedupe
    });
  }, [amount, checkoutStartedDedupe, courseId]);

  useEffect(() => {
    if (intent !== 'buy') return;
    void trackFunnelEvent({
      event: 'login_success_from_buy',
      courseId,
      amount,
      dedupeKey: `login_success_from_buy:${courseId}`
    });
  }, [amount, courseId, intent]);

  useEffect(() => {
    if (!autoAppliedCoupon) return;
    void trackFunnelEvent({
      event: 'campaign_coupon_auto_applied',
      courseId,
      amount,
      dedupeKey: `campaign_coupon_auto_applied:${courseId}:${autoAppliedCoupon.code}`
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    try {
      setIsApplyingCoupon(true);
      setCouponError(null);
      const { data } = await axios.post('/api/coupons/validate', {
        courseId,
        couponCode: code
      });

      if (!data.valid) {
        setAppliedCoupon(null);
        setCouponIsAutoApplied(false);
        setCouponError(data.message ?? 'Invalid coupon code.');
        return;
      }

      setAppliedCoupon({
        code: data.code,
        originalPrice: data.originalPrice,
        discountAmount: data.discountAmount,
        finalPrice: data.finalPrice,
        message: data.message
      });
      setCouponIsAutoApplied(false);
      toast.success(data.message ?? 'Coupon applied.');
    } catch {
      setAppliedCoupon(null);
      setCouponIsAutoApplied(false);
      setCouponError('Failed to validate coupon. Please try again.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const onRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponIsAutoApplied(false);
    setCouponError(null);
    setCouponInput('');
  };

  const onCheckoutClick = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const { data } = await axios.post(`/api/courses/${courseId}/checkout`, {
        ...(appliedCoupon
          ? {
              couponCode: appliedCoupon.code,
              couponSource: couponIsAutoApplied ? 'campaign' : 'manual'
            }
          : {})
      });
      await loadRazorpayScript();

      const {
        checkoutOrderId,
        orderId,
        keyId,
        currency,
        amount: amountInPaise
      } = data as {
        checkoutOrderId: string;
        orderId: string;
        keyId: string;
        currency: string;
        amount: number;
      };

      await trackFunnelEvent({
        event: 'payment_initiated',
        courseId,
        amount,
        currency,
        checkoutOrderId,
        paymentOrderId: orderId,
        dedupeKey: `payment_initiated:${checkoutOrderId}`
      });

      track(
        'InitiateCheckout',
        {
          content_ids: [courseId],
          content_name: courseTitle,
          content_type: 'product',
          value: appliedCoupon ? appliedCoupon.finalPrice : amount,
          currency: currency || 'INR',
          num_items: 1
        },
        {
          eventId: `init_checkout_${checkoutOrderId}`
        }
      );

      const options = {
        key: keyId,
        amount: amountInPaise,
        currency,
        name: courseTitle,
        description: 'Course Enrollment',
        order_id: orderId,
        prefill: {
          email: userEmail,
          name: userName
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await axios.post('/api/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            await trackFunnelEvent({
              event: 'payment_success',
              courseId,
              amount,
              checkoutOrderId,
              paymentOrderId: response.razorpay_order_id,
              dedupeKey: `payment_success:${response.razorpay_payment_id}`
            });

            track(
              'Purchase',
              {
                content_ids: [courseId],
                content_name: courseTitle,
                content_type: 'product',
                value: appliedCoupon ? appliedCoupon.finalPrice : amount,
                currency: 'INR',
                order_id: response.razorpay_order_id,
                num_items: 1
              },
              {
                eventId: `purchase_${response.razorpay_order_id}`
              }
            );

            toast.success('Payment successful! You are now enrolled.');
            router.push(`/courses/${courseId}/start`);
            router.refresh();
          } catch {
            await axios.patch(`/api/checkout/orders/${checkoutOrderId}/status`, {
              status: 'FAILED',
              failureDescription: 'Payment verification failed. Please retry checkout.'
            });
            await trackFunnelEvent({
              event: 'payment_failed',
              courseId,
              amount,
              checkoutOrderId,
              paymentOrderId: response.razorpay_order_id,
              dedupeKey: `payment_failed:verify:${checkoutOrderId}`
            });
            setErrorMessage('Payment verification failed. Please retry checkout.');
            toast.error('Payment verification failed.');
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: async () => {
            await axios.patch(`/api/checkout/orders/${checkoutOrderId}/status`, {
              status: 'CANCELLED',
              failureDescription: 'Checkout was cancelled.'
            });
            await trackFunnelEvent({
              event: 'checkout_abandoned',
              courseId,
              amount,
              checkoutOrderId,
              paymentOrderId: orderId,
              dedupeKey: `checkout_abandoned:${checkoutOrderId}`
            });
            setErrorMessage('Checkout was cancelled. You can retry anytime.');
            setIsSubmitting(false);
          }
        },
        theme: {
          color: '#6715FF'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on(
        'payment.failed',
        async (response: { error?: { code?: string; description?: string } }) => {
          await axios.patch(`/api/checkout/orders/${checkoutOrderId}/status`, {
            status: 'FAILED',
            failureCode: response?.error?.code,
            failureDescription: response?.error?.description ?? 'Payment failed. Please retry.'
          });
          await trackFunnelEvent({
            event: 'payment_failed',
            courseId,
            amount,
            checkoutOrderId,
            paymentOrderId: orderId,
            dedupeKey: `payment_failed:${checkoutOrderId}`
          });
          setErrorMessage(response?.error?.description ?? 'Payment failed. Please retry.');
          setIsSubmitting(false);
        }
      );

      rzp.open();
    } catch {
      setErrorMessage('Failed to start checkout. Please try again.');
      toast.error('Failed to initiate payment. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-12 pb-28 md:pb-12">
      <p className="text-sm text-muted-foreground mb-2">Secure checkout</p>
      <h1 className="text-2xl md:text-3xl font-semibold mb-6">Complete your enrollment</h1>

      <div className="rounded-xl border p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-lg">{courseTitle}</p>
            <p className="text-sm text-muted-foreground">
              {courseSlug ? `/courses/${courseSlug}` : `/courses/${courseId}`}
            </p>
          </div>
          <div className="text-right">
            {appliedCoupon ? (
              <>
                <p className="text-sm text-muted-foreground line-through">{amountLabel}</p>
                <p className="font-semibold text-xl">{payableAmountLabel}</p>
              </>
            ) : (
              <p className="font-semibold text-xl">{amountLabel}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Have a coupon?</p>
          {appliedCoupon ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/40 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              <span>
                Coupon <span className="font-mono font-semibold">{appliedCoupon.code}</span>{' '}
                {couponIsAutoApplied ? 'applied automatically' : 'applied'} — you save{' '}
                {formatPrice(appliedCoupon.discountAmount)}.
              </span>
              <Button variant="ghost" size="sm" onClick={onRemoveCoupon}>
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                disabled={isApplyingCoupon}
                className="flex-1 font-mono"
              />
              <Button
                type="button"
                variant="outline"
                onClick={onApplyCoupon}
                disabled={isApplyingCoupon || !couponInput.trim()}
              >
                {isApplyingCoupon ? 'Applying...' : 'Apply'}
              </Button>
            </div>
          )}
          {couponError && <p className="text-sm text-red-600 dark:text-red-400">{couponError}</p>}
        </div>

        <div className="rounded-lg bg-muted border px-4 py-3 text-sm space-y-1">
          <p className="font-medium">Why buy with confidence?</p>
          <p>• Secure payment via Razorpay</p>
          <p>• Instant access after successful payment</p>
          <p>• Refund support available per policy</p>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {errorMessage}
          </div>
        )}

        <Button onClick={onCheckoutClick} disabled={isSubmitting} className="w-full h-11">
          {isSubmitting ? 'Processing...' : retrying ? 'Retry Payment' : 'Pay Now'}
        </Button>
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur p-4 z-40">
        <Button onClick={onCheckoutClick} disabled={isSubmitting} className="w-full h-11">
          {isSubmitting ? 'Processing...' : `Pay ${payableAmountLabel}`}
        </Button>
      </div>
    </div>
  );
}
