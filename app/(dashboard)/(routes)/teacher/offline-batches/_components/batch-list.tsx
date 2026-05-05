'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, BookMarked, Users, CalendarDays, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BatchSummary, BatchStatus } from '@/actions/get-batches';

const STATUS_TABS: { label: string; value: BatchStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' }
];

const STATUS_BADGE: Record<BatchStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  draft: 'bg-muted text-muted-foreground',
  archived: 'bg-orange-500/15 text-orange-700 dark:text-orange-400'
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

interface BatchListProps {
  batches: BatchSummary[];
  canCreate: boolean;
}

export function BatchList({ batches, canCreate }: BatchListProps) {
  const [activeTab, setActiveTab] = useState<BatchStatus | 'all'>('all');

  const filtered = useMemo(
    () => (activeTab === 'all' ? batches : batches.filter((b) => b.status === activeTab)),
    [batches, activeTab]
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Offline Batches</h1>
        {canCreate && (
          <Link href="/teacher/offline-batches/create">
            <Button id="create-batch-btn">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Batch
            </Button>
          </Link>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            id={`batch-tab-${tab.value}`}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.value
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-muted-foreground">
              (
              {activeTab === tab.value || tab.value === 'all'
                ? tab.value === 'all'
                  ? batches.length
                  : batches.filter((b) => b.status === tab.value).length
                : batches.filter((b) => b.status === tab.value).length}
              )
            </span>
          </button>
        ))}
      </div>

      {/* Batch grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No batches found in this category.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((batch) => (
            <Link
              key={batch.id}
              href={`/teacher/offline-batches/${batch.id}`}
              id={`batch-card-${batch.id}`}
            >
              <div className="group border rounded-lg p-5 bg-card hover:shadow-md transition-shadow h-full flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h2 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                    {batch.title}
                  </h2>
                  <Badge className={cn('capitalize shrink-0', STATUS_BADGE[batch.status])}>
                    {batch.status}
                  </Badge>
                </div>

                {batch.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {batch.description}
                  </p>
                )}

                <div className="mt-auto space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {formatDate(batch.startDate)} → {formatDate(batch.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <BookMarked className="h-3.5 w-3.5" />
                      {batch.courseCount} course{batch.courseCount !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {batch.studentCount} student{batch.studentCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end mt-3">
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
