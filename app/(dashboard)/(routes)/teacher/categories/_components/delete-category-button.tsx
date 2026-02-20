'use client';

import { useState } from 'react';
import { Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';

interface DeleteCategoryButtonProps {
  categoryId: string;
}

export const DeleteCategoryButton = ({ categoryId }: DeleteCategoryButtonProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onDelete = async () => {
    try {
      setIsLoading(true);
      await axios.delete(`/api/categories/${categoryId}`);
      toast.success('Category deleted');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={onDelete} disabled={isLoading} variant="destructive" size="sm">
      <Trash className="h-4 w-4" />
    </Button>
  );
};
