'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format, isPast } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Paperclip,
  Trash2,
  Pencil,
  X
} from 'lucide-react';
import type { LeadWithPayments } from '../page';
import type { LeadPaymentEntry } from '@prisma/client';
import { MarkPaidDialog } from './mark-paid-dialog';
import { RequestDeletionDialog } from './request-deletion-dialog';

type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'RAZORPAY' | 'CHEQUE' | 'OTHER';

const MODE_LABELS: Record<PaymentMode, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  RAZORPAY: 'Razorpay',
  CHEQUE: 'Cheque',
  OTHER: 'Other'
};

const MODES: { value: PaymentMode; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank' },
  { value: 'RAZORPAY', label: 'Razorpay' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' }
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n);

function entryStatusIcon(entry: LeadPaymentEntry) {
  if (entry.status === 'PAID')
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />;
  if (entry.status === 'DELETION_REQUESTED')
    return <Trash2 className="h-4 w-4 text-neutral-400 flex-shrink-0" />;
  if (
    entry.status === 'OVERDUE' ||
    (entry.status === 'PENDING' && entry.dueDate && isPast(new Date(entry.dueDate)))
  )
    return <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />;
  return <Clock className="h-4 w-4 text-neutral-400 flex-shrink-0" />;
}

function EntryStatusBadge({ entry }: { entry: LeadPaymentEntry }) {
  const map: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    PENDING: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    WAIVED: 'bg-neutral-100 text-neutral-500',
    DELETION_REQUESTED: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
  };
  const labels: Record<string, string> = {
    PAID: 'Paid',
    PENDING: 'Pending',
    OVERDUE: 'Overdue',
    WAIVED: 'Waived',
    DELETION_REQUESTED: '⏳ Deletion Pending'
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[entry.status] ?? ''}`}
    >
      {labels[entry.status] ?? entry.status}
    </span>
  );
}

interface AddEntryFormProps {
  leadId: string;
  entryCount: number;
  onAdded: () => void;
}

function AddEntryForm({ leadId, entryCount, onAdded }: AddEntryFormProps) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<PaymentMode>('CASH');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`/api/leads/${leadId}/payments`, {
        label: label.trim() || `Payment #${entryCount + 1}`,
        amount: amt,
        mode,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        note: note || undefined
      });
      toast.success('Entry added');
      setLabel('');
      setAmount('');
      setMode('CASH');
      setDueDate('');
      setNote('');
      onAdded();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-neutral-50 dark:bg-neutral-800/40">
      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
        New Entry
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Label (e.g. Registration)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="col-span-2"
        />
        <Input
          type="number"
          min={0}
          placeholder="Amount (₹)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${mode === m.value ? 'border-[#F80602] bg-red-50 text-[#F80602] dark:bg-red-950/30' : 'border-neutral-200 text-neutral-500 dark:border-neutral-700'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Note (optional)"
        rows={1}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="text-xs"
      />
      <Button
        size="sm"
        onClick={handleAdd}
        disabled={saving}
        className="w-full bg-[#F80602] hover:bg-red-700 text-white"
      >
        {saving ? 'Adding…' : 'Add Entry'}
      </Button>
    </div>
  );
}

interface EditEntryFormProps {
  entry: LeadPaymentEntry;
  leadId: string;
  onDone: () => void;
}

