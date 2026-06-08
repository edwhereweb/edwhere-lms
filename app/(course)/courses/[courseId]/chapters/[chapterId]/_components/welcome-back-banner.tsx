'use client';

import { useState, useEffect } from 'react';
import { X, Flame } from 'lucide-react';

interface WelcomeBackBannerProps {
  courseId: string;
  daysSinceLastVisit: number;
  lastChapterTitle: string;
}

export function WelcomeBackBanner({
  courseId,
  daysSinceLastVisit,
  lastChapterTitle
}: WelcomeBackBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show once per browser session per course
    const key = `edwhere:wb:${courseId}`;
    if (!sessionStorage.getItem(key)) {
      setVisible(true);
      sessionStorage.setItem(key, '1');
    }
  }, [courseId]);

  if (!visible) return null;

  return (
    <div className="relative flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm shadow-sm">
      <Flame className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-amber-800 dark:text-amber-200">Welcome back! 👋</p>
        <p className="text-amber-700 dark:text-amber-300 mt-0.5 text-xs">
          It&apos;s been{' '}
          <span className="font-semibold">
            {daysSinceLastVisit} day{daysSinceLastVisit !== 1 ? 's' : ''}
          </span>{' '}
          since your last session. You were on{' '}
          <span className="font-semibold">&ldquo;{lastChapterTitle}&rdquo;</span> — keep going!
        </p>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="ml-2 shrink-0 rounded-md p-1 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
