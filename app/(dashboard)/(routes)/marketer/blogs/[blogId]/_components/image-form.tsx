'use client';

import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { Pencil, PlusCircle, ImageIcon } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/file-upload';

interface ImageFormProps {
  initialData: {
    imageUrl: string | null;
    imageAlt: string | null;
  };
  blogId: string;
}

export const ImageForm = ({ initialData, blogId }: ImageFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [imageAlt, setImageAlt] = useState(initialData.imageAlt || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const toggleEdit = () => setIsEditing((current) => !current);

  const onSubmit = async (url?: string) => {
    try {
      setIsSubmitting(true);
      await axios.patch(`/api/blogs/${blogId}`, {
        imageUrl: url || initialData.imageUrl,
        imageAlt: imageAlt
      });
      toast.success('Blog cover image updated');
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
      await axios.patch(`/api/blogs/${blogId}`, { imageAlt });
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
    <div className="mt-6 border bg-slate-100 dark:bg-slate-900 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        Blog Cover Image
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
          <div className="flex items-center justify-center h-60 bg-slate-200 dark:bg-slate-800 rounded-md mt-2">
            <ImageIcon className="h-10 w-10 text-slate-500" />
          </div>
        ) : (
          <>
            <div className="relative aspect-video mt-2 overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
              <Image
                alt={initialData.imageAlt || 'Blog cover'}
                fill
                className="object-cover"
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
            endpoint="blogPostCover"
            blogId={blogId}
            onChange={(url) => {
              if (url) {
                onSubmit(url);
              }
            }}
          />
          <div className="text-xs text-muted-foreground mt-4 italic">
            Recommended aspect ratio: 16:9 (e.g., 1200x675px)
          </div>

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
