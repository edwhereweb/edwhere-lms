'use client';

import * as z from 'zod';
import { api } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Pencil, Loader2, ListChecks } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Chapter } from '@prisma/client';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { createQuizSchema } from '@/lib/validations';

interface ChapterEvaluationFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData: Chapter & { quiz: any };
  courseId: string;
  chapterId: string;
}

export const ChapterEvaluationForm = ({
  initialData,
  courseId,
  chapterId
}: ChapterEvaluationFormProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const toggleEdit = () => setIsEditing((current) => !current);
  const router = useRouter();

  const form = useForm<z.infer<typeof createQuizSchema>>({
    resolver: zodResolver(createQuizSchema),
    defaultValues: {
      isGraded: initialData.quiz?.isGraded ?? false,
      timeLimit: initialData.quiz?.timeLimit ?? null,
      randomize: initialData.quiz?.randomize ?? false,
      maxAttempts: initialData.quiz?.maxAttempts ?? 1,
      maxTabSwitches: initialData.quiz?.maxTabSwitches ?? null,
      passScore: initialData.quiz?.passScore ?? null
    }
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values: z.infer<typeof createQuizSchema>) => {
    try {
      await api.patch(`/courses/${courseId}/chapters/${chapterId}/quiz`, values);
      toast.success('Quiz settings updated');
      toggleEdit();
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="mt-6 border bg-slate-100 dark:bg-slate-800 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <ListChecks className="h-5 w-5 text-indigo-500" />
          Quiz / Evaluation Settings
        </div>
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing ? (
            <>Cancel</>
          ) : (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Settings
            </>
          )}
        </Button>
      </div>

      {!isEditing && (
        <div className="text-sm mt-2 space-y-2 text-slate-600 dark:text-slate-300">
          <p>
            <span className="font-semibold">Type:</span>{' '}
            {initialData.quiz?.isGraded ? 'Graded Evaluation' : 'Practice Test'}
          </p>
          <p>
            <span className="font-semibold">Time Limit:</span>{' '}
            {initialData.quiz?.timeLimit ? `${initialData.quiz.timeLimit} minutes` : 'No Limit'}
          </p>
          <p>
            <span className="font-semibold">Randomize Questions:</span>{' '}
            {initialData.quiz?.randomize ? 'Yes' : 'No'}
          </p>
          <p>
            <span className="font-semibold">Max Attempts:</span>{' '}
            {initialData.quiz?.maxAttempts || 1}
          </p>
          <p>
            <span className="font-semibold">Max Tab Switches (Anti-cheat):</span>{' '}
            {initialData.quiz?.maxTabSwitches ?? 'Disabled'}
          </p>
          <p>
            <span className="font-semibold">Pass Score:</span>{' '}
            {initialData.quiz?.passScore != null ? `${initialData.quiz.passScore}%` : 'Not Set'}
          </p>
        </div>
      )}

      {isEditing && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="isGraded"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Graded Evaluation</FormLabel>
                    <FormDescription>
                      If checked, this test will factor into the user&apos;s final course score and
                      cannot be easily retaken without depleting attempts.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="timeLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Limit (Minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        disabled={isSubmitting}
                        placeholder="e.g. 30 (Leave empty for no limit)"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseInt(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxAttempts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Allowed Attempts</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        disabled={isSubmitting}
                        placeholder="e.g. 1"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseInt(e.target.value) : 1)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxTabSwitches"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anti-Cheat: Max Tab Switches</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        disabled={isSubmitting}
                        placeholder="e.g. 3 (Leave empty to disable)"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseInt(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Warnings issued if they navigate away from the test.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pass Score (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        disabled={isSubmitting}
                        placeholder="e.g. 60 (Leave empty for no threshold)"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum percentage required to pass the evaluation.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="randomize"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Randomize Question Order</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex items-center gap-x-2">
              <Button disabled={!isValid || isSubmitting} type="submit">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};
