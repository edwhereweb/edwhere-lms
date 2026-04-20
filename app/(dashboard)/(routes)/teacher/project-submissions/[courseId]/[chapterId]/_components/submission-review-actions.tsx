'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface SubmissionReviewActionsProps {
  submissionId: string;
  courseId: string;
  chapterId: string;
  currentStatus: string;
}

export const SubmissionReviewActions = ({
  submissionId,
  courseId,
  chapterId,
  currentStatus
}: SubmissionReviewActionsProps) => {
  const router = useRouter();
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [showNote, setShowNote] = useState(false);

  const review = async (status: 'APPROVED' | 'REJECTED') => {
    setLoading(status);
    try {
      await api.patch(`/teacher/project-submissions/${courseId}/${chapterId}/${submissionId}`, {
        status,
        reviewNote: reviewNote.trim() || undefined
      });
      toast.success(status === 'APPROVED' ? 'Submission approved!' : 'Submission rejected.');
      router.refresh();
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setLoading(null);
    }
  };

  if (currentStatus !== 'PENDING') {
    return (
      <span
        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          currentStatus === 'APPROVED'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}
      >
        {currentStatus === 'APPROVED' ? '✅ Approved' : '❌ Rejected'}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      {showNote && (
        <Textarea
          placeholder="Optional note to student (shown if rejected)…"
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          rows={2}
          className="text-xs w-64 resize-none"
        />
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNote((s) => !s)}
          className="text-xs text-muted-foreground"
        >
          {showNote ? 'Hide note' : 'Add note'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          disabled={!!loading}
          onClick={() => review('REJECTED')}
        >
          {loading === 'REJECTED' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          Reject
        </Button>
        <Button
          size="sm"
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={!!loading}
          onClick={() => review('APPROVED')}
        >
          {loading === 'APPROVED' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5" />
          )}
          Approve
        </Button>
      </div>
    </div>
  );
};
