import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import {
  getStudentBatches,
  getBatchContent,
  isStudentEnrolledInBatch,
  getStudentBatchGamification
} from '@/actions/get-batches';
import { StudentBatchContentWrapper } from './_components/student-batch-content';
import { BatchGamificationStats } from './_components/batch-gamification-stats';
import { BatchLeaderboard } from './_components/batch-leaderboard';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

const StudentBatchDetailPage = async ({ params }: { params: Promise<{ batchId: string }> }) => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const { batchId } = await params;

  const enrolled = await isStudentEnrolledInBatch(batchId, userId);
  if (!enrolled) return redirect('/offline-batches');

  const [batches, modules, stats] = await Promise.all([
    getStudentBatches(userId),
    getBatchContent(batchId, userId, 'STUDENT'),
    getStudentBatchGamification(batchId, userId)
  ]);

  const batch = batches.find((b) => b.id === batchId);
  if (!batch) return redirect('/offline-batches');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link
        href="/offline-batches"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        My Batches
      </Link>

      <h1 className="text-2xl font-semibold mb-1">{batch.title}</h1>
      {batch.description && (
        <p className="text-muted-foreground text-sm mb-2">{batch.description}</p>
      )}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
        <CalendarDays className="h-3.5 w-3.5" />
        {formatDate(batch.startDate)} → {formatDate(batch.endDate)}
      </div>

      {stats && (
        <BatchGamificationStats
          streak={stats.attendanceStreak}
          rank={stats.rank}
          score={stats.totalMcqScore}
          possible={stats.totalMcqPossible}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <StudentBatchContentWrapper batchId={batchId} modules={modules ?? []} />
        </div>
        <div className="space-y-6">
          <BatchLeaderboard batchId={batchId} currentUserId={userId} />
        </div>
      </div>
    </div>
  );
};

export default StudentBatchDetailPage;
