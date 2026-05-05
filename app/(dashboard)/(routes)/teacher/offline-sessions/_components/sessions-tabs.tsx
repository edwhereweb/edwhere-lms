'use client';

import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, BookMarked, Users, Clock, CheckCircle2, History } from 'lucide-react';
import type { BatchSummary } from '@/actions/get-batches';

// 10-minute boundary in milliseconds
const TEN_MIN_MS = 10 * 60 * 1000;
// 30-minute grace period after end date
const THIRTY_MIN_MS = 30 * 60 * 1000;

type SessionBucket = 'upcoming' | 'ongoing' | 'past';

function classifySession(startDate: string | null, endDate: string | null): SessionBucket {
  const now = Date.now();
  const start = startDate ? new Date(startDate).getTime() : null;
  const end = endDate ? new Date(endDate).getTime() : null;

  // No dates → treat as upcoming (not yet scheduled)
  if (!start && !end) return 'upcoming';

  // Past: end + 30min has fully elapsed
  if (end && end + THIRTY_MIN_MS <= now) return 'past';

  // Ongoing: starts within the next 10 minutes, and hasn't fully ended yet
  if (start && start <= now + TEN_MIN_MS) return 'ongoing';

  return 'upcoming';
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

interface SessionsTabsProps {
  batches: BatchSummary[];
}

function BatchRow({ batch }: { batch: BatchSummary }) {
  return (
    <div className="flex items-start justify-between px-4 py-4 border-b last:border-0 hover:bg-muted/40">
      <div className="space-y-1">
        <p className="font-medium text-sm">{batch.title}</p>
        {batch.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{batch.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatDate(batch.startDate)} → {formatDate(batch.endDate)}
          </span>
          <span className="flex items-center gap-1">
            <BookMarked className="h-3 w-3" />
            {batch.courseCount}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {batch.studentCount}
          </span>
        </div>
      </div>
      <Badge variant="outline" className="shrink-0 text-xs capitalize">
        {batch.status}
      </Badge>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground text-center py-12">
      No {label} sessions right now.
    </p>
  );
}

export function SessionsTabs({ batches }: SessionsTabsProps) {
  const { upcoming, ongoing, past } = useMemo(() => {
    const buckets = {
      upcoming: [] as BatchSummary[],
      ongoing: [] as BatchSummary[],
      past: [] as BatchSummary[]
    };
    for (const b of batches) {
      buckets[classifySession(b.startDate, b.endDate)].push(b);
    }
    return buckets;
  }, [batches]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Offline Sessions</h1>

      <Tabs defaultValue="upcoming">
        <TabsList id="sessions-tabs">
          <TabsTrigger value="upcoming" id="sessions-tab-upcoming">
            <Clock className="h-4 w-4 mr-1.5" />
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="ongoing" id="sessions-tab-ongoing">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Ongoing ({ongoing.length})
          </TabsTrigger>
          <TabsTrigger value="past" id="sessions-tab-past">
            <History className="h-4 w-4 mr-1.5" />
            Past ({past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <div className="border rounded-lg">
            {upcoming.length === 0 ? (
              <EmptyState label="upcoming" />
            ) : (
              upcoming.map((b) => <BatchRow key={b.id} batch={b} />)
            )}
          </div>
        </TabsContent>

        <TabsContent value="ongoing" className="mt-6">
          <div className="border rounded-lg">
            {ongoing.length === 0 ? (
              <EmptyState label="ongoing" />
            ) : (
              ongoing.map((b) => <BatchRow key={b.id} batch={b} />)
            )}
          </div>
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          <div className="border rounded-lg">
            {past.length === 0 ? (
              <EmptyState label="past" />
            ) : (
              past.map((b) => <BatchRow key={b.id} batch={b} />)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
