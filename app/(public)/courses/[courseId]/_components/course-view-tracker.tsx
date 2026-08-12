'use client';

import { useEffect } from 'react';
import { trackFunnelEvent } from '@/lib/funnel-analytics';

type CourseViewTrackerProps = {
  courseId: string;
  amount: number | null;
};

export function CourseViewTracker({ courseId, amount }: CourseViewTrackerProps) {
  useEffect(() => {
    void trackFunnelEvent({
      event: 'course_view',
      courseId,
      amount: amount ?? undefined,
      dedupeKey: `course_view:${courseId}`
    });
  }, [amount, courseId]);

  return null;
}
