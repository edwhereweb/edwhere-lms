'use client';

import { useState } from 'react';
import { Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/modals/confirm-modal';

interface DeleteCategoryButtonProps {
  categoryId: string;
}

export const DeleteCategoryButton = ({ categoryId }: DeleteCategoryButtonProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onDelete = async () => {
    try {
      setIsLoading(true);
      await api.delete(`/categories/${categoryId}`);
      toast.success('Category deleted');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ConfirmModal
      onConfirm={onDelete}
      title="Delete category?"
      description="This will permanently delete the category. Courses using this category will be unaffected."
    >
      <Button disabled={isLoading} variant="destructive" size="sm">
        <Trash className="h-4 w-4" />
      </Button>
    </ConfirmModal>
  );
};
