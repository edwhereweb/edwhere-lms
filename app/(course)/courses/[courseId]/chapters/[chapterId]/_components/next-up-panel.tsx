'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NextUpPanelProps {
  courseId: string;
  nextChapterId: string;
  nextChapterTitle: string;
  onDismiss: () => void;
}

const COUNTDOWN_SECONDS = 5;

export function NextUpPanel({
  courseId,
  nextChapterId,
  nextChapterTitle,
  onDismiss
}: NextUpPanelProps) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const navigate = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    router.push(`/courses/${courseId}/chapters/${nextChapterId}`);
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          navigate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // navigate is stable — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = ((COUNTDOWN_SECONDS - secondsLeft) / COUNTDOWN_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Dismiss */}
        <button
          type="button"
          onClick={() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            onDismiss();
          }}
          className="absolute top-4 right-4 rounded-md p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Stay on this chapter"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-neutral-800 dark:text-neutral-100">
              Chapter complete! 🎉
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Nice work, keep the momentum going.
            </p>
          </div>
        </div>

        {/* Next chapter */}
        <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
            Up next
          </p>
          <p className="font-medium text-sm text-neutral-800 dark:text-neutral-100 line-clamp-2">
            {nextChapterTitle}
          </p>
        </div>

        {/* Countdown bar */}
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-[#F80602] rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-neutral-400 text-center">Auto-advancing in {secondsLeft}s…</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              if (intervalRef.current) clearInterval(intervalRef.current);
              onDismiss();
            }}
          >
            Stay here
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-1.5 text-xs bg-[#F80602] hover:bg-red-700 text-white"
            onClick={navigate}
          >
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
