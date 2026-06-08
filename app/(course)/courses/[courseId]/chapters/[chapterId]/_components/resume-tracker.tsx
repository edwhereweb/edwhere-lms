'use client';

import { useEffect } from 'react';
import axios from 'axios';

interface ResumeTrackerProps {
  courseId: string;
  chapterId: string;
}

// Invisible component that records the student's current chapter on the server
// so the /start page can resume them here next time they open the course.
export function ResumeTracker({ courseId, chapterId }: ResumeTrackerProps) {
  useEffect(() => {
    // Fire-and-forget — we don't care about the response
    axios.patch(`/api/courses/${courseId}/resume`, { chapterId }).catch(() => {
      // Silently ignore — resume tracking is best-effort
    });
  }, [courseId, chapterId]);

  return null;
}
