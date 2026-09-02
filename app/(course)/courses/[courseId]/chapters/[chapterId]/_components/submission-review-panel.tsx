'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Loader2, Download, FileSpreadsheet, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubmissionReviewPanelProps {
  courseId: string;
  chapterId: string;
  attemptId: string;
  onClose: () => void;
}

interface ReviewOption {
  index: number;
  text: string;
  isSelected: boolean;
  isCorrect: boolean;
}

interface ReviewQuestion {
  id: string;
  questionNumber: number;
  body: string;
  options: ReviewOption[];
  isCorrect: boolean;
  isAnswered: boolean;
}

interface ReviewPayload {
  summary: {
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    score: number | null;
  };
  questions: ReviewQuestion[];
}

export const SubmissionReviewPanel = ({
  courseId,
  chapterId,
  attemptId,
  onClose
}: SubmissionReviewPanelProps) => {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [review, setReview] = useState<ReviewPayload | null>(null);
  const baseUrl = `/api/courses/${courseId}/chapters/${chapterId}/quiz/attempts/${attemptId}/review`;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(baseUrl);
        setReview(res.data);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        if (error.response?.status === 403) {
          setForbidden(true);
        } else {
          toast.error('Something went wrong');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      const res = await axios.get(`${baseUrl}/export?format=${format}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quiz-review-${attemptId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-md shadow-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Submission Report</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {!loading && forbidden && (
          <div className="text-center p-8 text-slate-600 dark:text-slate-300">
            Submission report is not enabled for this quiz.
          </div>
        )}

        {!loading && !forbidden && review && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-center">
              <div className="border rounded-md p-3">
                <p className="text-2xl font-bold">
                  {review.summary.score != null ? `${review.summary.score}%` : '—'}
                </p>
                <p className="text-xs text-slate-500">Score</p>
              </div>
              <div className="border rounded-md p-3">
                <p className="text-2xl font-bold">{review.summary.totalQuestions}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
              <div className="border rounded-md p-3 bg-emerald-50 dark:bg-emerald-950">
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {review.summary.correctCount}
                </p>
                <p className="text-xs text-slate-500">Correct</p>
              </div>
              <div className="border rounded-md p-3 bg-rose-50 dark:bg-rose-950">
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                  {review.summary.wrongCount}
                </p>
                <p className="text-xs text-slate-500">Wrong</p>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download Excel
              </Button>
            </div>

            <div className="space-y-4">
              {review.questions.map((q) => (
                <div
                  key={q.id}
                  className={cn(
                    'border rounded-md p-4',
                    q.isCorrect
                      ? 'border-emerald-200 dark:border-emerald-800'
                      : 'border-rose-200 dark:border-rose-800'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">
                      {q.questionNumber}. {q.body}
                    </p>
                    {q.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                    )}
                  </div>
                  <ul className="mt-3 space-y-1">
                    {q.options.map((opt) => (
                      <li
                        key={opt.index}
                        className={cn(
                          'text-sm rounded px-2 py-1',
                          opt.isCorrect &&
                            'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200',
                          opt.isSelected &&
                            !opt.isCorrect &&
                            'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200'
                        )}
                      >
                        {opt.isSelected ? '● ' : '○ '}
                        {opt.text}
                        {opt.isCorrect ? ' (Correct Answer)' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
