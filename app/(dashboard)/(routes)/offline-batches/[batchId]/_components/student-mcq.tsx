'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StudentFeedbackForm } from './student-feedback-form';
import { useRouter } from 'next/navigation';

interface McqQuestion {
  id: string;
  body: string;
  options: string[];
}

interface StudentMcqProps {
  batchId: string;
  itemId: string;
  mcqId: string;
  title: string;
  questions: McqQuestion[];
  shuffleMap: number[];
  alreadySubmitted: boolean;
  previousScore?: number;
  total: number;
  hasFeedback: boolean;
}

export function StudentMcq({
  batchId,
  itemId,
  mcqId,
  title,
  questions,
  shuffleMap,
  alreadySubmitted,
  previousScore,
  total,
  hasFeedback: initialHasFeedback
}: StudentMcqProps) {
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(
    alreadySubmitted && previousScore !== undefined ? { score: previousScore, total } : null
  );
  const [hasFeedback, setHasFeedback] = useState(initialHasFeedback);
  const router = useRouter();

  const allAnswered = questions.length > 0 && Object.keys(selected).length === questions.length;

  const handleSubmit = async () => {
    if (!allAnswered) {
      toast.error('Answer all questions before submitting');
      return;
    }
    const answers = questions.map((_, i) => selected[i] ?? 0);
    try {
      setSubmitting(true);
      const { data } = await axios.post(
        `/api/student/offline-batches/${batchId}/sessions/${itemId}/mcq`,
        { answers, shuffleMap }
      );
      setResult({ score: data.score, total: data.total });
      // Refresh to update leaderboard and gamification stats
      router.refresh();
      toast.success('MCQ submitted!');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        toast.error(err.response.data?.error ?? 'Something went wrong');
      } else {
        toast.error('Something went wrong');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    if (!hasFeedback) {
      return (
        <div className="space-y-6">
          <div className="border rounded-lg p-4 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="font-semibold text-sm">MCQ Submitted! One last step...</span>
          </div>
          <StudentFeedbackForm
            batchId={batchId}
            itemId={itemId}
            onSuccess={() => {
              setHasFeedback(true);
              // Refresh to pull updated leaderboard after feedback
              router.refresh();
            }}
          />
        </div>
      );
    }

    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <span className="font-semibold text-sm">{title} — Submitted</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Your score:{' '}
          <span className="font-bold text-foreground">
            {result.score} / {result.total}
          </span>{' '}
          <span className={cn('font-medium', pct >= 70 ? 'text-emerald-600' : 'text-orange-500')}>
            ({pct}%)
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-amber-500" />
        <span className="font-semibold text-sm">{title}</span>
        <span className="text-xs text-muted-foreground ml-auto">{questions.length} questions</span>
      </div>

      <div className="space-y-5">
        {questions.map((q, displayIdx) => (
          <div key={q.id} className="space-y-2">
            <p className="text-sm font-medium">
              {displayIdx + 1}. {q.body}
            </p>
            <div className="space-y-1.5">
              {q.options.map((opt, optIdx) => (
                <label
                  key={optIdx}
                  htmlFor={`q${displayIdx}-opt${optIdx}`}
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-md border text-sm cursor-pointer transition-colors',
                    selected[displayIdx] === optIdx
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <input
                    id={`q${displayIdx}-opt${optIdx}`}
                    type="radio"
                    name={`question-${displayIdx}`}
                    checked={selected[displayIdx] === optIdx}
                    onChange={() => setSelected((p) => ({ ...p, [displayIdx]: optIdx }))}
                    className="accent-primary"
                  />
                  <span>
                    {String.fromCharCode(65 + optIdx)}. {opt}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        id={`submit-mcq-${mcqId}`}
        onClick={handleSubmit}
        disabled={submitting || !allAnswered}
        className="w-full sm:w-auto"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Submit MCQ ({Object.keys(selected).length}/{questions.length} answered)
      </Button>
    </div>
  );
}
