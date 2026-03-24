'use client';

import { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Flag, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface GamifiedSubmissionFormProps {
  courseId: string;
  chapterId: string;
  isCompleted: boolean;
  nextChapterId?: string;
}

export const GamifiedSubmissionForm = ({
  courseId,
  chapterId,
  isCompleted,
  nextChapterId
}: GamifiedSubmissionFormProps) => {
  const [flag, setFlag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  if (isCompleted) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button
          onClick={() => {
            if (nextChapterId) {
              router.push(`/courses/${courseId}/chapters/${nextChapterId}`);
            }
          }}
          disabled={!nextChapterId}
          className="bg-emerald-600 text-white hover:bg-emerald-700 w-full md:w-auto"
        >
          {nextChapterId ? 'Continue to Next Chapter' : 'Course Completed'}
        </Button>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag.trim()) return;

    try {
      setIsSubmitting(true);
      await axios.post(`/api/courses/${courseId}/chapters/${chapterId}/submit-flag`, {
        flag
      });

      toast.success('Correct! Chapter completed.');
      router.refresh();

      if (nextChapterId) {
        setTimeout(() => {
          router.push(`/courses/${courseId}/chapters/${nextChapterId}`);
        }, 1500);
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
      <h3 className="font-semibold text-lg flex items-center gap-2 mb-2 text-slate-800 dark:text-slate-200">
        <Flag className="h-5 w-5 text-[#6715FF]" />
        Submit your flag
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Find the secret flag in the interactive content above and submit it here to complete the lesson.
      </p>
      
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
        <Input
          disabled={isSubmitting}
          value={flag}
          onChange={(e) => setFlag(e.target.value)}
          placeholder="e.g. CTF{your_flag_here}"
          className="flex-1 bg-white dark:bg-slate-950"
          required
        />
        <Button 
          type="submit" 
          disabled={isSubmitting || !flag.trim()}
          className="bg-[#6715FF] hover:bg-[#5210CC] text-white min-w-[120px]"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Flag'}
        </Button>
      </form>
    </div>
  );
};
