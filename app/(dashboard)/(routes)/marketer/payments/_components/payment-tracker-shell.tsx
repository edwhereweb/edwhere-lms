'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { LeadPaymentCard } from './lead-payment-card';
import type { LeadWithPayments } from '../page';

interface PaymentTrackerShellProps {
  leads: LeadWithPayments[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n);

export function PaymentTrackerShell({ leads: initialLeads }: PaymentTrackerShellProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState('');
  const [paidExpanded, setPaidExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        (l.courseInterest ?? '').toLowerCase().includes(q)
    );
  }, [leads, search]);

  const needsAttention = filtered.filter(
    (l) =>
      l.overallStatus === 'OVERDUE' ||
      (l.overallStatus !== 'PAID' &&
        l.paymentEntries.some(
          (e) =>
            (e.status === 'PENDING' || e.status === 'OVERDUE') &&
            e.dueDate &&
            new Date(e.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        ))
  );

  const inProgress = filtered.filter(
    (l) => !needsAttention.includes(l) && l.overallStatus !== 'PAID'
  );

  const fullyPaid = filtered.filter((l) => l.overallStatus === 'PAID');

  const totalCollected = leads.reduce((s, l) => s + l.totalPaid, 0);
  const totalOutstanding = leads.reduce((s, l) => s + Math.max(0, l.outstanding), 0);

  const handleLeadUpdated = (updated: LeadWithPayments) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            label: 'Total Closed',
            value: leads.length,
            color: 'text-neutral-700 dark:text-neutral-300'
          },
          {
            label: 'Needs Attention',
            value: needsAttention.length,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            label: 'In Progress',
            value: inProgress.length,
            color: 'text-amber-600 dark:text-amber-400'
          },
          {
            label: 'Fully Paid',
            value: fullyPaid.length,
            color: 'text-emerald-600 dark:text-emerald-400'
          },
          {
            label: 'Outstanding',
            value: fmt(totalOutstanding),
            color: 'text-red-600 dark:text-red-400'
          }
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border bg-white dark:bg-neutral-900 shadow-sm p-4"
          >
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Extra stat */}
      <div className="-mt-3 rounded-xl border bg-white dark:bg-neutral-900 shadow-sm p-4 flex items-center justify-between">
        <span className="text-sm text-neutral-500 dark:text-neutral-400">Total Collected</span>
        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
          {fmt(totalCollected)}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          className="pl-9"
          placeholder="Search leads, courses, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {leads.length === 0 && (
        <div className="text-center py-20 text-neutral-400">
          <p className="text-lg font-medium mb-1">No closed leads yet</p>
          <p className="text-sm">Go to Leads and mark a lead as Won to get started.</p>
        </div>
      )}

      {/* ⚠️ Needs Attention */}
      {needsAttention.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
            <span>⚠️</span> Needs Attention ({needsAttention.length})
          </h2>
          <div className="space-y-3">
            {needsAttention.map((lead) => (
              <LeadPaymentCard key={lead.id} lead={lead} onUpdated={handleLeadUpdated} />
            ))}
          </div>
        </section>
      )}

      {/* 📋 In Progress */}
      {inProgress.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
            <span>📋</span> In Progress ({inProgress.length})
          </h2>
          <div className="space-y-3">
            {inProgress.map((lead) => (
              <LeadPaymentCard key={lead.id} lead={lead} onUpdated={handleLeadUpdated} />
            ))}
          </div>
        </section>
      )}

      {/* ✅ Fully Paid */}
      {fullyPaid.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setPaidExpanded((p) => !p)}
            className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2 hover:opacity-80"
          >
            <span>✅</span> Fully Paid ({fullyPaid.length})
            <span className="text-xs font-normal text-neutral-400">
              {paidExpanded ? '(collapse)' : '(expand)'}
            </span>
          </button>
          {paidExpanded && (
            <div className="space-y-3">
              {fullyPaid.map((lead) => (
                <LeadPaymentCard key={lead.id} lead={lead} onUpdated={handleLeadUpdated} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
