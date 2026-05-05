import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { isTeacher } from '@/lib/teacher';
import getSafeProfile from '@/actions/get-safe-profile';
import { getBatchDetail, getBatchContent } from '@/actions/get-batches';
import { db } from '@/lib/db';
import { BatchDetail } from './_components/batch-detail';

const BatchDetailPage = async ({ params }: { params: Promise<{ batchId: string }> }) => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const isAuthorized = await isTeacher();
  if (!isAuthorized) return redirect('/');

  const profile = await getSafeProfile();
  if (!profile) return redirect('/');

  const { batchId } = await params;
  const [batch, modules, allCourses] = await Promise.all([
    getBatchDetail(batchId, userId, profile.role),
    getBatchContent(batchId, userId, profile.role),
    db.course.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } })
  ]);

  if (!batch) return redirect('/teacher/offline-batches');

  return (
    <div className="p-6">
      <Link
        href="/teacher/offline-batches"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Batches
      </Link>

      <BatchDetail
        batchId={batch.id}
        title={batch.title}
        description={batch.description}
        startDate={batch.startDate}
        endDate={batch.endDate}
        status={batch.status}
        courses={batch.courses.map((bc) => ({
          id: bc.id,
          courseId: bc.courseId,
          course: bc.course
        }))}
        enrollments={batch.enrollments.map((e) => ({
          id: e.id,
          userId: e.userId,
          enrolledBy: e.enrolledBy,
          createdAt: e.createdAt.toISOString()
        }))}
        isAdmin={profile.role === 'ADMIN'}
        allCourses={allCourses}
        modules={modules ?? []}
      />
    </div>
  );
};

export default BatchDetailPage;
