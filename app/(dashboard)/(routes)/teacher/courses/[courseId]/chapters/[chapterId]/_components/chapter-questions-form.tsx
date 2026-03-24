'use client';

import axios from 'axios';
import { UploadCloud, PlusCircle, Loader2, List, Trash2, Pencil } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';

import { Button } from '@/components/ui/button';

interface ChapterQuestionsFormProps {
  courseId: string;
  chapterId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialQuestions: any[];
}

export const ChapterQuestionsForm = ({
  courseId,
  chapterId,
  initialQuestions
}: ChapterQuestionsFormProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUpdating(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Format expected: Question, Type, Option A, Option B, Option C, Option D, Correct Option
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsedQuestions = results.data.map((row: any) => {
            const body = row['Question'] || row['question'] || '';
            const typeStr = (row['Type'] || row['type'] || 'SINGLE').toUpperCase();
            const isMultipleChoice = typeStr === 'MULTIPLE';
            
            // Build options
            const options = [];
            if (row['Option A']) options.push(row['Option A']);
            if (row['Option B']) options.push(row['Option B']);
            if (row['Option C']) options.push(row['Option C']);
            if (row['Option D']) options.push(row['Option D']);

            // Parse Correct Option (e.g. A, C -> [0, 2])
            const correctStr = String(row['Correct Option'] || row['correct option'] || '');
            const correctChars = correctStr.split(',').map(s => s.trim().toUpperCase());
            const correctOptions: number[] = [];
            correctChars.forEach(char => {
              if (char === 'A' && options.length > 0) correctOptions.push(0);
              if (char === 'B' && options.length > 1) correctOptions.push(1);
              if (char === 'C' && options.length > 2) correctOptions.push(2);
              if (char === 'D' && options.length > 3) correctOptions.push(3);
            });

            return {
              body,
              options,
              correctOptions,
              isMultipleChoice,
              imageUrl: null
            };
          });

          // Limit to 200
          const toUpload = parsedQuestions.slice(0, 200);
          if (parsedQuestions.length > 200) {
            toast.success(`Limited to 200 questions maximum.`);
          }

          if (toUpload.length === 0) {
             toast.error('No valid questions found in CSV.');
             return;
          }

          await axios.post(`/api/courses/${courseId}/chapters/${chapterId}/questions/bulk`, {
            questions: toUpload
          });
          
          toast.success(`${toUpload.length} questions imported successfully`);
          router.refresh();
        } catch (error) {
          toast.error('Failed to import questions. Check your CSV format.');
          console.error(error);
        } finally {
          setIsUpdating(false);
          // reset target
          e.target.value = '';
        }
      },
      error: () => {
        toast.error('Failed to parse CSV file');
        setIsUpdating(false);
      }
    });
  };

  const onDelete = async (questionId: string) => {
    try {
      setIsUpdating(true);
      await axios.delete(`/api/courses/${courseId}/chapters/${chapterId}/questions/${questionId}`);
      toast.success('Question deleted');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mt-6 border bg-slate-100 dark:bg-slate-800 rounded-md p-4">
      {isUpdating && (
        <div className="absolute h-full w-full bg-slate-500/20 top-0 right-0 rounded-m flex items-center justify-center z-10">
          <Loader2 className="animate-spin h-6 w-6 text-sky-700" />
        </div>
      )}
      <div className="font-medium flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <List className="h-5 w-5 text-indigo-500" />
          Quiz Questions
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="relative cursor-pointer">
            <input
              type="file"
              accept=".csv"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              disabled={isUpdating}
            />
            <UploadCloud className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => router.push(`/teacher/courses/${courseId}/chapters/${chapterId}/questions/new`)} size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add manually
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mt-2 mb-4">
        CSV Columns: <code>Question, Type, Option A, Option B, Option C, Option D, Correct Option</code>. Type is SINGLE or MULTIPLE. Correct Option is A/B/C/D or A, C for multiple. Max 200 questions.
      </div>

      {!initialQuestions.length && (
        <div className="text-sm mt-4 text-slate-500 italic">
          No questions exist yet.
        </div>
      )}

      {initialQuestions.length > 0 && (
        <div className="mt-4 space-y-3">
          {initialQuestions.map((q, index) => (
            <div key={q.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-md flex justify-between items-start">
              <div>
                <p className="text-sm font-medium">Q{index + 1}. {q.body}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {q.options.length} options | {q.isMultipleChoice ? 'Multiple-Choice' : 'Single-Choice'} | Answer: {q.correctOptions.map((n: number) => String.fromCharCode(65 + n)).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-x-2">
                 <Button onClick={() => router.push(`/teacher/courses/${courseId}/chapters/${chapterId}/questions/${q.id}`)} variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                   <Pencil className="h-4 w-4" />
                 </Button>
                 <Button onClick={() => onDelete(q.id)} variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 dark:hover:bg-rose-950">
                   <Trash2 className="h-4 w-4" />
                 </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
