import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye } from 'lucide-react';
import { isTeacher } from '@/lib/teacher';
import getSafeProfile from '@/actions/get-safe-profile';
import { getBatchDetail, getBatchContent } from '@/actions/get-batches';
import { StudentBatchContent } from '../../_components/student-batch-content-view';

const PreviewPage = async ({ params }: { params: Promise<{ batchId: string }> }) => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const isAuthorized = await isTeacher();
  if (!isAuthorized) return redirect('/');

  const profile = await getSafeProfile();
  if (!profile) return redirect('/');

  const { batchId } = await params;
  const [batch, modules] = await Promise.all([
    getBatchDetail(batchId, userId, profile.role),
    getBatchContent(batchId, userId, profile.role)
  ]);

  if (!batch) return redirect('/teacher/offline-batches');

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Preview banner */}
      <div className="flex items-center gap-2 mb-6 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium">
        <Eye className="h-4 w-4 shrink-0" />
        Preview Mode — this is how students see the batch content
      </div>

      <Link
        href={`/teacher/offline-batches/${batchId}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Editor
      </Link>

      <h1 className="text-2xl font-semibold mb-1">{batch.title}</h1>
      {batch.description && (
        <p className="text-muted-foreground text-sm mb-6">{batch.description}</p>
      )}

      <StudentBatchContent batchId={batchId} modules={modules ?? []} isPreview />
    </div>
  );
};

export default PreviewPage;
