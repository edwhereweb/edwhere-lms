'use client';

import { useState } from 'react';
import { ScrollTracker } from './scroll-tracker';
import { NextUpPanel } from './next-up-panel';

interface ScrollTrackerWithPanelProps {
  courseId: string;
  chapterId: string;
  isCompleted: boolean;
  wordCount: number;
  nextChapterId?: string;
  nextChapterTitle?: string;
}

export function ScrollTrackerWithPanel({
  courseId,
  chapterId,
  isCompleted,
  wordCount,
  nextChapterId,
  nextChapterTitle
}: ScrollTrackerWithPanelProps) {
  const [showPanel, setShowPanel] = useState(false);

  const handleComplete = nextChapterId ? (_id: string) => setShowPanel(true) : undefined;

  return (
    <>
      <ScrollTracker
        courseId={courseId}
        chapterId={chapterId}
        isCompleted={isCompleted}
        wordCount={wordCount}
        nextChapterId={nextChapterId}
        onComplete={handleComplete}
      />
      {showPanel && nextChapterId && nextChapterTitle && (
        <NextUpPanel
          courseId={courseId}
          nextChapterId={nextChapterId}
          nextChapterTitle={nextChapterTitle}
          onDismiss={() => setShowPanel(false)}
        />
      )}
    </>
  );
}
