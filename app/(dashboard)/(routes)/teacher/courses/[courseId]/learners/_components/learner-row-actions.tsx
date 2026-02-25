'use client';

import axios from 'axios';
import { MoreHorizontal, UserMinus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface LearnerRowActionsProps {
  courseId: string;
  purchaseId: string;
  learnerName: string;
  onboardingSource: 'PAID' | 'MANUAL' | 'PAID_MANUAL' | 'UNKNOWN';
}

export const LearnerRowActions = ({
  courseId,
  purchaseId,
  learnerName,
  onboardingSource
}: LearnerRowActionsProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [doubleConfirmOpen, setDoubleConfirmOpen] = useState(false);

  const needsDoubleConfirmation = onboardingSource !== 'MANUAL';

  const onUnenroll = async (force: boolean) => {
    try {
      setIsLoading(true);
      await axios.delete(`/api/courses/${courseId}/learners/${purchaseId}`, {
        data: { force }
      });
      toast.success('Learner unenrolled');
      router.refresh();
      setConfirmOpen(false);
      setDoubleConfirmOpen(false);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
            <span className="sr-only">Open learner actions</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setConfirmOpen(true);
            }}
            className="text-rose-600 focus:text-rose-600"
          >
            <UserMinus className="h-4 w-4 mr-2" />
            Unenroll
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unenroll learner?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {learnerName} from this course. They will lose access immediately.
              {needsDoubleConfirmation
                ? ' Paid or unknown enrolments need one extra confirmation.'
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (needsDoubleConfirmation) {
                  setConfirmOpen(false);
                  setDoubleConfirmOpen(true);
                  return;
                }
                void onUnenroll(false);
              }}
              disabled={isLoading}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={doubleConfirmOpen} onOpenChange={setDoubleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Final confirmation required</AlertDialogTitle>
            <AlertDialogDescription>
              This learner appears to be paid or has unknown onboarding source. Confirm only after
              any refund action is completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onUnenroll(true)} disabled={isLoading}>
              {isLoading ? 'Unenrolling...' : 'Unenroll anyway'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
