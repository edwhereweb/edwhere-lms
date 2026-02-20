'use client';

import * as z from 'zod';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { Code2, Pencil, Eye } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { type Chapter } from '@prisma/client';

import { Button } from '@/components/ui/button';
import { HtmlCodeEditor } from '@/components/html-code-editor';
import { HtmlEmbedPreview } from '@/components/html-embed-preview';

interface ChapterHtmlFormProps {
  initialData: Chapter;
  courseId: string;
  chapterId: string;
}

const formSchema = z.object({
  htmlContent: z.string().min(1, 'HTML content is required')
});

export const ChapterHtmlForm = ({ initialData, courseId, chapterId }: ChapterHtmlFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const router = useRouter();

  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting, isValid }
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      htmlContent: (initialData as unknown as { htmlContent?: string }).htmlContent ?? ''
    }
  });

  const currentHtml = watch('htmlContent');

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await axios.patch(`/api/courses/${courseId}/chapters/${chapterId}`, values);
      toast.success('HTML content updated');
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  const savedHtml = (initialData as unknown as { htmlContent?: string }).htmlContent ?? '';

  return (
    <div className="mt-6 border bg-slate-100 dark:bg-slate-800 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4" />
          HTML Embed
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPreviewing((p) => !p)}
              type="button"
            >
              <Eye className="h-4 w-4 mr-1" />
              {isPreviewing ? 'Hide preview' : 'Preview'}
            </Button>
          )}
          <Button onClick={() => setIsEditing((p) => !p)} variant="ghost">
            {isEditing ? (
              <>Cancel</>
            ) : (
              <>
                <Pencil className="h-4 w-4 mr-2" />
                {savedHtml ? 'Edit HTML' : 'Add HTML'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Saved preview */}
      {!isEditing && (
        <>
          {savedHtml ? (
            <div className="mt-3 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-white">
              <HtmlEmbedPreview html={savedHtml} />
            </div>
          ) : (
            <p className="text-sm mt-2 text-slate-500 italic">No HTML content added yet.</p>
          )}
        </>
      )}

      {/* Editor */}
      {isEditing && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <Controller
            control={control}
            name="htmlContent"
            render={({ field }) => (
              <HtmlCodeEditor value={field.value} onChange={field.onChange} height="380px" />
            )}
          />

          {/* Live preview while editing */}
          {isPreviewing && currentHtml && (
            <div className="rounded-md overflow-hidden border border-sky-200 dark:border-sky-800 bg-white">
              <div className="px-3 py-1.5 bg-sky-50 dark:bg-sky-900/30 text-xs text-sky-600 dark:text-sky-400 font-medium border-b border-sky-200 dark:border-sky-800">
                Live Preview
              </div>
              <HtmlEmbedPreview html={currentHtml} />
            </div>
          )}

          <div className="flex items-center gap-x-2">
            <Button disabled={!isValid || isSubmitting} type="submit">
              Save
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
