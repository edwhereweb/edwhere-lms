'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StudentBatch, BatchStatus } from '@/actions/get-batches';

const STATUS_TABS: { label: string; value: BatchStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
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

interface StudentBatchListProps {
  batches: StudentBatch[];
}

export function StudentBatchList({ batches }: StudentBatchListProps) {
  const [activeTab, setActiveTab] = useState<BatchStatus | 'all'>('all');

  const filtered = useMemo(
    () => (activeTab === 'all' ? batches : batches.filter((b) => b.status === activeTab)),
    [batches, activeTab]
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">My Offline Batches</h1>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            id={`student-batch-tab-${tab.value}`}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.value
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No batches found.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((batch) => (
            <Link
              key={batch.id}
              href={`/offline-batches/${batch.id}`}
              id={`student-batch-card-${batch.id}`}
              className="block group"
            >
              <div className="border rounded-lg p-5 bg-card h-full flex flex-col group-hover:shadow-md transition-shadow">
                {/* Batch header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h2 className="font-semibold text-base line-clamp-2">{batch.title}</h2>
                  <Badge className={cn('capitalize shrink-0', STATUS_BADGE[batch.status])}>
                    {batch.status}
                  </Badge>
                </div>

                {batch.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {batch.description}
                  </p>
                )}

                {/* Date range */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {formatDate(batch.startDate)} → {formatDate(batch.endDate)}
                  </span>
                </div>

                {/* Courses list */}
                {batch.courses.length > 0 && (
                  <div className="mt-auto space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Courses
                    </p>
                    {batch.courses.map((course) => (
                      <Link
                        key={course.id}
                        href={`/courses/${course.id}`}
                        id={`student-batch-course-${course.id}`}
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="line-clamp-1">{course.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