function EditEntryForm({ entry, leadId, onDone }: EditEntryFormProps) {
  const isPaid = entry.status === 'PAID';
  const [label, setLabel] = useState(entry.label);
  const [note, setNote] = useState(entry.note ?? '');
  const [amount, setAmount] = useState(String(entry.amount));
  const [mode, setMode] = useState<PaymentMode>(entry.mode as PaymentMode);
  const [dueDate, setDueDate] = useState(
    entry.dueDate ? format(new Date(entry.dueDate), 'yyyy-MM-dd') : ''
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`/api/leads/${leadId}/payments/${entry.id}`, {
        label,
        note: note || null,
        mode,
        dueDate: !isPaid && dueDate ? new Date(dueDate).toISOString() : undefined,
        amount: !isPaid ? parseFloat(amount) : undefined
      });
      toast.success('Entry updated');
      onDone();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-neutral-50 dark:bg-neutral-800/40 mt-1">
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="col-span-2"
        />
        {!isPaid && (
          <>
            <Input
              type="number"
              min={0}
              placeholder="Amount (₹)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </>
        )}
      </div>
      {!isPaid && (
        <div className="flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${mode === m.value ? 'border-[#F80602] bg-red-50 text-[#F80602] dark:bg-red-950/30' : 'border-neutral-200 text-neutral-500 dark:border-neutral-700'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
      <Textarea
        placeholder="Note (optional)"
        rows={1}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="text-xs"
      />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onDone} className="flex-1">
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-[#F80602] hover:bg-red-700 text-white"
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

interface PaymentPlanPanelProps {
  lead: LeadWithPayments;
  open: boolean;
  onClose: () => void;
  onUpdated: (updated: LeadWithPayments) => void;
}

export function PaymentPlanPanel({ lead, open, onClose, onUpdated }: PaymentPlanPanelProps) {
  const [entries, setEntries] = useState<LeadPaymentEntry[]>(lead.paymentEntries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [markPaidEntry, setMarkPaidEntry] = useState<LeadPaymentEntry | null>(null);
  const [deletionEntry, setDeletionEntry] = useState<LeadPaymentEntry | null>(null);

  const refresh = async () => {
    try {
      const res = await axios.get(`/api/leads/${lead.id}/payments`);
      const updated = res.data;
      setEntries(updated.lead.paymentEntries);

      const totalPaid = updated.lead.paymentEntries
        .filter((e: LeadPaymentEntry) => e.status === 'PAID')
        .reduce((s: number, e: LeadPaymentEntry) => s + e.amount, 0);
      const totalWaived = updated.lead.paymentEntries
        .filter((e: LeadPaymentEntry) => e.status === 'WAIVED')
        .reduce((s: number, e: LeadPaymentEntry) => s + e.amount, 0);
      const outstanding = (lead.agreedAmount ?? 0) - totalPaid - totalWaived;

      onUpdated({
        ...lead,
        paymentEntries: updated.lead.paymentEntries,
        totalPaid,
        totalWaived,
        outstanding,
        overallStatus:
          outstanding <= 0 && (lead.agreedAmount ?? 0) > 0
            ? 'PAID'
            : totalPaid > 0
              ? 'PARTIAL'
              : 'PENDING'
      });
    } catch {
      toast.error('Failed to refresh');
    }
  };

  const grouped = {
    overdue: entries.filter(
      (e) =>
        e.status === 'OVERDUE' ||
        (e.status === 'PENDING' && e.dueDate && isPast(new Date(e.dueDate)))
    ),
    upcoming: entries.filter(
      (e) => e.status === 'PENDING' && (!e.dueDate || !isPast(new Date(e.dueDate)))
    ),
    paid: entries.filter((e) => e.status === 'PAID'),
    waived: entries.filter((e) => e.status === 'WAIVED'),
    pendingDeletion: entries.filter((e) => e.status === 'DELETION_REQUESTED')
  };

  const agreed = lead.agreedAmount ?? 0;
  const totalPaid = entries.filter((e) => e.status === 'PAID').reduce((s, e) => s + e.amount, 0);
  const outstanding = Math.max(0, agreed - totalPaid);

  const renderEntry = (entry: LeadPaymentEntry) => (
    <div
      key={entry.id}
      className={`py-2.5 ${entry.status === 'DELETION_REQUESTED' ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-2">
        {entryStatusIcon(entry)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-neutral-800 dark:text-neutral-100">
              {entry.label}
            </span>
            <span className="font-semibold text-sm">{fmt(entry.amount)}</span>
            <EntryStatusBadge entry={entry} />
            {entry.receiptUrl && (
              <a
                href={`/api/files/${entry.receiptUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                title="View receipt"
                className="text-neutral-400 hover:text-neutral-600"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-3 flex-wrap">
            <span>{MODE_LABELS[entry.mode as PaymentMode] ?? entry.mode}</span>
            {entry.dueDate && <span>Due: {format(new Date(entry.dueDate), 'dd MMM yyyy')}</span>}
            {entry.paidAt && <span>Paid: {format(new Date(entry.paidAt), 'dd MMM yyyy')}</span>}
          </div>
          {entry.note && <p className="text-xs text-neutral-400 mt-0.5 italic">{entry.note}</p>}
          {entry.status === 'DELETION_REQUESTED' && entry.deletionReason && (
            <p className="text-xs text-neutral-400 mt-0.5">Reason: {entry.deletionReason}</p>
          )}
        </div>

        {/* Actions */}
        {entry.status !== 'DELETION_REQUESTED' && (
          <div className="flex gap-1 flex-shrink-0">
            {entry.status !== 'PAID' && entry.status !== 'WAIVED' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                onClick={() => setMarkPaidEntry(entry)}
              >
                Mark Paid
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
            >
              {editingId === entry.id ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => setDeletionEntry(entry)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {editingId === entry.id && (
        <EditEntryForm
          entry={entry}
          leadId={lead.id}
          onDone={async () => {
            setEditingId(null);
            await refresh();
          }}
        />
      )}
    </div>
  );

  return (
    <>
      {markPaidEntry && (
        <MarkPaidDialog
          entry={markPaidEntry}
          leadId={lead.id}
          open={!!markPaidEntry}
          onClose={() => setMarkPaidEntry(null)}
          onDone={async () => {
            setMarkPaidEntry(null);
            await refresh();
          }}
        />
      )}

      {deletionEntry && (
        <RequestDeletionDialog
          entry={deletionEntry}
          leadId={lead.id}
          open={!!deletionEntry}
          onClose={() => setDeletionEntry(null)}
          onDone={async () => {
            setDeletionEntry(null);
            await refresh();
          }}
        />
      )}

      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) onClose();
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>{lead.name}</SheetTitle>
            {lead.courseInterest && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {lead.courseInterest}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm mt-2 flex-wrap">
              <div>
                <span className="text-neutral-400 text-xs">Agreed</span>
                <p className="font-semibold">{agreed > 0 ? fmt(agreed) : '—'}</p>
              </div>
              <div>
                <span className="text-neutral-400 text-xs">Paid</span>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {fmt(totalPaid)}
                </p>
              </div>
              <div>
                <span className="text-neutral-400 text-xs">Outstanding</span>
                <p className="font-semibold text-red-600 dark:text-red-400">
                  {outstanding > 0 ? fmt(outstanding) : '—'}
                </p>
              </div>
            </div>
          </SheetHeader>

          <div className="py-4 space-y-4">
            {/* Overdue */}
            {grouped.overdue.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-2">
                  Overdue
                </p>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {grouped.overdue.map(renderEntry)}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {grouped.upcoming.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-2">
                  Upcoming
                </p>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {grouped.upcoming.map(renderEntry)}
                </div>
              </div>
            )}

            {/* Pending deletion */}
            {grouped.pendingDeletion.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">
                  Pending Deletion Review
                </p>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {grouped.pendingDeletion.map(renderEntry)}
                </div>
              </div>
            )}

            {/* Paid */}
            {grouped.paid.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase mb-2">
                  Paid
                </p>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {grouped.paid.map(renderEntry)}
                </div>
              </div>
            )}

            {/* Waived */}
            {grouped.waived.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">Waived</p>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {grouped.waived.map(renderEntry)}
                </div>
              </div>
            )}

            {entries.length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-6">No payment entries yet.</p>
            )}

            {/* Add entry */}
            {!showAdd ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdd(true)}
                className="w-full gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Entry
              </Button>
            ) : (
              <AddEntryForm
                leadId={lead.id}
                entryCount={entries.length}
                onAdded={async () => {
                  setShowAdd(false);
                  await refresh();
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
