'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface ScrollTrackerProps {
  courseId: string;
  chapterId: string;
  isCompleted: boolean;
  wordCount: number;
  onComplete?: (nextChapterId: string) => void;
  nextChapterId?: string;
}

export function ScrollTracker({
  courseId,
  chapterId,
  isCompleted,
  wordCount,
  onComplete,
  nextChapterId
}: ScrollTrackerProps) {
  const router = useRouter();
  const observerTarget = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const hasMarkedComplete = useRef(false);
  const mountTime = useRef(Date.now());

  // Calculate dynamic dwell time based on an optimistic 250 words per minute.
  // Minimum of 5 seconds, maximum of 60 seconds to prevent them getting stuck if they read very fast.
  const wpm = 250;
  const rawSeconds = (wordCount / wpm) * 60;
  const dwellTimeMs = Math.max(5000, Math.min(60000, rawSeconds * 1000));

  useEffect(() => {
    if (isCompleted || hasMarkedComplete.current) return;

    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasScrolledToBottom(true);
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [isCompleted]);

  useEffect(() => {
    if (isCompleted || hasMarkedComplete.current || !hasScrolledToBottom) return;

    // We've hit the bottom. Now check if the dwell time has passed.
    const timeElapsed = Date.now() - mountTime.current;
    const timeRemaining = dwellTimeMs - timeElapsed;

    const triggerCompletion = async () => {
      if (hasMarkedComplete.current) return;
      hasMarkedComplete.current = true;

      try {
        await axios.put(`/api/courses/${courseId}/chapters/${chapterId}/progress`, {
          isCompleted: true
        });

        toast.success('Chapter completed! 🎉');
        router.refresh();

        if (onComplete && nextChapterId) {
          onComplete(nextChapterId);
        } else if (!nextChapterId) {
          // If no next chapter, they finished the course
          toast.success('Course complete! 🎉');
        }
      } catch {
        hasMarkedComplete.current = false; // Allow retry on failure
      }
    };

    if (timeRemaining <= 0) {
      triggerCompletion();
    } else {
      const timer = setTimeout(triggerCompletion, timeRemaining);
      return () => clearTimeout(timer);
    }
  }, [
    hasScrolledToBottom,
    isCompleted,
    courseId,
    chapterId,
    dwellTimeMs,
    router,
    onComplete,
    nextChapterId
  ]);

  return <div ref={observerTarget} className="h-1 w-full" aria-hidden="true" />;
}
