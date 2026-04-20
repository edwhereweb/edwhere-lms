'use client';

import { useState } from 'react';
import * as z from 'zod';
import { api } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { ArrowLeft, Loader2, PlusCircle, Trash } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
import { Textarea } from '@/components/ui/textarea';
import { FileUpload } from '@/components/file-upload';

const formSchema = z.object({
  body: z.string().min(1, 'Question text is required'),
  imageUrl: z.string().min(1).nullable().optional(),
  isMultipleChoice: z.boolean(),
  options: z.array(z.object({ value: z.string().min(1) })).min(2),
  correctIndices: z.array(z.number()).min(1)
});

export default function NewQuestionPage({
  params
}: {
  params: { courseId: string; chapterId: string };
}) {
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      body: '',
      imageUrl: null,
      isMultipleChoice: false,
      options: [{ value: '' }, { value: '' }, { value: '' }, { value: '' }],
      correctIndices: [0]
    }
  });

  const [isAddingAnother, setIsAddingAnother] = useState(false);

  const { isSubmitting, isValid } = form.formState;
  const isMultipleChoice = form.watch('isMultipleChoice');
  const correctIndices = form.watch('correctIndices');
  const imageUrl = form.watch('imageUrl');

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options'
  });

  const toggleCorrectIndex = (index: number) => {
    if (!isMultipleChoice) {
      form.setValue('correctIndices', [index], { shouldValidate: true });
      return;
    }
    const current = [...correctIndices];
    if (current.includes(index)) {
      form.setValue(
        'correctIndices',
        current.filter((i) => i !== index),
        { shouldValidate: true }
      );
    } else {
      current.push(index);
      form.setValue('correctIndices', current, { shouldValidate: true });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>, isAddingAnotherFlag = false) => {
    try {
      if (values.correctIndices.length === 0) {
        toast.error('You must select at least one correct option.');
        return;
      }

      const payload = {
        body: values.body,
        imageUrl: values.imageUrl,
        isMultipleChoice: values.isMultipleChoice,
        options: values.options.map((o) => o.value),
        correctOptions: values.correctIndices
      };

      await api.post(`/courses/${params.courseId}/chapters/${params.chapterId}/questions`, payload);
      toast.success('Question created');

      if (isAddingAnotherFlag) {
        form.reset({
          body: '',
          imageUrl: null,
          isMultipleChoice: false,
          options: [{ value: '' }, { value: '' }, { value: '' }, { value: '' }],
          correctIndices: [0]
        });
        setIsAddingAnother(false);
        router.refresh();
      } else {
        router.push(`/teacher/courses/${params.courseId}/chapters/${params.chapterId}`);
        router.refresh();
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-x-4">
          <Button
            onClick={() =>
              router.push(`/teacher/courses/${params.courseId}/chapters/${params.chapterId}`)
            }
            variant="ghost"
            className="p-2 h-auto"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Add Question</h1>
            <p className="text-sm text-muted-foreground mt-1">Configure your evaluation options.</p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => onSubmit(values))}
          className="space-y-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-md shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={isSubmitting}
                        placeholder="e.g. What is the capital of France?"
                        {...field}
                        className="min-h-[140px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Optional Image Attachment</FormLabel>
                {!imageUrl ? (
                  <div className="mt-2 border rounded-md p-4 bg-slate-50 dark:bg-slate-800">
                    <FileUpload
                      endpoint="questionImage"
                      courseId={params.courseId}
                      onChange={(url) => {
                        if (url) {
                          form.setValue('imageUrl', url);
                        }
                      }}
                    />
                    <div className="text-xs text-muted-foreground mt-4 text-center">
                      Max 250KB. Use standard dimensions.
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-video mt-2 bg-slate-100 rounded-md flex items-center justify-center overflow-hidden border">
                    <Image
                      alt="Question Image"
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-contain"
                      src={imageUrl}
                    />
                    <div className="absolute top-2 right-2 flex gap-x-2">
                      <Button
                        onClick={() => form.setValue('imageUrl', null)}
                        variant="destructive"
                        size="sm"
                        type="button"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <FormField
                control={form.control}
                name="isMultipleChoice"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 bg-slate-50 dark:bg-slate-800">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Multiple Correct Answers</FormLabel>
                      <FormDescription>
                        Check this if the user must select multiple valid options.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel>Answer Options</FormLabel>
                  {fields.length < 10 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => append({ value: '' })}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  )}
                </div>

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex flex-row items-center gap-x-4 p-3 border rounded-md bg-slate-50 dark:bg-slate-800/50"
                  >
                    <Checkbox
                      checked={correctIndices.includes(index)}
                      onCheckedChange={() => toggleCorrectIndex(index)}
                      className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <FormField
                      control={form.control}
                      name={`options.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-1 space-y-0">
                          <FormControl>
                            <Input
                              disabled={isSubmitting}
                              placeholder={`Option ${String.fromCharCode(65 + index)}`}
                              {...field}
                              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    {fields.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-rose-500Shrink"
                        onClick={() => remove(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {(form.formState.errors.correctIndices || correctIndices.length === 0) && (
                  <p className="text-sm font-medium text-destructive">
                    You must select at least one correct answer using the checkboxes.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end border-t pt-6 gap-x-2">
            <Button
              onClick={() =>
                router.push(`/teacher/courses/${params.courseId}/chapters/${params.chapterId}`)
              }
              variant="outline"
              type="button"
            >
              Cancel
            </Button>
            <Button
              disabled={!isValid || isSubmitting || correctIndices.length === 0}
              onClick={() => {
                setIsAddingAnother(true);
                form.handleSubmit((values) => onSubmit(values, true))();
              }}
              variant="secondary"
              type="button"
            >
              {isSubmitting && isAddingAnother ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save & Add Another
            </Button>
            <Button
              disabled={!isValid || isSubmitting || correctIndices.length === 0}
              onClick={() => {
                setIsAddingAnother(false);
                form.handleSubmit((values) => onSubmit(values, false))();
              }}
              type="button"
            >
              {isSubmitting && !isAddingAnother ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Question
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
