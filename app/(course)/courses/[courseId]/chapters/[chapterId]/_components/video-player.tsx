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
  onComplete?: (nextChapterId: string) => void;
}

const TS_KEY = (chapterId: string) => `edwhere:vts:${chapterId}`;
const SAVE_DEBOUNCE_MS = 5000;
// Don't restore if within the last 30s of the video (assume they finished it)
const NEAR_END_BUFFER = 30;

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
            sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
            referrerPolicy="strict-origin"
            title="Chapter video"
          />
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
  title,
  onComplete
}: VideoPlayerProps) => {
  const [isReady, setIsReady] = useState(false);
  const [savedTime, setSavedTime] = useState<number | null>(null);
  const [resumeToastShown, setResumeToastShown] = useState(false);
  const router = useRouter();
  const confetti = useConfettiStore();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMarkedComplete = useRef(false);

  // Load saved timestamp on mount (Mux only)
  useEffect(() => {
    if (!playbackId || youtubeVideoId) return;
    const raw = localStorage.getItem(TS_KEY(chapterId));
    if (raw) {
      const ts = parseFloat(raw);
      if (!isNaN(ts) && ts > 10) setSavedTime(ts);
    }
  }, [chapterId, playbackId, youtubeVideoId]);

  const onEnd = async () => {
    try {
      if (completeOnEnd && !hasMarkedComplete.current) {
        await axios.put(`/api/courses/${courseId}/chapters/${chapterId}/progress`, {
          isCompleted: true
        });
      }

      if (completeOnEnd) {
        // Clear saved timestamp on successful completion
        localStorage.removeItem(TS_KEY(chapterId));

        if (!nextChapterId) {
          confetti.onOpen();
          toast.success('Course complete! 🎉');
        } else if (onComplete) {
          toast.success('Progress updated');
          onComplete(nextChapterId);
        } else {
          toast.success('Progress updated');
          router.push(`/courses/${courseId}/chapters/${nextChapterId}`);
        }

        router.refresh();
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  const handleTimeUpdate = (e: Event) => {
    const video = e.target as HTMLVideoElement;
    if (!video || isNaN(video.currentTime) || isNaN(video.duration)) return;

    const duration = video.duration;
    const current = video.currentTime;

    // Passive tracking: Mark complete at 90% threshold silently
    if (completeOnEnd && !hasMarkedComplete.current && duration > 0 && current / duration >= 0.9) {
      hasMarkedComplete.current = true;
      axios
        .put(`/api/courses/${courseId}/chapters/${chapterId}/progress`, {
          isCompleted: true
        })
        .then(() => {
          toast.success('Chapter completed! Keep watching or continue.', { duration: 4000 });
          router.refresh();
        })
        .catch(() => {
          hasMarkedComplete.current = false; // Allow retry if failed
        });
    }

    // Debounce saves to every SAVE_DEBOUNCE_MS ms
    if (saveTimerRef.current) return;
    saveTimerRef.current = setTimeout(() => {
      // Don't save if near the end — let the onEnd handler clear it
      if (duration - current > NEAR_END_BUFFER) {
        localStorage.setItem(TS_KEY(chapterId), String(Math.floor(current)));
      }
      saveTimerRef.current = null;
    }, SAVE_DEBOUNCE_MS);
  };

  const handleCanPlay = (e: Event) => {
    const video = e.target as HTMLVideoElement;
    setIsReady(true);

    if (savedTime && video && !resumeToastShown) {
      const duration = video.duration;
      // Only restore if the saved time is valid and not near the end
      if (!isNaN(duration) && duration - savedTime > NEAR_END_BUFFER) {
        video.currentTime = savedTime;
        const minutes = Math.floor(savedTime / 60);
        const seconds = Math.floor(savedTime % 60);
        toast(`▶ Resumed from ${minutes}:${seconds.toString().padStart(2, '0')}`, {
          duration: 3000,
          icon: '⏩'
        });
      }
      setResumeToastShown(true);
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
            onCanPlay={handleCanPlay as unknown as EventListener}
            onTimeUpdate={handleTimeUpdate as unknown as EventListener}
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
