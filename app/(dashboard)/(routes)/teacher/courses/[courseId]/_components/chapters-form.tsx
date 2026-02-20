'use client';

import * as z from 'zod';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, PlusCircle, Video, Youtube, FileText, CheckCircle2, Code2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { type Chapter, type Course } from '@prisma/client';

import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ChaptersList } from './chapters-list';

type ContentType = 'VIDEO_MUX' | 'VIDEO_YOUTUBE' | 'TEXT' | 'HTML_EMBED' | 'PDF_DOCUMENT';

interface ContentTypeOption {
  value: ContentType;
  label: string;
  description: string;
  icon: React.ElementType;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  {
    value: 'VIDEO_MUX',
    label: 'Recorded Video',
    description: 'Upload a pre-recorded MP4 or video file. Optimised for adaptive streaming.',
    icon: Video
  },
  {
    value: 'VIDEO_YOUTUBE',
    label: 'YouTube Video',
    description: 'Embed an existing YouTube video using a URL or video ID.',
    icon: Youtube
  },
  {
    value: 'TEXT',
    label: 'Text & Formatting',
    description: 'Write formatted notes, articles or instructions using a rich-text editor.',
    icon: FileText
  },
  {
    value: 'HTML_EMBED',
    label: 'HTML Embed',
    description: 'Write custom HTML/CSS to create dynamic, interactive content rendered live.',
    icon: Code2
  },
  {
    value: 'PDF_DOCUMENT',
    label: 'PDF Document',
    description:
      'Upload a PDF file (max 16 MB). Students view it in-platform with zoom and fullscreen.',
    icon: FileText
  }
];

interface ChaptersFormProps {
  initialData: Course & { chapters: Chapter[] };
  courseId: string;
  moduleId?: string;
}

const titleSchema = z.object({ title: z.string().min(1) });

export const ChaptersForm = ({ initialData, courseId, moduleId }: ChaptersFormProps) => {
  // Step 0 = hidden, Step 1 = type picker, Step 2 = title input
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selectedType, setSelectedType] = useState<ContentType>('VIDEO_MUX');
  const [isUpdating, setIsUpdating] = useState(false);

  const router = useRouter();

  const form = useForm<z.infer<typeof titleSchema>>({
    resolver: zodResolver(titleSchema),
    defaultValues: { title: '' }
  });

  const { isSubmitting, isValid } = form.formState;

  const onCancel = () => {
    setStep(0);
    setSelectedType('VIDEO_MUX');
    form.reset();
  };

  const onTypeNext = () => setStep(2);

  const onSubmit = async (values: z.infer<typeof titleSchema>) => {
    try {
      const res = await axios.post(`/api/courses/${courseId}/chapters`, {
        ...values,
        moduleId: moduleId || null,
        contentType: selectedType
      });
      toast.success('Chapter created');
      // Navigate directly to the new chapter edit page
      router.push(`/teacher/courses/${courseId}/chapters/${res.data.id}`);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  const onReorder = async (updateData: { id: string; position: number }[]) => {
    try {
      setIsUpdating(true);
      await axios.put(`/api/courses/${courseId}/chapters/reorder`, {
        list: updateData.map((item) => ({ ...item, moduleId: moduleId || null }))
      });
      toast.success('Chapters reordered');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsUpdating(false);
    }
  };

  const onEdit = (id: string) => {
    router.push(`/teacher/courses/${courseId}/chapters/${id}`);
  };

  return (
    <div className="relative mt-6 border bg-slate-100 rounded-md p-4 dark:bg-gray-800">
      {isUpdating && (
        <div className="absolute h-full w-full bg-slate-500/20 top-0 right-0 rounded-md flex items-center justify-center">
          <Loader2 className="animate-spin h-6 w-6 text-sky-700" />
        </div>
      )}

      {/* Header */}
      <div className="font-medium flex items-center justify-between">
        Course chapters
        {step === 0 ? (
          <Button onClick={() => setStep(1)} variant="ghost">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add a chapter
          </Button>
        ) : (
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
        )}
      </div>

      {/* Step 1: Content Type Picker */}
      {step === 1 && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            What type of content is this chapter?
          </p>
          <div className="grid gap-3">
            {CONTENT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={cn(
                    'flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-all',
                    'hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20',
                    isSelected
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                      isSelected
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          isSelected
                            ? 'text-sky-700 dark:text-sky-300'
                            : 'text-slate-700 dark:text-slate-200'
                        )}
                      >
                        {type.label}
                      </p>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-sky-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {type.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={onTypeNext} type="button">
              Next →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Title Input */}
      {step === 2 && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            Give this{' '}
            <span className="text-sky-600 font-semibold">
              {CONTENT_TYPES.find((t) => t.value === selectedType)?.label}
            </span>{' '}
            chapter a title:
          </p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        autoFocus
                        disabled={isSubmitting}
                        placeholder="e.g. 'Introduction to the course'"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" type="button" onClick={() => setStep(1)}>
                  ← Back
                </Button>
                <Button disabled={!isValid || isSubmitting} type="submit">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create chapter'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      {/* Chapter list */}
      {step === 0 && (
        <div
          className={cn('text-sm mt-2', !initialData.chapters.length && 'text-slate-500 italic')}
        >
          {!initialData.chapters.length && 'No chapters'}
          <ChaptersList onEdit={onEdit} onReorder={onReorder} items={initialData.chapters || []} />
        </div>
      )}
      {step === 0 && (
        <p className="text-xs text-muted-foreground mt-4">Drag and drop to reorder the chapters</p>
      )}
    </div>
  );
};

export default ChaptersForm;
