'use client';

import { api } from '@/lib/api-client';
import { Trash } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/modals/confirm-modal';

interface ModuleActionsProps {
  disabled: boolean;
  courseId: string;
  moduleId: string;
  isPublished: boolean;
}

export const ModuleActions = ({
  disabled,
  courseId,
  moduleId,
  isPublished
}: ModuleActionsProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onPublish = async () => {
    try {
      setIsLoading(true);
      await api.patch(`/courses/${courseId}/modules/${moduleId}/publish`);
      toast.success('Module published');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const onUnpublish = async () => {
    try {
      setIsLoading(true);
      await api.patch(`/courses/${courseId}/modules/${moduleId}/unpublish`);
      toast.success('Module unpublished');
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

      await api.delete(`/courses/${courseId}/modules/${moduleId}`);

      toast.success('Module deleted');
      router.refresh();
      router.push(`/teacher/courses/${courseId}/structure`);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-x-2">
      {isPublished ? (
        <ConfirmModal
          onConfirm={onUnpublish}
          title="Unpublish module?"
          description="This will make the module and its chapters unavailable to students."
        >
          <Button disabled={disabled || isLoading} variant="outline" size="sm">
            Unpublish
          </Button>
        </ConfirmModal>
      ) : (
        <Button onClick={onPublish} disabled={disabled || isLoading} variant="outline" size="sm">
          Publish
        </Button>
      )}
      <ConfirmModal onConfirm={onDelete}>
        <Button size="sm" disabled={isLoading}>
          <Trash className="h-4 w-4" />
        </Button>
      </ConfirmModal>
    </div>
  );
};
