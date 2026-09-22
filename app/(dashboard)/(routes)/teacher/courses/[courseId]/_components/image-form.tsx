'use client';

import * as z from 'zod';
import axios from 'axios';
import { Pencil, PlusCircle, ImageIcon } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { type Course } from '@prisma/client';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/file-upload';

interface ImageFormProps {
  initialData: Course;
  courseId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = z.object({
  imageUrl: z.string().min(1, {
    message: 'Image is required'
  }),
  imageAlt: z.string().max(255).optional()
});

export const ImageForm = ({ initialData, courseId }: ImageFormProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const toggleEdit = () => setIsEditing((current) => !current);

  const router = useRouter();

  const [imageAlt, setImageAlt] = useState(initialData.imageAlt || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      await axios.patch(`/api/courses/${courseId}`, values);
      toast.success('Course updated');
      toggleEdit();
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onAltSave = async () => {
    try {
      setIsSubmitting(true);
      await axios.patch(`/api/courses/${courseId}`, { imageAlt });
      toast.success('Alt text updated');
      toggleEdit();
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4 dark:bg-gray-800">
      <div className="font-medium flex items-center justify-between">
        Course image
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing && <>Cancel</>}
          {!isEditing && !initialData.imageUrl && (
            <>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add an image
            </>
          )}
          {!isEditing && initialData.imageUrl && (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit image
            </>
          )}
        </Button>
      </div>
      {!isEditing &&
        (!initialData.imageUrl ? (
          <div className="flex items-center justify-center h-60 bg-slate-200 rounded-md">
            <ImageIcon className="h-10 w-10 text-slate-500" />
          </div>
        ) : (
          <>
            <div className="relative aspect-video mt-2">
              <Image
                alt={initialData.imageAlt || 'Course image'}
                fill
                className="object-cover rounded-md"
                src={initialData.imageUrl}
              />
            </div>
            {initialData.imageAlt && (
              <div className="text-xs text-slate-500 mt-1 italic">Alt: {initialData.imageAlt}</div>
            )}
          </>
        ))}
      {isEditing && (
        <div className="space-y-4">
          <FileUpload
            endpoint="courseImage"
            courseId={courseId}
            onChange={(url) => {
              if (url) {
                onSubmit({ imageUrl: url, imageAlt });
              }
            }}
          />
          <div className="text-xs text-muted-foreground mt-4">16:9 aspect ratio recommended</div>

          {initialData.imageUrl && (
            <div className="flex flex-col gap-y-2 mt-4">
              <div className="text-sm font-medium">Image Alternate Text (SEO)</div>
              <div className="flex items-center gap-x-2">
                <input
                  disabled={isSubmitting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe the image for search engines..."
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                />
                <Button disabled={isSubmitting} onClick={onAltSave}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
