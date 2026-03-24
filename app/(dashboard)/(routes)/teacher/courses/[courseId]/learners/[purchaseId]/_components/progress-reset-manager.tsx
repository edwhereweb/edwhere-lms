'use client';

import axios from 'axios';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  Circle,
  Loader2,
  RotateCcw,
  Video,
  FileText,
  CheckSquare,
  PenTool,
  Globe
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Chapter {
  id: string;
  title: string;
  isCompleted: boolean;
  contentType: string | null;
  attemptsCount?: number;
  maxAttempts?: number;
  hasProjectSubmission?: boolean;
}

interface ProgressResetManagerProps {
  courseId: string;
  purchaseId: string;
  chapters: Chapter[];
}

export const ProgressResetManager = ({
  courseId,
  purchaseId,
  chapters
}: ProgressResetManagerProps) => {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const onReset = async (chapterId: string) => {
    try {
      setLoadingId(chapterId);
      await axios.post(
        `/api/courses/${courseId}/learners/${purchaseId}/progress/${chapterId}/reset`
      );
      toast.success('Progress reset successfully');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoadingId(null);
    }
  };

  const getIcon = (type: string | null) => {
    switch (type) {
      case 'VIDEO_MUX':
      case 'VIDEO_YOUTUBE':
        return Video;
      case 'EVALUATION':
        return CheckSquare;
      case 'HANDS_ON_PROJECT':
        return PenTool;
      case 'HTML_EMBED':
        return Globe;
      default:
        return FileText;
    }
  };

  return (
    <div className="space-y-4">
      {chapters.map((chapter) => {
        const Icon = getIcon(chapter.contentType);
        const isLoading = loadingId === chapter.id;

        // Enable reset if completed OR has attempts OR has project submission
        const canReset =
          chapter.isCompleted ||
          (chapter.attemptsCount !== undefined && chapter.attemptsCount > 0) ||
          chapter.hasProjectSubmission;

        return (
          <div
            key={chapter.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-slate-900 shadow-sm"
          >
            <div className="flex items-center gap-x-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{chapter.title}</span>
                <div className="flex items-center gap-x-2 mt-1">
                  {chapter.isCompleted ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-x-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-slate-50 text-slate-500 border-slate-200 gap-x-1"
                    >
                      <Circle className="h-3 w-3 text-slate-300" />
                      Not Completed
                    </Badge>
                  )}
                  {chapter.contentType === 'EVALUATION' && (
                    <span className="text-xs text-slate-500 font-medium">
                      Attempts: {chapter.attemptsCount ?? 0} / {chapter.maxAttempts ?? '∞'}
                    </span>
                  )}
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {chapter.contentType?.replace('_', ' ') || 'Chapter'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-x-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!canReset || isLoading}
                onClick={() => onReset(chapter.id)}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-100"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 mr-2" />
                    Reset
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
