'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { BriefcaseIcon, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/modals/confirm-modal';

interface PlacementAccessFormProps {
  /** The Profile.id of the target user */
  profileId: string;
  /**
   * Current placement access state for this user.
   * null = no PlacementUser record exists yet (never granted access).
   */
  placementAccess: { isActive: boolean } | null;
}

export const PlacementAccessForm = ({ profileId, placementAccess }: PlacementAccessFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const isActive = placementAccess?.isActive ?? false;
  const hasAccess = placementAccess !== null;

  const handleToggle = async () => {
    try {
      setIsLoading(true);
      await axios.patch(`/api/admin/placement/users/${profileId}`);
      toast.success(
        hasAccess
          ? isActive
            ? 'Placement access revoked'
            : 'Placement access restored'
          : 'Placement access granted'
      );
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmTitle = !hasAccess
    ? 'Grant placement access?'
    : isActive
      ? 'Revoke placement access?'
      : 'Restore placement access?';

  const confirmDescription = !hasAccess
    ? 'This will create a placement profile for this user and allow them to browse jobs and apply through the mobile app.'
    : isActive
      ? "This will deactivate the user's placement profile. They will no longer be able to apply for jobs until access is restored."
      : "This will reactivate the user's placement profile and allow them to apply for jobs again.";

  const confirmText = !hasAccess ? 'Grant Access' : isActive ? 'Revoke Access' : 'Restore Access';

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4 dark:bg-gray-800">
      <div className="font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BriefcaseIcon className="h-4 w-4" />
          Placement Portal Access
        </div>

        <ConfirmModal
          onConfirm={handleToggle}
          title={confirmTitle}
          description={confirmDescription}
          confirmText={confirmText}
        >
          <Button variant={isActive ? 'destructive' : 'default'} size="sm" disabled={isLoading}>
            {!hasAccess ? 'Grant Access' : isActive ? 'Revoke Access' : 'Restore Access'}
          </Button>
        </ConfirmModal>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        {!hasAccess ? (
          <>
            <XCircle className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500 italic">No placement profile — access not granted</span>
          </>
        ) : isActive ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Active</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              Placement portal enabled
            </Badge>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-rose-500" />
            <span>Revoked</span>
            <Badge variant="outline" className="ml-1 text-xs text-rose-600">
              Access disabled
            </Badge>
          </>
        )}
      </div>
    </div>
  );
};
