'use client';

import * as z from 'zod';
import { api } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Pencil, Sparkles } from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface SeoFormProps {
  initialData: {
    slug?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    title: string;
  };
  courseId: string;
}

const formSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only'),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional()
});

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}

export const SeoForm = ({ initialData, courseId }: SeoFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const toggleEdit = () => setIsEditing((current) => !current);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: initialData.slug || '',
      metaTitle: initialData.metaTitle || '',
      metaDescription: initialData.metaDescription || ''
    }
  });

  const { isSubmitting, isValid } = form.formState;
  const watchedMetaTitle = form.watch('metaTitle') || '';
  const watchedMetaDesc = form.watch('metaDescription') || '';

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await api.patch(`/courses/${courseId}`, values);
      toast.success('SEO settings updated');
      toggleEdit();
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  const handleGenerateSlug = () => {
    const slug = generateSlug(initialData.title);
    form.setValue('slug', slug, { shouldValidate: true });
  };

  return (
    <div className="mt-6 border bg-slate-100 dark:bg-slate-900 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        SEO & URL Settings
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing ? (
            <>Cancel</>
          ) : (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </>
          )}
        </Button>
      </div>
      {!isEditing && (
        <div className="space-y-2 mt-2">
          <div>
            <span className="text-xs font-medium text-muted-foreground">URL Slug: </span>
            <span className="text-sm">
              {initialData.slug ? `/courses/${initialData.slug}` : 'Not set'}
            </span>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground">Meta Title: </span>
            <span className="text-sm italic text-muted-foreground">
              {initialData.metaTitle || 'Not set (uses course title)'}
            </span>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground">Meta Description: </span>
            <span className="text-sm italic text-muted-foreground">
              {initialData.metaDescription || 'Not set (uses course description)'}
            </span>
          </div>
        </div>
      )}
      {isEditing && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        disabled={isSubmitting}
                        placeholder="e.g. cybersecurity-50-day-challenge"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateSlug}
                      className="shrink-0"
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Auto
                    </Button>
                  </div>
                  <FormDescription>Public URL: /courses/{field.value || '...'}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="metaTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Meta Title{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({watchedMetaTitle.length}/60 recommended)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      placeholder="Custom page title for search engines"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Leave empty to use the course title</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="metaDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Meta Description{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({watchedMetaDesc.length}/160 recommended)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={isSubmitting}
                      placeholder="Brief description for search engine results"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Leave empty to use the course description</FormDescription>
                  <FormMessage />
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
