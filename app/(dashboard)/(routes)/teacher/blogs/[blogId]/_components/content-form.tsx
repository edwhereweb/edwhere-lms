'use client';

import axios from 'axios';
import toast from 'react-hot-toast';
import { useState, useMemo } from 'react';
import { Pencil } from 'lucide-react';
import dynamic from 'next/dynamic';
import debounce from 'lodash.debounce';

import { Button } from '@/components/ui/button';
import type { EditorProps } from './editor';

interface ContentFormProps {
  initialData: {
    content: string;
  };
  blogId: string;
}

// Lazy load the editor to improve initial page load and protect against SSR issues
const Editor = dynamic<EditorProps>(() => import('./editor'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-md" />
  )
});

export const ContentForm = ({ initialData, blogId }: ContentFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleEdit = () => {
    setIsEditing((current) => !current);
  };

  // Memoize the debounced update function to keep a stable reference across renders
  const debouncedUpdate = useMemo(
    () =>
      debounce(async (content: string) => {
        try {
          setIsUpdating(true);
          await axios.patch(`/api/blogs/${blogId}`, { content });
          // No toast here to avoid spamming the user during typing
        } catch {
          toast.error('Auto-save failed');
        } finally {
          setIsUpdating(false);
        }
      }, 1000), // 1 second debounce
    [blogId]
  );

  const onChange = (content: string) => {
    debouncedUpdate(content);
  };

  return (
    <div className="mt-6 border bg-slate-100 dark:bg-slate-900 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        Blog Content
        <div className="flex items-center gap-x-2">
          {isUpdating && <span className="text-xs text-slate-500 animate-pulse">Saving...</span>}
          <Button onClick={toggleEdit} variant="ghost">
            {isEditing ? (
              <>Done</>
            ) : (
              <>
                <Pencil className="h-4 w-4 mr-2" />
                Edit content
              </>
            )}
          </Button>
        </div>
      </div>
      {!isEditing && (
        <div className="mt-2 text-sm text-slate-700 dark:text-slate-400 italic">
          Click edit to modify the blog content. Auto-save is enabled.
        </div>
      )}
      {isEditing && (
        <div className="mt-4">
          <Editor initialContent={initialData.content} onChange={onChange} blogId={blogId} />
        </div>
      )}
    </div>
  );
};
