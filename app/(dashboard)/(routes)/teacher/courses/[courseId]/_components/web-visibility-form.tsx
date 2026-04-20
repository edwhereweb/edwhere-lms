'use client';

import * as z from 'zod';
import { api } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { Form, FormControl, FormDescription, FormField, FormItem } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Course } from '@prisma/client';

interface WebVisibilityFormProps {
  initialData: Course;
  courseId: string;
}

const formSchema = z.object({
  isWebVisible: z.boolean().default(true)
});

export const WebVisibilityForm = ({ initialData, courseId }: WebVisibilityFormProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const toggleEdit = () => setIsEditing((current) => !current);

  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isWebVisible: (initialData as unknown as { isWebVisible: boolean })?.isWebVisible ?? true
    }
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await api.patch(`/courses/${courseId}`, values);
      toast.success('Course updated');
      toggleEdit();
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4 dark:bg-gray-800">
      <div className="font-medium flex items-center justify-between">
        Course web visibility
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing ? (
            <>Cancel</>
          ) : (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit visibility
            </>
          )}
        </Button>
      </div>
      {!isEditing && (
        <p className="text-sm mt-2">
          {(initialData as unknown as { isWebVisible: boolean }).isWebVisible ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              Visible on public web directory
            </span>
          ) : (
            <span className="text-slate-500 italic">Hidden from public web directory</span>
          )}
        </p>
      )}
      {isEditing && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="isWebVisible"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormDescription className="text-sm text-slate-700 dark:text-slate-300">
                      If checked, this course will appear in the public course directory. Uncheck it
                      to hide the course so only enrolled students can access it.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <div className="flex items-center gap-x-2">
              <Button disabled={!isValid || isSubmitting} type="submit">
                Save
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};
