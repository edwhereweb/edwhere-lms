'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CheckCircle, ExternalLink, Send, Pencil, Clock, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const GOOGLE_DRIVE_REGEX =
  /^https:\/\/(drive|docs|sheets|slides|forms|sites|jamboard)\.google\.com\/.+/;

type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface ProjectSubmission {
  id: string;
  driveUrl: string;
  status: SubmissionStatus;
  reviewNote?: string | null;
  updatedAt: string;
}

interface ProjectSubmissionFormProps {
  courseId: string;
  chapterId: string;
  initialSubmission: ProjectSubmission | null;
  isLocked: boolean;
}

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  PENDING: {
    label: 'Pending Review',
    icon: Clock,
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle,
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  },
  REJECTED: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }
};

export const ProjectSubmissionForm = ({
  courseId,
  chapterId,
  initialSubmission,
  isLocked
}: ProjectSubmissionFormProps) => {
  const router = useRouter();
  const isApproved = initialSubmission?.status === 'APPROVED';
  const isRejected = initialSubmission?.status === 'REJECTED';

  const [isEditing, setIsEditing] = useState(!initialSubmission || isRejected);
  const [url, setUrl] = useState(initialSubmission?.driveUrl ?? '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (val: string): string => {
    if (!val.trim()) return 'Please enter a link.';
    try {
      new URL(val);
    } catch {
      return 'Must be a valid URL (starting with https://).';
    }
    if (!GOOGLE_DRIVE_REGEX.test(val))
      return 'Only Google Drive, Docs, Sheets, Slides, or Forms links are accepted.';
    return '';
  };

  const handleSubmit = async () => {
    const err = validate(url);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await axios.post(`/api/courses/${courseId}/chapters/${chapterId}/project-submission`, {
        driveUrl: url
      });
      toast.success(initialSubmission ? 'Submission updated!' : 'Submission saved!');
      setIsEditing(false);
      router.refresh();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) && e.response?.data?.message
          ? e.response.data.message
          : 'Something went wrong. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLocked) {
    return (
      <div className="mt-6 p-4 border border-dashed rounded-xl text-center text-muted-foreground text-sm">
        Purchase the course to submit your work.
      </div>
    );
  }

  const status = initialSubmission?.status as SubmissionStatus | undefined;
  const statusConfig = status ? STATUS_CONFIG[status] : null;
  const StatusIcon = statusConfig?.icon;

  return (
    <div className="mt-6 border rounded-xl bg-orange-50 dark:bg-orange-950/20 p-5">
      <h3 className="font-semibold text-base mb-1 text-orange-800 dark:text-orange-300">
        Submit Your Work
      </h3>
      <p className="text-xs text-orange-700 dark:text-orange-400 mb-4">
        Upload your work to Google Drive (or Docs / Sheets / Slides / Forms) and paste the shareable
        link below. Make sure the link is set to &quot;Anyone with the link can view&quot;.
      </p>

      {/* Status badge */}
      {status && statusConfig && StatusIcon && (
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4 ${statusConfig.className}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {statusConfig.label}
        </div>
      )}

      {/* Reviewer rejection note */}
      {isRejected && initialSubmission?.reviewNote && (
        <div className="mb-4 text-xs bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <span className="font-semibold text-red-700 dark:text-red-400">
            Feedback from instructor:{' '}
          </span>
          <span className="text-red-600 dark:text-red-300">{initialSubmission.reviewNote}</span>
        </div>
      )}

      {/* Approved — read only */}
      {isApproved && !isEditing ? (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <a
            href={initialSubmission!.driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline truncate flex items-center gap-1"
          >
            View submission
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </div>
      ) : !isEditing ? (
        /* Pending — show link with update option */
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <a
              href={initialSubmission!.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline truncate flex items-center gap-1"
            >
              View submission
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="shrink-0 gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Update link
          </Button>
        </div>
      ) : (
        /* Edit / submit form */
        <div className="space-y-3">
          {isRejected && (
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              ↩ Update your link and resubmit — the instructor will review it again.
            </p>
          )}
          <div>
            <Input
              placeholder="https://drive.google.com/..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(validate(e.target.value));
              }}
              className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
              disabled={isSubmitting}
            />
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={isSubmitting} size="sm" className="gap-1.5">
              {isSubmitting ? (
                'Submitting…'
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {initialSubmission ? 'Resubmit' : 'Submit'}
                </>
              )}
            </Button>
            {initialSubmission && !isRejected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setUrl(initialSubmission.driveUrl);
                  setError('');
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
