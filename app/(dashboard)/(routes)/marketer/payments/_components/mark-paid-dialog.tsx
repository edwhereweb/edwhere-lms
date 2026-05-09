'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { LeadPaymentEntry } from '@prisma/client';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n);

interface MarkPaidDialogProps {
  entry: LeadPaymentEntry;
  leadId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export function MarkPaidDialog({ entry, leadId, open, onClose, onDone }: MarkPaidDialogProps) {
  const [paidAt, setPaidAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await axios.post(`/api/leads/${leadId}/payments/${entry.id}/mark-paid`, {
        paidAt: new Date(paidAt).toISOString()
      });
      toast.success('Marked as received!');
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
          <DialogTitle>Mark as Received</DialogTitle>
          <DialogDescription>
            Confirm receipt of{' '}
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">
              {fmt(entry.amount)}
            </span>{' '}
            for &ldquo;{entry.label}&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <div>
          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mb-1.5">
            PAID ON
          </label>
          <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? 'Saving…' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
