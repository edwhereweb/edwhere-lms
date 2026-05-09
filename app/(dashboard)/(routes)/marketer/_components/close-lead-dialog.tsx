'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TrophyIcon, XCircle } from 'lucide-react';

interface CloseLeadDialogProps {
  leadId: string;
  leadName: string;
  open: boolean;
  onClose: () => void;
}

export function CloseLeadDialog({ leadId, leadName, open, onClose }: CloseLeadDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'WON' | 'LOST'>('WON');
  const [agreedAmount, setAgreedAmount] = useState('');
  const [courseInterest, setCourseInterest] = useState('');
  const [closureNote, setClosureNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = async () => {
    if (mode === 'LOST' && !closureNote.trim()) {
      toast.error('Please provide a reason for loss');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`/api/leads/${leadId}/close`, {
        closureStatus: mode,
        closureNote: closureNote || undefined,
        agreedAmount: agreedAmount ? parseFloat(agreedAmount) : undefined,
        courseInterest: courseInterest || undefined
      });
      toast.success(
        mode === 'WON' ? 'Lead closed as Won! View in Payment Tracker.' : 'Lead marked as Lost.'
      );
      onClose();
      if (mode === 'WON') {
        router.push('/marketer/payments');
      } else {
        router.refresh();
      }
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Close Lead — {leadName}</DialogTitle>
          <DialogDescription>
            Mark this lead as Won or Lost. Won leads move to the Payment Tracker.
          </DialogDescription>
        </DialogHeader>

        {/* Won / Lost toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('WON')}
            className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-semibold transition-all ${
              mode === 'WON'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700'
            }`}
          >
            <TrophyIcon className="h-4 w-4" />
            Won
          </button>
          <button
            type="button"
            onClick={() => setMode('LOST')}
            className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-semibold transition-all ${
              mode === 'LOST'
                ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700'
            }`}
          >
            <XCircle className="h-4 w-4" />
            Lost
          </button>
        </div>

        <div className="space-y-3">
          {mode === 'WON' && (
            <>
              <div>
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mb-1.5">
                  AGREED AMOUNT (₹)
                </label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 15000"
                  value={agreedAmount}
                  onChange={(e) => setAgreedAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mb-1.5">
                  COURSE INTEREST
                </label>
                <Input
                  placeholder="Which course are they enrolling in?"
                  value={courseInterest}
                  onChange={(e) => setCourseInterest(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mb-1.5">
              {mode === 'LOST' ? 'REASON FOR LOSS *' : 'NOTES (optional)'}
            </label>
            <Textarea
              placeholder={
                mode === 'LOST' ? 'Why did this lead not convert?' : 'Any closing notes…'
              }
              rows={3}
              value={closureNote}
              onChange={(e) => setClosureNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleClose}
            disabled={saving}
            className={`flex-1 ${mode === 'WON' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
          >
            {saving ? 'Saving…' : mode === 'WON' ? 'Mark as Won' : 'Mark as Lost'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
