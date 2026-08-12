'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/format';
import { trackFunnelEvent } from '@/lib/funnel-analytics';

interface CourseEnrollButtonProps {
  courseId: string;
  price: number;
}

export const CourseEnrollButton = ({ courseId, price }: CourseEnrollButtonProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    if (isLoading) return;
    setIsLoading(true);

    await trackFunnelEvent({
      event: 'buy_click',
      courseId,
      amount: price,
      dedupeKey: `buy_click:chapter:${courseId}`
    });

    router.push(`/checkout?courseId=${courseId}&intent=buy`);
  };

  return (
    <Button onClick={onClick} disabled={isLoading} size="sm" className="w-full md:w-auto">
      {isLoading ? 'Please wait...' : `Buy Now — ${formatPrice(price)}`}
    </Button>
  );
};
