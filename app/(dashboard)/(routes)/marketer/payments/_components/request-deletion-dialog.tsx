'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { LeadPaymentEntry } from '@prisma/client';

interface RequestDeletionDialogProps {
  entry: LeadPaymentEntry;
  leadId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export function RequestDeletionDialog({
  entry,
  leadId,
  open,
  onClose,
  onDone
}: RequestDeletionDialogProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleRequest = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`/api/leads/${leadId}/payments/${entry.id}/request-deletion`, {
        deletionReason: reason.trim()
      });
      toast.success('Deletion request sent to admin.');
      onDone();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Request Deletion</DialogTitle>
          <DialogDescription>
            This will send a request to admin to delete &ldquo;{entry.label}&rdquo;. You can
            continue working while the request is reviewed.
          </DialogDescription>
        </DialogHeader>
        <div>
          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mb-1.5">
            REASON *
          </label>
          <Textarea
            placeholder="Why should this entry be deleted?"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleRequest}
            disabled={saving || !reason.trim()}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {saving ? 'Sending…' : 'Request Deletion'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
