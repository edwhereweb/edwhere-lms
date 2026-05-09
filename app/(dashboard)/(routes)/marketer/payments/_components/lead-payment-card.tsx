'use client';

import { useState } from 'react';
import { format, isPast, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Zap, ListOrdered } from 'lucide-react';
import type { LeadWithPayments } from '../page';
import { QuickLogSheet } from './quick-log-sheet';
import { PaymentPlanPanel } from './payment-plan-panel';

interface LeadPaymentCardProps {
  lead: LeadWithPayments;
  onUpdated: (updated: LeadWithPayments) => void;
}

const statusConfig = {
  PAID: {
    label: 'Paid',
    classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
  },
  PARTIAL: {
    label: 'Partial',
    classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
  },
  PENDING: {
    label: 'Pending',
    classes: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
  },
  OVERDUE: {
    label: 'Overdue',
    classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  },
  DEFAULTED: {
    label: 'Defaulted',
    classes: 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200'
  }
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n);

function NextDueWarning({ lead }: { lead: LeadWithPayments }) {
  const upcoming = lead.paymentEntries
    .filter((e) => (e.status === 'PENDING' || e.status === 'OVERDUE') && e.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  if (!upcoming.length) return null;

  const next = upcoming[0];
  const dueDate = new Date(next.dueDate!);
  const overdue = isPast(dueDate);
  const daysAway = differenceInDays(dueDate, new Date());

  return (
    <p
      className={`text-xs font-medium mt-1.5 ${overdue ? 'text-red-600 dark:text-red-400' : daysAway <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-500 dark:text-neutral-400'}`}
    >
      {overdue
        ? `⚠️ ${fmt(next.amount)} overdue since ${format(dueDate, 'dd MMM')}`
        : `Next: ${fmt(next.amount)} due ${format(dueDate, 'dd MMM')} (in ${daysAway} day${daysAway !== 1 ? 's' : ''})`}
    </p>
  );
}

export function LeadPaymentCard({ lead, onUpdated }: LeadPaymentCardProps) {
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showPlan, setShowPlan] = useState(false);

  const agreed = lead.agreedAmount ?? 0;
  const pct = agreed > 0 ? Math.min(100, Math.round((lead.totalPaid / agreed) * 100)) : 0;
  const cfg = statusConfig[lead.overallStatus];

  return (
    <>
      <QuickLogSheet
        lead={lead}
        open={showQuickLog}
        onClose={() => setShowQuickLog(false)}
        onSaved={onUpdated}
      />
      <PaymentPlanPanel
        lead={lead}
        open={showPlan}
        onClose={() => setShowPlan(false)}
        onUpdated={onUpdated}
      />

      <div className="rounded-xl border bg-white dark:bg-neutral-900 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Left: info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-neutral-800 dark:text-neutral-100">{lead.name}</p>
            {lead.courseInterest && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                · {lead.courseInterest}
              </span>
            )}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}
            >
              {cfg.label}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              <span>{fmt(lead.totalPaid)} collected</span>
              <span>{agreed > 0 ? `of ${fmt(agreed)}` : 'No target set'}</span>
            </div>
            {agreed > 0 && (
              <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${lead.overallStatus === 'PAID' ? 'bg-emerald-500' : lead.overallStatus === 'OVERDUE' ? 'bg-red-500' : 'bg-amber-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>

          <NextDueWarning lead={lead} />
        </div>

        {/* Right: actions */}
        {lead.overallStatus !== 'PAID' && (
          <div className="flex gap-2 sm:flex-col">
            <Button
              size="sm"
              onClick={() => setShowQuickLog(true)}
              className="gap-1.5 bg-[#F80602] hover:bg-red-700 text-white text-xs h-8"
            >
              <Zap className="h-3.5 w-3.5" />
              Quick Log
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPlan(true)}
              className="gap-1.5 text-xs h-8"
            >
              <ListOrdered className="h-3.5 w-3.5" />
              View Plan
            </Button>
          </div>
        )}
        {lead.overallStatus === 'PAID' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPlan(true)}
            className="gap-1.5 text-xs h-8"
          >
            <ListOrdered className="h-3.5 w-3.5" />
            View Plan
          </Button>
        )}
      </div>
    </>
  );
}
