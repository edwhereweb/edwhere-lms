'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PendingUploadActions({ uploadId }: { uploadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'APPROVE' | 'REJECT' | null>(null);

  const act = async (action: 'APPROVE' | 'REJECT') => {
    try {
      setLoading(action);
      await axios.post(`/api/admin/session-uploads/${uploadId}`, { action });
      toast.success(
        action === 'APPROVE' ? 'Upload approved — students can now view it.' : 'Upload rejected.'
      );
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        id={`approve-${uploadId}`}
        size="sm"
        className="h-7 text-xs"
        onClick={() => act('APPROVE')}
        disabled={!!loading}
      >
        {loading === 'APPROVE' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approve
          </>
        )}
      </Button>
      <Button
        id={`reject-${uploadId}`}
        size="sm"
        variant="destructive"
        className="h-7 text-xs"
        onClick={() => act('REJECT')}
        disabled={!!loading}
      >
        {loading === 'REJECT' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <XCircle className="h-3 w-3 mr-1" />
            Reject
          </>
        )}
      </Button>
    </div>
  );
}
