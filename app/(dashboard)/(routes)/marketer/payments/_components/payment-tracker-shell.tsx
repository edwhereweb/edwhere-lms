'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { LeadPaymentCard } from './lead-payment-card';
import type { LeadWithPayments } from '../page';

type FilterTab = 'ALL' | 'OVERDUE' | 'UPCOMING' | 'PAID';

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
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
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

  // Leads whose earliest pending/overdue entry has a past due date
  const overdueLeads = filtered.filter((l) =>
    l.paymentEntries.some(
      (e) =>
        (e.status === 'OVERDUE' ||
          (e.status === 'PENDING' && e.dueDate && new Date(e.dueDate) < new Date())) &&
        l.overallStatus !== 'PAID'
    )
  );

  // Leads with pending entries whose due date is in the future (or has no due date)
  const upcomingLeads = filtered.filter(
    (l) =>
      l.overallStatus !== 'PAID' &&
      !overdueLeads.includes(l) &&
      l.paymentEntries.some(
        (e) => e.status === 'PENDING' && (!e.dueDate || new Date(e.dueDate) >= new Date())
      )
  );

  const totalCollected = leads.reduce((s, l) => s + l.totalPaid, 0);
  const totalOutstanding = leads.reduce((s, l) => s + Math.max(0, l.outstanding), 0);

  const handleLeadUpdated = (updated: LeadWithPayments) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const filterTabs: { key: FilterTab; label: string; count: number; color: string }[] = [
    {
      key: 'ALL',
      label: 'All',
      count: filtered.length,
      color: 'text-neutral-700 dark:text-neutral-300'
    },
    {
      key: 'OVERDUE',
      label: 'Due Date Exceeded',
      count: overdueLeads.length,
      color: 'text-red-600 dark:text-red-400'
    },
    {
      key: 'UPCOMING',
      label: 'Upcoming',
      count: upcomingLeads.length,
      color: 'text-amber-600 dark:text-amber-400'
    },
    {
      key: 'PAID',
      label: 'Fully Paid',
      count: fullyPaid.length,
      color: 'text-emerald-600 dark:text-emerald-400'
    }
  ];

  // Derive the visible lead groups based on the active filter
  const visibleNeedsAttention =
    activeFilter === 'ALL' ? needsAttention : activeFilter === 'OVERDUE' ? overdueLeads : [];
  const visibleInProgress =
    activeFilter === 'ALL' ? inProgress : activeFilter === 'UPCOMING' ? upcomingLeads : [];
  const visibleFullyPaid = activeFilter === 'ALL' || activeFilter === 'PAID' ? fullyPaid : [];

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

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              activeFilter === tab.key
                ? 'border-[#F80602] bg-red-50 text-[#F80602] dark:bg-red-950/30 dark:border-red-500'
                : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
            }`}
          >
            <span className={activeFilter === tab.key ? '' : tab.color}>{tab.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                activeFilter === tab.key
                  ? 'bg-red-100 text-[#F80602] dark:bg-red-900/40'
                  : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {leads.length === 0 && (
        <div className="text-center py-20 text-neutral-400">
          <p className="text-lg font-medium mb-1">No closed leads yet</p>
          <p className="text-sm">Go to Leads and mark a lead as Won to get started.</p>
        </div>
      )}

      {leads.length > 0 &&
        visibleNeedsAttention.length === 0 &&
        visibleInProgress.length === 0 &&
        visibleFullyPaid.length === 0 && (
          <div className="text-center py-16 text-neutral-400">
            <p className="text-sm">No leads match the selected filter.</p>
          </div>
        )}

      {/* ⚠️ Overdue / Needs Attention */}
      {visibleNeedsAttention.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            {activeFilter === 'OVERDUE'
              ? `Due Date Exceeded (${visibleNeedsAttention.length})`
              : `Needs Attention (${visibleNeedsAttention.length})`}
          </h2>
          <div className="space-y-3">
            {visibleNeedsAttention.map((lead) => (
              <LeadPaymentCard key={lead.id} lead={lead} onUpdated={handleLeadUpdated} />
            ))}
          </div>
        </section>
      )}

      {/* 📋 In Progress / Upcoming */}
      {visibleInProgress.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
            <span>📋</span>
            {activeFilter === 'UPCOMING'
              ? `Upcoming (${visibleInProgress.length})`
              : `In Progress (${visibleInProgress.length})`}
          </h2>
          <div className="space-y-3">
            {visibleInProgress.map((lead) => (
              <LeadPaymentCard key={lead.id} lead={lead} onUpdated={handleLeadUpdated} />
            ))}
          </div>
        </section>
      )}

      {/* ✅ Fully Paid */}
      {visibleFullyPaid.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setPaidExpanded((p) => !p)}
            className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2 hover:opacity-80"
          >
            <span>✅</span> Fully Paid ({visibleFullyPaid.length})
            {activeFilter === 'ALL' && (
              <span className="text-xs font-normal text-neutral-400">
                {paidExpanded ? '(collapse)' : '(expand)'}
              </span>
            )}
          </button>
          {(paidExpanded || activeFilter === 'PAID') && (
            <div className="space-y-3">
              {visibleFullyPaid.map((lead) => (
                <LeadPaymentCard key={lead.id} lead={lead} onUpdated={handleLeadUpdated} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
