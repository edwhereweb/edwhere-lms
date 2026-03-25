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
  };
  blogId: string;
}

export const ImageForm = ({ initialData, blogId }: ImageFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  const toggleEdit = () => setIsEditing((current) => !current);

  const onSubmit = async (url?: string) => {
    try {
      await axios.patch(`/api/blogs/${blogId}`, { imageUrl: url });
      toast.success('Blog cover image updated');
      toggleEdit();
      router.refresh();
    } catch {
      toast.error('Something went wrong');
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
          <div className="relative aspect-video mt-2 overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
            <Image alt="Upload" fill className="object-cover" src={initialData.imageUrl} />
          </div>
        ))}
      {isEditing && (
        <div>
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
        </div>
      )}
    </div>
  );
};
