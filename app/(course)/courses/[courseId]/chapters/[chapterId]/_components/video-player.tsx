'use client';

import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { useConfettiStore } from '@/hooks/use-confetti-store';
import MuxPlayer from '@mux/mux-player-react';

interface VideoPlayerProps {
  playbackId?: string | null;
  youtubeVideoId?: string | null;
  courseId: string;
  chapterId: string;
  nextChapterId?: string;
  isLocked: boolean;
  completeOnEnd: boolean;
  title: string;
}

// ------- YouTube secure player component -------
const YoutubePlayer = ({
  courseId,
  chapterId,
  onEnd: _onEnd
}: {
  courseId: string;
  chapterId: string;
  onEnd: () => void;
}) => {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    axios
      .get(`/api/courses/${courseId}/chapters/${chapterId}/youtube-embed`)
      .then((res) => setEmbedUrl(res.data.embedUrl))
      .catch(() => toast.error('Could not load video'))
      .finally(() => setLoading(false));
  }, [courseId, chapterId]);

  // Block context-menu on the iframe overlay
  const blockContextMenu = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="relative w-full h-full" onContextMenu={blockContextMenu}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      )}
      {embedUrl && (
        <>
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            // sandbox without allow-popups blocks the YouTube logo from opening youtube.com
            sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
            referrerPolicy="strict-origin"
            title="Chapter video"
          />
          {/* Transparent overlay blocks right-click & accidental iframe interaction */}
          <div
            className="absolute inset-0 pointer-events-none select-none"
            aria-hidden="true"
            style={{ zIndex: 1 }}
          />
        </>
      )}
    </div>
  );
};

// ------- Main VideoPlayer component -------
export const VideoPlayer = ({
  playbackId,
  youtubeVideoId,
  courseId,
  chapterId,
  nextChapterId,
  isLocked,
  completeOnEnd,
  title
}: VideoPlayerProps) => {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const confetti = useConfettiStore();

  const onEnd = async () => {
    try {
      if (completeOnEnd) {
        await axios.put(`/api/courses/${courseId}/chapters/${chapterId}/progress`, {
          isCompleted: true
        });

        if (!nextChapterId) confetti.onOpen();

        toast.success('Progress updated');
        router.refresh();

        if (nextChapterId) {
          router.push(`/courses/${courseId}/chapters/${nextChapterId}`);
        }
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="relative aspect-video">
      {/* Locked state */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 dark:bg-slate-200 flex-col gap-y-2 text-secondary">
          <Lock className="h-8 w-8" />
          <p className="text-sm">This chapter is locked</p>
        </div>
      )}

      {/* YouTube player */}
      {!isLocked && youtubeVideoId && (
        <YoutubePlayer courseId={courseId} chapterId={chapterId} onEnd={onEnd} />
      )}

      {/* Mux player (only if no YouTube video) */}
      {!isLocked && !youtubeVideoId && playbackId && (
        <>
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800 dark:bg-slate-200">
              <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            </div>
          )}
          <MuxPlayer
            title={title}
            className={cn(!isReady && 'hidden')}
            onCanPlay={() => setIsReady(true)}
            onEnded={onEnd}
            autoPlay
            playbackId={playbackId}
          />
        </>
      )}

      {/* No video at all */}
      {!isLocked && !youtubeVideoId && !playbackId && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 dark:bg-slate-200 text-secondary text-sm">
          No video available for this chapter
        </div>
      )}
    </div>
  );
};
