'use client';

import { api } from '@/lib/api-client';
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
      await api.patch(`/blogs/${blogId}`, { isPublished: !isPublished });
      toast.success(isPublished ? 'Blog post unpublished' : 'Blog post published');
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
      await api.delete(`/blogs/${blogId}`);
      toast.success('Blog post deleted');
      router.push('/blogger/blogs');
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
