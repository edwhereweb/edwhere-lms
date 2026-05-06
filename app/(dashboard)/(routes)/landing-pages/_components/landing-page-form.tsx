'use client';

import * as z from 'zod';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { landingPageSchema } from '@/lib/validations';
import { LandingPage } from './landing-page-columns';
import { Loader2 } from 'lucide-react';

interface LandingPageFormProps {
  initialData?: LandingPage | null;
}

export const LandingPageForm = ({ initialData }: LandingPageFormProps) => {
  const router = useRouter();

  const form = useForm<z.infer<typeof landingPageSchema>>({
    resolver: zodResolver(landingPageSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          slug: initialData.slug,
          htmlContent: initialData.htmlContent
        }
      : {
          title: '',
          slug: '',
          htmlContent:
            '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>New Landing Page</title>\n  <style>\n    body { font-family: sans-serif; padding: 40px; text-align: center; }\n    .container { max-width: 600px; margin: 0 auto; }\n  </style>\n</head>\n<body>\n  <div class="container">\n    <h1>Welcome to Our Landing Page</h1>\n    <p>Custom HTML content goes here.</p>\n  </div>\n</body>\n</html>'
        }
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values: z.infer<typeof landingPageSchema>) => {
    try {
      if (initialData) {
        await axios.patch(`/api/landing-pages/${initialData.id}`, values);
        toast.success('Landing page updated');
      } else {
        await axios.post('/api/landing-pages', values);
        toast.success('Landing page created');
      }
      router.refresh();
      // Use window.location.pathname to determine where to go back
      const currentPath = window.location.pathname;

      // Specifically handle the /new and /[id] routes
      if (currentPath.endsWith('/new')) {
        router.push(currentPath.replace('/new', ''));
      } else {
        router.push(currentPath.split('/').slice(0, -1).join('/'));
      }
    } catch (error) {
      let message = 'Something went wrong';
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        message = error.response.data.error;
      }
      toast.error(message);
    }
  };

  return (
    <div className="mt-6 border bg-slate-50 rounded-lg p-6 shadow-sm">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">Page Title</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} placeholder="e.g. Summer Sale 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">URL Slug</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-x-2">
                      <span className="text-sm text-slate-400 font-mono">/pages/</span>
                      <Input disabled={isSubmitting} placeholder="summer-sale" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="htmlContent"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">Custom HTML Code</FormLabel>
                <FormControl>
                  <Textarea
                    disabled={isSubmitting}
                    placeholder="Paste your full HTML code here..."
                    className="min-h-[600px] font-mono text-sm bg-slate-900 text-slate-100 p-4 leading-relaxed"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Provide valid HTML including head and body tags for a full-page experience.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center gap-x-3 pt-4 border-t">
            <Button disabled={!isValid || isSubmitting} type="submit" size="lg" className="px-8">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Save Changes' : 'Create Landing Page'}
            </Button>
            <Button variant="outline" onClick={() => router.back()} type="button" size="lg">
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
