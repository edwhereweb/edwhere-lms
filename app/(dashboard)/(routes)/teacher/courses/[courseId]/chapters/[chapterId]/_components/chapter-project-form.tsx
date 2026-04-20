'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Pencil, FileText, Code2, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Editor } from '@/components/editor';
import { Preview } from '@/components/preview';
import { HtmlCodeEditor } from '@/components/html-code-editor';
import { HtmlEmbedPreview } from '@/components/html-embed-preview';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';

type Mode = 'TEXT' | 'HTML';

const textSchema = z.object({ content: z.string().min(1, 'Task statement is required') });
const htmlSchema = z.object({ htmlContent: z.string().min(1, 'Task statement is required') });

interface ChapterProjectFormProps {
  initialData: {
    content?: string | null;
    htmlContent?: string | null;
  };
  courseId: string;
  chapterId: string;
}

export const ChapterProjectForm = ({
  initialData,
  courseId,
  chapterId
}: ChapterProjectFormProps) => {
  const router = useRouter();
  const hasHtml = !!(initialData as { htmlContent?: string | null }).htmlContent;

  // Mode persisted to whichever field has content; default TEXT
  const [mode, setMode] = useState<Mode>(hasHtml ? 'HTML' : 'TEXT');
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // ─── Text form ────────────────────────────────────────────────────────────
  const textForm = useForm<z.infer<typeof textSchema>>({
    resolver: zodResolver(textSchema),
    defaultValues: { content: initialData.content ?? '' }
  });

  // ─── HTML form ────────────────────────────────────────────────────────────
  const htmlForm = useForm<z.infer<typeof htmlSchema>>({
    resolver: zodResolver(htmlSchema),
    defaultValues: {
      htmlContent: (initialData as { htmlContent?: string | null }).htmlContent ?? ''
    }
  });

  const currentHtml = htmlForm.watch('htmlContent');

  // ─── Save ─────────────────────────────────────────────────────────────────
  const onSaveText = async (values: z.infer<typeof textSchema>) => {
    try {
      // Clear htmlContent when switching to text
      await api.patch(`/courses/${courseId}/chapters/${chapterId}`, {
        content: values.content,
        htmlContent: null
      });
      toast.success('Task statement saved');
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  const onSaveHtml = async (values: z.infer<typeof htmlSchema>) => {
    try {
      // Clear content when switching to HTML
      await api.patch(`/courses/${courseId}/chapters/${chapterId}`, {
        htmlContent: values.htmlContent,
        content: null
      });
      toast.success('Task statement saved');
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  // ─── Derived ──────────────────────────────────────────────────────────────
  const savedText = initialData.content ?? '';
  const savedHtml = (initialData as { htmlContent?: string | null }).htmlContent ?? '';
  const hasContent = mode === 'TEXT' ? !!savedText : !!savedHtml;

  return (
    <div className="mt-6 border bg-slate-100 dark:bg-slate-800 rounded-md p-4">
      {/* Header */}
      <div className="font-medium flex items-center justify-between">
        <span>Task Statement</span>
        <div className="flex items-center gap-2">
          {isEditing && mode === 'HTML' && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsPreviewing((p) => !p)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {isPreviewing ? 'Hide preview' : 'Preview'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsEditing((e) => !e);
              setIsPreviewing(false);
            }}
          >
            {isEditing ? (
              'Cancel'
            ) : (
              <>
                <Pencil className="h-4 w-4 mr-2" />
                {hasContent ? 'Edit' : 'Add'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mode toggle — only shown while editing */}
      {isEditing && (
        <div className="flex gap-2 mt-3 mb-4">
          {(['TEXT', 'HTML'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                mode === m
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-input hover:bg-accent'
              )}
            >
              {m === 'TEXT' ? (
                <>
                  <FileText className="h-3.5 w-3.5" /> Rich Text
                </>
              ) : (
                <>
                  <Code2 className="h-3.5 w-3.5" /> HTML
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Read view ── */}
      {!isEditing && (
        <div className={cn('mt-2 text-sm', !hasContent && 'text-slate-500 italic')}>
          {hasContent ? (
            mode === 'TEXT' ? (
              <Preview value={savedText} />
            ) : (
              <div className="rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-white">
                <HtmlEmbedPreview html={savedHtml} />
              </div>
            )
          ) : (
            'No task statement yet — click Edit to add one.'
          )}
        </div>
      )}

      {/* ── Text editor ── */}
      {isEditing && mode === 'TEXT' && (
        <Form {...textForm}>
          <form onSubmit={textForm.handleSubmit(onSaveText)} className="space-y-4 mt-2">
            <FormField
              control={textForm.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Editor {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              disabled={!textForm.formState.isValid || textForm.formState.isSubmitting}
              type="submit"
              size="sm"
            >
              {textForm.formState.isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </Form>
      )}

      {/* ── HTML editor ── */}
      {isEditing && mode === 'HTML' && (
        <form onSubmit={htmlForm.handleSubmit(onSaveHtml)} className="space-y-4 mt-2">
          <Controller
            control={htmlForm.control}
            name="htmlContent"
            render={({ field }) => (
              <HtmlCodeEditor value={field.value} onChange={field.onChange} height="340px" />
            )}
          />
          {isPreviewing && currentHtml && (
            <div className="rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white">
              <div className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900/30 text-xs text-neutral-600 dark:text-neutral-400 font-medium border-b border-neutral-200 dark:border-neutral-800">
                Live Preview
              </div>
              <HtmlEmbedPreview html={currentHtml} />
            </div>
          )}
          <Button
            disabled={!htmlForm.formState.isValid || htmlForm.formState.isSubmitting}
            type="submit"
            size="sm"
          >
            {htmlForm.formState.isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </form>
      )}
    </div>
  );
};
