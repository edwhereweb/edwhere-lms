'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/modals/confirm-modal';

export const PendingCourseActions = ({ courseId }: { courseId: string }) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const onApprove = async () => {
    try {
      setIsLoading(true);
      await axios.patch(`/api/courses/${courseId}/approve`);
      toast.success('Course approved and published!');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const onReject = async () => {
    try {
      setIsLoading(true);
      await axios.patch(`/api/courses/${courseId}/reject`);
      toast.success('Course rejected');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-x-2">
      <ConfirmModal
        onConfirm={onApprove}
        title="Approve course?"
        description="This will publish the course and make it visible to all students."
        confirmText="Approve"
      >
        <Button
          disabled={isLoading}
          size="sm"
          className="bg-[#171717] hover:bg-[#F80602] text-white h-8"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Approve
        </Button>
      </ConfirmModal>
      <ConfirmModal
        onConfirm={onReject}
        title="Reject course?"
        description="This will reject the course submission. The instructor will need to make changes and resubmit."
        confirmText="Reject"
      >
        <Button disabled={isLoading} variant="destructive" size="sm" className="h-8">
          <XCircle className="h-4 w-4 mr-1" />
          Reject
        </Button>
      </ConfirmModal>
    </div>
  );
};
