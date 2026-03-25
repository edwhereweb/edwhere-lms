'use client';

import * as z from 'zod';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { BlogPost } from '@prisma/client';
import { cn } from '@/lib/utils';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface SEOFormProps {
  initialData: BlogPost;
  blogId: string;
}

const formSchema = z.object({
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional()
});

export const SEOForm = ({ initialData, blogId }: SEOFormProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const toggleEdit = () => setIsEditing((current) => !current);

  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      metaTitle: initialData?.metaTitle || '',
      metaDescription: initialData?.metaDescription || ''
    }
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await axios.patch(`/api/blogs/${blogId}`, values);
      toast.success('SEO settings updated');
      toggleEdit();
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="mt-6 border bg-slate-100 dark:bg-slate-900 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        SEO Meta Tags
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing ? (
            <>Cancel</>
          ) : (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit SEO
            </>
          )}
        </Button>
      </div>
      {!isEditing && (
        <div className="text-sm mt-2 space-y-2">
          <div>
            <span className="font-bold">Meta Title: </span>
            {initialData.metaTitle || 'Default'}
          </div>
          <div>
            <span className="font-bold">Meta Description: </span>
            {initialData.metaDescription || 'Default'}
          </div>
        </div>
      )}
      {isEditing && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="metaTitle"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Meta Title</FormLabel>
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        (field.value?.length || 0) >= 50 && (field.value?.length || 0) <= 60
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {field.value?.length || 0} chars |{' '}
                      {(field.value?.length || 0) >= 50 && (field.value?.length || 0) <= 60
                        ? 'Great'
                        : (field.value?.length || 0) > 60
                          ? 'Too Long'
                          : 'Short'}
                    </span>
                  </div>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      placeholder="SEO optimized title (50-60 chars)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="metaDescription"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Meta Description</FormLabel>
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        (field.value?.length || 0) >= 120 && (field.value?.length || 0) <= 160
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {field.value?.length || 0} chars |{' '}
                      {(field.value?.length || 0) >= 120 && (field.value?.length || 0) <= 160
                        ? 'Great'
                        : (field.value?.length || 0) > 160
                          ? 'Too Long'
                          : 'Short'}
                    </span>
                  </div>
                  <FormControl>
                    <Textarea
                      disabled={isSubmitting}
                      placeholder="Brief summary for search results (120-160 chars)"
                      {...field}
                    />
                  </FormControl>
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
