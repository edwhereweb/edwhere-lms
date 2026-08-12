'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { trackFunnelEvent } from '@/lib/funnel-analytics';

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
  intent
}: CheckoutClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    latestOrder?.failureDescription ?? null
  );

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

  const onCheckoutClick = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const { data } = await axios.post(`/api/courses/${courseId}/checkout`);
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
          <p className="font-semibold text-xl">{amountLabel}</p>
        </div>

        <div className="rounded-lg bg-slate-50 border px-4 py-3 text-sm space-y-1">
          <p className="font-medium">Why buy with confidence?</p>
          <p>• Secure payment via Razorpay</p>
          <p>• Instant access after successful payment</p>
          <p>• Refund support available per policy</p>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <Button onClick={onCheckoutClick} disabled={isSubmitting} className="w-full h-11">
          {isSubmitting ? 'Processing...' : retrying ? 'Retry Payment' : 'Pay Now'}
        </Button>
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 border-t bg-white/95 backdrop-blur p-4 z-40">
        <Button onClick={onCheckoutClick} disabled={isSubmitting} className="w-full h-11">
          {isSubmitting ? 'Processing...' : `Pay ${amountLabel}`}
        </Button>
      </div>
    </div>
  );
}
