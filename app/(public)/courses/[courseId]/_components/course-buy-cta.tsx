'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { trackFunnelEvent } from '@/lib/funnel-analytics';
import { formatPrice } from '@/lib/format';

type CourseBuyCtaProps = {
  courseId: string;
  amount: number | null;
  isAuthenticated: boolean;
  isEnrolled: boolean;
};

export function CourseBuyCta({ courseId, amount, isAuthenticated, isEnrolled }: CourseBuyCtaProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const target = isEnrolled
    ? `/courses/${courseId}/start`
    : isAuthenticated
      ? `/checkout?courseId=${courseId}&intent=buy`
      : `/sign-in?next=${encodeURIComponent(`/checkout?courseId=${courseId}&intent=buy`)}`;

  const label = isEnrolled ? 'Go to Course' : 'Buy Now';

  const onClick = async () => {
    if (isNavigating) return;
    setIsNavigating(true);

    await trackFunnelEvent({
      event: 'buy_click',
      courseId,
      amount: amount ?? undefined,
      dedupeKey: `buy_click:${courseId}:${isAuthenticated ? 'auth' : 'guest'}:${isEnrolled ? 'enrolled' : 'open'}`
    });

    if (!isAuthenticated) {
      await trackFunnelEvent({
        event: 'login_prompt_from_buy',
        courseId,
        amount: amount ?? undefined,
        dedupeKey: `login_prompt_from_buy:${courseId}`
      });
    }

    router.push(target);
  };

  return (
    <Button
      onClick={onClick}
      disabled={isNavigating}
      className="h-12 px-8 bg-[#6715FF] hover:bg-[#5210CC] text-white font-semibold rounded-xl"
    >
      {isNavigating ? 'Please wait...' : `${label}${amount ? ` — ${formatPrice(amount)}` : ''}`}
    </Button>
  );
}
