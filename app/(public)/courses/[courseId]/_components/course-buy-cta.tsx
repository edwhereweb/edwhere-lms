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
  const whatsappNumber = '+91 8138041614';
  const whatsappLink = 'https://wa.me/918138041614';

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
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <Button
        onClick={onClick}
        disabled={isNavigating}
        className="h-12 px-8 bg-[#6715FF] hover:bg-[#5210CC] text-white font-semibold rounded-xl"
      >
        {isNavigating ? 'Please wait...' : `${label}${amount ? ` — ${formatPrice(amount)}` : ''}`}
      </Button>
      <Button
        asChild
        variant="success"
        className="h-12 px-6 font-semibold rounded-xl"
      >
        <a href={whatsappLink} target="_blank" rel="noreferrer">
          WhatsApp: {whatsappNumber}
        </a>
      </Button>
    </div>
  );
}
