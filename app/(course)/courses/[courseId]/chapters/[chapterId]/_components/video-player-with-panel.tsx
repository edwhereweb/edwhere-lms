'use client';

import { useState } from 'react';
import { VideoPlayer } from './video-player';
import { NextUpPanel } from './next-up-panel';

interface VideoPlayerWithPanelProps {
  playbackId?: string | null;
  youtubeVideoId?: string | null;
  courseId: string;
  chapterId: string;
  nextChapterId?: string;
  nextChapterTitle?: string;
  isLocked: boolean;
  completeOnEnd: boolean;
  title: string;
}

export function VideoPlayerWithPanel({
  nextChapterId,
  nextChapterTitle,
  ...playerProps
}: VideoPlayerWithPanelProps) {
  const [showPanel, setShowPanel] = useState(false);

  const handleComplete = nextChapterId ? (_id: string) => setShowPanel(true) : undefined;

  return (
    <>
      <VideoPlayer {...playerProps} nextChapterId={nextChapterId} onComplete={handleComplete} />
      {showPanel && nextChapterId && nextChapterTitle && (
        <NextUpPanel
          courseId={playerProps.courseId}
          nextChapterId={nextChapterId}
          nextChapterTitle={nextChapterTitle}
          onDismiss={() => setShowPanel(false)}
        />
      )}
    </>
  );
}
