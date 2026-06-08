'use client';

import { useState } from 'react';
import { CourseProgressButton } from './course-progress-button';
import { NextUpPanel } from './next-up-panel';

interface ProgressButtonWithPanelProps {
  chapterId: string;
  courseId: string;
  isCompleted: boolean;
  nextChapterId?: string;
  nextChapterTitle?: string;
}

export function ProgressButtonWithPanel({
  chapterId,
  courseId,
  isCompleted,
  nextChapterId,
  nextChapterTitle
}: ProgressButtonWithPanelProps) {
  const [showPanel, setShowPanel] = useState(false);

  const handleComplete = nextChapterId ? (_id: string) => setShowPanel(true) : undefined;

  return (
    <>
      <CourseProgressButton
        chapterId={chapterId}
        courseId={courseId}
        isCompleted={isCompleted}
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
