'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { LeadWithPayments } from '../page';

type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'RAZORPAY' | 'CHEQUE' | 'OTHER';

const MODES: { value: PaymentMode; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank' },
  { value: 'RAZORPAY', label: 'Razorpay' },
  { value: 'OTHER', label: 'Other' }
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n);

interface QuickLogSheetProps {
  lead: LeadWithPayments;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: LeadWithPayments) => void;
}

export function QuickLogSheet({ lead, open, onClose, onSaved }: QuickLogSheetProps) {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<PaymentMode>('CASH');
  const [showDetails, setShowDetails] = useState(false);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const outstanding = Math.max(0, lead.outstanding);

  const reset = () => {
    setAmount('');
    setMode('CASH');
    setShowDetails(false);
    setLabel('');
    setNote('');
    setDueDate('');
  };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      const entryCount = lead.paymentEntries.length + 1;
      await axios.post(`/api/leads/${lead.id}/payments`, {
        label: label.trim() || `Payment #${entryCount}`,
        amount: amt,
        mode,
        note: note || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined
      });

      // Mark newly created entry as paid immediately (quick log = money already received)
      const refreshed = await axios.get(`/api/leads/${lead.id}/payments`);
      const entries = refreshed.data.lead.paymentEntries;
      const newEntry = entries[entries.length - 1];

      await axios.post(`/api/leads/${lead.id}/payments/${newEntry.id}/mark-paid`, {});

      const finalData = await axios.get(`/api/leads/${lead.id}/payments`);
      const updatedLead = finalData.data;

      const totalPaid = updatedLead.lead.paymentEntries
        .filter((e: { status: string }) => e.status === 'PAID')
        .reduce((s: number, e: { amount: number }) => s + e.amount, 0);
      const totalWaived = updatedLead.lead.paymentEntries
        .filter((e: { status: string }) => e.status === 'WAIVED')
        .reduce((s: number, e: { amount: number }) => s + e.amount, 0);
      const outstandingNew = (lead.agreedAmount ?? 0) - totalPaid - totalWaived;

      onSaved({
        ...lead,
        paymentEntries: updatedLead.lead.paymentEntries,
        totalPaid,
        totalWaived,
        outstanding: outstandingNew,
        overallStatus:
          outstandingNew <= 0 && (lead.agreedAmount ?? 0) > 0
            ? 'PAID'
            : totalPaid > 0
              ? 'PARTIAL'
              : 'PENDING'
      });

      toast.success('Payment recorded!');
      reset();
      onClose();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Log Payment — {lead.name}</SheetTitle>
          {outstanding > 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Outstanding:{' '}
              <span className="font-semibold text-red-600 dark:text-red-400">
                {fmt(outstanding)}
              </span>
            </p>
          )}
        </SheetHeader>

        <div className="space-y-4">
          {/* Amount — auto focused */}
          <div>
            <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mb-1.5">
              AMOUNT (₹)
            </label>
            <Input
              id="quick-log-amount"
              type="number"
              min={0}
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              className="text-lg font-semibold h-12"
            />
          </div>

          {/* Mode chips */}
          <div>
            <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mb-1.5">
              PAYMENT MODE
            </label>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    mode === m.value
                      ? 'border-[#F80602] bg-red-50 text-[#F80602] dark:bg-red-950/30 dark:text-red-400'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible details */}
          <button
            type="button"
            onClick={() => setShowDetails((p) => !p)}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            {showDetails ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {showDetails ? 'Hide details' : 'Add label / note / due date'}
          </button>

          {showDetails && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-150">
              <div>
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mb-1.5">
                  LABEL (optional)
                </label>
                <Input
                  placeholder="e.g. Registration fee, Module 2…"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mb-1.5">
                  NOTE (optional)
                </label>
                <Textarea
                  placeholder="Any note about this payment…"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mb-1.5">
                  DUE DATE (optional)
                </label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !amount}
            className="w-full h-11 text-base bg-[#F80602] hover:bg-red-700 text-white"
          >
            {saving ? 'Recording…' : 'Mark as Received'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
