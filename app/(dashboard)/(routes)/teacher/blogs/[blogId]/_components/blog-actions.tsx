'use client';

import axios from 'axios';
import { Trash, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/modals/confirm-modal';

interface BlogActionsProps {
  disabled: boolean;
  blogId: string;
  isPublished: boolean;
  slug: string;
}

export const BlogActions = ({ disabled, blogId, isPublished, slug }: BlogActionsProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    try {
      setIsLoading(true);

      if (isPublished) {
        await axios.patch(`/api/blogs/${blogId}`, { isPublished: false });
        toast.success('Blog post unpublished');
      } else {
        await axios.patch(`/api/blogs/${blogId}`, { isPublished: true });
        toast.success('Blog post published');
      }

      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setIsLoading(true);

      await axios.delete(`/api/blogs/${blogId}`);

      toast.success('Blog post deleted');
      router.push(`/teacher/blogs`);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-x-2">
      <Link href={`/blog/${slug}`} target="_blank">
        <Button variant="ghost" size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          Preview
        </Button>
      </Link>
      <Button onClick={onClick} disabled={disabled || isLoading} variant="outline" size="sm">
        {isPublished ? 'Unpublish' : 'Publish'}
      </Button>
      <ConfirmModal onConfirm={onDelete}>
        <Button size="sm" disabled={isLoading}>
          <Trash className="h-4 w-4" />
        </Button>
      </ConfirmModal>
    </div>
  );
};
