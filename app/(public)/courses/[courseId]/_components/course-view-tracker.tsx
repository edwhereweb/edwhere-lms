'use client';

import { useEffect } from 'react';
import { trackFunnelEvent } from '@/lib/funnel-analytics';
import { useMetaPixel } from '@/components/providers/meta-pixel-provider';

type CourseViewTrackerProps = {
  courseId: string;
  title?: string;
  category?: string;
  amount: number | null;
};

export function CourseViewTracker({ courseId, title, category, amount }: CourseViewTrackerProps) {
  const { track } = useMetaPixel();

  useEffect(() => {
    void trackFunnelEvent({
      event: 'course_view',
      courseId,
      amount: amount ?? undefined,
      dedupeKey: `course_view:${courseId}`
    });

    track('ViewContent', {
      content_ids: [courseId],
      content_name: title,
      content_category: category,
      content_type: 'product',
      value: amount ?? undefined,
      currency: 'INR'
    });
  }, [amount, category, courseId, title, track]);

  return null;
}
