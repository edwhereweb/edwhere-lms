'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { LeadPaymentEntry, Lead } from '@prisma/client';

type EntryWithLead = LeadPaymentEntry & { lead: Lead };

interface PaymentDeletionsClientProps {
  entries: EntryWithLead[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n);

export function PaymentDeletionsClient({ entries: initialEntries }: PaymentDeletionsClientProps) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [rejectEntry, setRejectEntry] = useState<EntryWithLead | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const resolve = async (entryId: string, action: 'APPROVE' | 'REJECT', note?: string) => {
    setProcessing(entryId);
    try {
      await axios.post(`/api/admin/payment-entries/${entryId}/resolve-deletion`, {
        action,
        rejectionNote: note
      });
      toast.success(action === 'APPROVE' ? 'Entry deleted.' : 'Deletion rejected.');
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setProcessing(null);
    }
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-20 text-neutral-400">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-300" />
        <p className="text-lg font-medium">No pending deletion requests</p>
      </div>
    );
  }

  return (
    <>
      {rejectEntry && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) {
              setRejectEntry(null);
              setRejectionNote('');
            }
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Reject Deletion</DialogTitle>
              <DialogDescription>
                Optionally provide a reason for rejecting this deletion request.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Rejection note (optional)"
              rows={3}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setRejectEntry(null);
                  setRejectionNote('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  resolve(rejectEntry.id, 'REJECT', rejectionNote || undefined);
                  setRejectEntry(null);
                  setRejectionNote('');
                }}
              >
                Reject
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="rounded-xl border bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-neutral-50 dark:bg-neutral-800/60 text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
              <th className="text-left px-4 py-3">Lead</th>
              <th className="text-left px-4 py-3">Entry</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Reason</th>
              <th className="text-left px-4 py-3">Requested</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-800 dark:text-neutral-100">
                    {entry.lead.name}
                  </p>
                  <p className="text-xs text-neutral-400">{entry.lead.email}</p>
                </td>
                <td className="px-4 py-3 font-medium">{entry.label}</td>
                <td className="px-4 py-3">{fmt(entry.amount)}</td>
                <td className="px-4 py-3 text-neutral-500 max-w-[200px]">
                  <p className="truncate" title={entry.deletionReason ?? ''}>
                    {entry.deletionReason ?? '—'}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">
                  {entry.deletionRequestedAt
                    ? format(new Date(entry.deletionRequestedAt), 'dd MMM yyyy')
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      disabled={processing === entry.id}
                      onClick={() => resolve(entry.id, 'APPROVE')}
                      className="gap-1 text-xs h-7 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processing === entry.id}
                      onClick={() => setRejectEntry(entry)}
                      className="gap-1 text-xs h-7"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
