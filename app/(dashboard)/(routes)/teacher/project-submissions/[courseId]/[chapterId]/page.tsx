import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ExternalLink, User } from 'lucide-react';
import { db } from '@/lib/db';
import { canEditCourse } from '@/lib/course-auth';
import { SubmissionReviewActions } from './_components/submission-review-actions';

interface Props {
  params: { courseId: string; chapterId: string };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '🕐 Pending Review',
  APPROVED: '✅ Approved',
  REJECTED: '❌ Rejected'
};

export default async function ProjectSubmissionsChapterPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const allowed = await canEditCourse(userId, params.courseId);
  if (!allowed) return redirect('/teacher/project-submissions');

  const [course, chapter] = await Promise.all([
    db.course.findUnique({ where: { id: params.courseId }, select: { title: true } }),
    db.chapter.findUnique({ where: { id: params.chapterId }, select: { title: true } })
  ]);
  if (!course || !chapter) return redirect(`/teacher/project-submissions/${params.courseId}`);

  // Use $runCommandRaw to read status/reviewNote which the stale Prisma client would strip.
  // Remove this once the dev server is restarted and `npx prisma generate` has been re-run.
  type RawSubmission = {
    _id: { $oid: string };
    userId: string;
    driveUrl: string;
    chapterId: { $oid: string };
    status?: string;
    reviewNote?: string | null;
    reviewedAt?: { $date: string } | null;
    reviewedBy?: string | null;
    createdAt: { $date: string };
    updatedAt: { $date: string };
  };

  const rawResult = (await db.$runCommandRaw({
    find: 'ProjectSubmission',
    filter: { chapterId: { $oid: params.chapterId } },
    sort: { updatedAt: -1 }
  })) as { cursor: { firstBatch: RawSubmission[] } };

  const rawDocs = rawResult?.cursor?.firstBatch ?? [];

  const userIds = rawDocs.map((s) => s.userId);
  const profiles = await db.profile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, name: true, email: true, imageUrl: true }
  });
  const profileMap = Object.fromEntries(profiles.map((p) => [p.userId, p]));

  // Normalise to a plain shape the template can use
  const submissions = rawDocs.map((s) => ({
    id: s._id.$oid,
    userId: s.userId,
    driveUrl: s.driveUrl,
    status: s.status ?? 'PENDING',
    reviewNote: s.reviewNote ?? null,
    updatedAt: new Date(s.updatedAt.$date)
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/teacher/project-submissions" className="hover:text-foreground transition">
          Student Submissions
        </Link>
        <span>/</span>
        <Link
          href={`/teacher/project-submissions/${params.courseId}`}
          className="hover:text-foreground transition"
        >
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{chapter.title}</span>
      </div>

      <Link
        href={`/teacher/project-submissions/${params.courseId}`}
        className="flex items-center gap-1.5 text-sm hover:opacity-75 transition mb-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {course.title}
      </Link>
      <h1 className="text-2xl font-bold mb-2">{chapter.title}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
      </p>

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed rounded-xl">
          <User className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No submissions yet</p>
          <p className="text-sm mt-1">Students have not submitted their work for this project.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const student = profileMap[sub.userId];
            return (
              <div
                key={sub.id}
                className="border rounded-xl p-4 bg-white dark:bg-gray-800 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Student info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {student?.imageUrl ? (
                      <Image
                        src={student.imageUrl}
                        alt={student.name}
                        width={40}
                        height={40}
                        className="rounded-full shrink-0 object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{student?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {student?.email ?? ''}
                      </p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 self-start ${
                      sub.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : sub.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}
                  >
                    {STATUS_LABELS[sub.status] ?? sub.status}
                  </span>
                </div>

                {/* Submission link */}
                <div className="mt-3 flex items-center gap-2">
                  <a
                    href={sub.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium truncate max-w-sm"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    View Submission
                  </a>
                  <span className="text-xs text-muted-foreground">
                    · submitted{' '}
                    {new Date(sub.updatedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {/* Reviewer note */}
                {sub.reviewNote && (
                  <div className="mt-2 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900/30 rounded-md px-3 py-2 border">
                    <span className="font-medium">Note to student:</span> {sub.reviewNote}
                  </div>
                )}

                {/* Review actions */}
                <div className="mt-3 flex justify-end">
                  <SubmissionReviewActions
                    submissionId={sub.id}
                    courseId={params.courseId}
                    chapterId={params.chapterId}
                    currentStatus={sub.status}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
