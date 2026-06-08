'use client';

import { useState } from 'react';
import { NextUpPanel } from './next-up-panel';
import { WelcomeBackBanner } from './welcome-back-banner';
import { ResumeTracker } from './resume-tracker';

interface ChapterShellProps {
  courseId: string;
  chapterId: string;
  children: React.ReactNode;
  // Pass chapter map for NextUpPanel title lookup
  nextChapterId?: string;
  nextChapterTitle?: string;
  // Welcome back
  showWelcomeBack?: boolean;
  daysSinceLastVisit?: number;
  lastChapterTitle?: string;
  // Whether this student is enrolled (only enrolled students get resume tracking)
  isEnrolled: boolean;
}

export function ChapterShell({
  courseId,
  chapterId,
  children,
  nextChapterId,
  nextChapterTitle,
  showWelcomeBack,
  daysSinceLastVisit,
  lastChapterTitle,
  isEnrolled
}: ChapterShellProps) {
  const [nextUpChapterId, setNextUpChapterId] = useState<string | null>(null);

  return (
    <>
      {/* Invisible tracker — fires on mount, best-effort */}
      {isEnrolled && <ResumeTracker courseId={courseId} chapterId={chapterId} />}

      {/* Welcome back banner shown at most once per session */}
      {showWelcomeBack && daysSinceLastVisit !== undefined && lastChapterTitle && (
        <div className="px-4 pt-4 md:px-8 max-w-4xl mx-auto">
          <WelcomeBackBanner
            courseId={courseId}
            daysSinceLastVisit={daysSinceLastVisit}
            lastChapterTitle={lastChapterTitle}
          />
        </div>
      )}

      {/* Page content */}
      {children}

      {/* Next Up overlay — triggered by CourseProgressButton or VideoPlayer onComplete */}
      {nextUpChapterId &&
        nextChapterId &&
        nextChapterTitle &&
        nextUpChapterId === nextChapterId && (
          <NextUpPanel
            courseId={courseId}
            nextChapterId={nextChapterId}
            nextChapterTitle={nextChapterTitle}
            onDismiss={() => setNextUpChapterId(null)}
          />
        )}
    </>
  );
}

// Export a hook-compatible handler to pass to CourseProgressButton / VideoPlayer
export function useNextUpHandler(
  nextChapterId: string | undefined,
  setNextUpChapterId: (id: string | null) => void
) {
  if (!nextChapterId) return undefined;
  return (id: string) => setNextUpChapterId(id);
}
