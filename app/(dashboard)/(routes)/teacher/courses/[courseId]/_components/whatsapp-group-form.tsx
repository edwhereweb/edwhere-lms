'use client';

import * as z from 'zod';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Pencil, MessageCircle, X } from 'lucide-react';

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

interface WhatsAppGroupFormProps {
  initialData: {
    whatsappGroupUrl?: string | null;
  };
  courseId: string;
}

const formSchema = z.object({
  whatsappGroupUrl: z
    .string()
    .url('Must be a valid URL')
    .refine(
      (v) => v.startsWith('https://chat.whatsapp.com/') || v.startsWith('https://wa.me/'),
      'Must be a WhatsApp group invite link (chat.whatsapp.com) or wa.me link'
    )
    .optional()
    .or(z.literal(''))
});

export const WhatsAppGroupForm = ({ initialData, courseId }: WhatsAppGroupFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const toggleEdit = () => setIsEditing((cur) => !cur);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      whatsappGroupUrl: initialData.whatsappGroupUrl ?? ''
    }
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await axios.patch(`/api/courses/${courseId}`, {
        whatsappGroupUrl: values.whatsappGroupUrl || null
      });
      toast.success('WhatsApp group link updated');
      toggleEdit();
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  const handleClear = async () => {
    try {
      await axios.patch(`/api/courses/${courseId}`, { whatsappGroupUrl: null });
      form.setValue('whatsappGroupUrl', '');
      toast.success('WhatsApp group link removed');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="mt-6 border bg-slate-100 dark:bg-slate-900 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-600" />
          WhatsApp Group Link
        </div>
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
        <div className="flex items-center gap-2 mt-2">
          {initialData.whatsappGroupUrl ? (
            <>
              <a
                href={initialData.whatsappGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 underline break-all"
              >
                {initialData.whatsappGroupUrl}
              </a>
              <button
                onClick={handleClear}
                className="ml-1 text-muted-foreground hover:text-destructive"
                title="Remove link"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">No WhatsApp group link set</p>
          )}
        </div>
      )}

      {isEditing && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="whatsappGroupUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Invite URL</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      placeholder="https://chat.whatsapp.com/..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Shared in the enrollment WhatsApp message sent via WACRM. Leave blank to omit.
                  </FormDescription>
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
