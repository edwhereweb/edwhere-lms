import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { isStudentEnrolledInBatch } from '@/actions/get-batches';
import { isMcqWindowOpen } from '@/lib/session-upload';
import { db } from '@/lib/db';
import { StudentMcq } from '../../../_components/student-mcq';

type Params = { params: Promise<{ batchId: string; itemId: string }> };

const McqPage = async ({ params }: Params) => {
  const { userId } = await (await import('@clerk/nextjs/server')).auth();
  if (!userId) return redirect('/sign-in');

  const { batchId, itemId } = await params;
  const enrolled = await isStudentEnrolledInBatch(batchId, userId);
  if (!enrolled) return redirect('/dashboard');

  const session = await db.offlineSession.findUnique({
    where: { itemId },
    include: {
      item: { select: { title: true } },
      mcq: {
        include: {
          questions: { orderBy: { position: 'asc' } },
          submissions: { where: { userId } }
        }
      }
    }
  });

  if (!session?.mcq) return redirect(`/offline-batches/${batchId}`);

  const open = isMcqWindowOpen(session.scheduledAt, session.completedAt ?? null);
  const existing = session.mcq.submissions[0];

  if (!open && !existing) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <Link
          href={`/offline-batches/${batchId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Batch
        </Link>
        <div className="border rounded-lg p-8 text-center bg-amber-500/10 border-amber-500/20">
          <h2 className="text-lg font-semibold text-amber-700 mb-2">MCQ Window Closed</h2>
          <p className="text-sm text-amber-600">
            The assessment is only available during the session or up to 30 minutes after it
            finishes.
          </p>
        </div>
      </div>
    );
  }

  // Pre-generate shuffle map securely (same logic as API route for initial render state, though our StudentMcq will hit the API? No, we can just pass the props since this is an RSC)
  const questions = session.mcq.questions.map((q) => ({
    id: q.id,
    body: q.body,
    options: q.options
  }));

  let shuffleMap: number[] = [];
  let shuffledQuestions = questions;

  if (!existing) {
    const { generateShuffleMap } = await import('@/lib/session-upload');
    shuffleMap = generateShuffleMap(session.mcq.id, userId, questions.length);
    shuffledQuestions = shuffleMap.map((idx) => questions[idx]);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link
        href={`/offline-batches/${batchId}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Batch
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{session.item.title} — MCQ Assessment</h1>
        <p className="text-muted-foreground mt-1 text-sm">Session: {session.mcq.title}</p>
      </div>

      <StudentMcq
        batchId={batchId}
        itemId={itemId}
        mcqId={session.mcq.id}
        title={session.mcq.title}
        questions={shuffledQuestions}
        shuffleMap={shuffleMap}
        alreadySubmitted={!!existing}
        previousScore={existing?.score}
        total={session.mcq.questions.length}
      />
    </div>
  );
};

export default McqPage;
