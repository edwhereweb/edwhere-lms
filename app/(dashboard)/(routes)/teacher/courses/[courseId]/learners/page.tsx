import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';

import { db } from '@/lib/db';
import { canEditCourse } from '@/lib/course-auth';
import { IconBadge } from '@/components/icon-badge';
import { LearnerRowActions } from '@/app/(dashboard)/(routes)/teacher/courses/[courseId]/learners/_components/learner-row-actions';
import { Badge } from '@/components/ui/badge';
import { ListPagination } from '@/components/list-pagination';
import { getPageCount, getPagination } from '@/lib/pagination';

const LEARNERS_PAGE_SIZE = 50;

const CourseLearnersPage = async ({
  params,
  searchParams
}: {
  params: { courseId: string };
  searchParams: { page?: string };
}) => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const { page, skip, take } = getPagination(searchParams.page, LEARNERS_PAGE_SIZE);
  const purchaseWhere = { courseId: params.courseId };

  // Permission check and data load run in parallel; nothing renders unless allowed.
  const [allowed, course, totalLearners, purchases] = await Promise.all([
    canEditCourse(userId, params.courseId),
    db.course.findUnique({ where: { id: params.courseId }, select: { id: true } }),
    db.purchase.count({ where: purchaseWhere }),
    db.purchase.findMany({
      where: purchaseWhere,
      orderBy: { createdAt: 'desc' },
      select: { id: true, userId: true, createdAt: true, onboardingSource: true },
      skip,
      take
    })
  ]);

  if (!allowed || !course) return redirect('/teacher/courses');

  const profiles = await db.profile.findMany({
    where: {
      userId: { in: purchases.map((p) => p.userId) }
    },
    select: { userId: true, name: true, email: true }
  });
  const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));

  // Map purchases to profiles to include enrollment date
  const learners = purchases.map((purchase) => {
    const profile = profileByUserId.get(purchase.userId);
    const sourceValue = (purchase as { onboardingSource?: string }).onboardingSource;
    const onboardingSource: 'PAID' | 'MANUAL' | 'PAID_MANUAL' | 'UNKNOWN' =
      sourceValue === 'PAID' || sourceValue === 'MANUAL' || sourceValue === 'PAID_MANUAL'
        ? sourceValue
        : 'UNKNOWN';
    return {
      id: purchase.id,
      studentId: purchase.userId,
      name: profile?.name || 'Unknown User',
      email: profile?.email || 'No email',
      enrolledAt: purchase.createdAt,
      onboardingSource
    };
  });

  return (
    <div className="p-6">
      <Link
        href={`/teacher/courses`}
        className="flex items-center text-sm hover:opacity-75 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to courses
      </Link>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-y-2">
          <h1 className="text-2xl font-medium">Enrolled Learners</h1>
          <span className="text-sm text-slate-700 dark:text-slate-300">
            View students who are enrolled in this course
          </span>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-x-2 mb-6">
          <IconBadge icon={Users} />
          <h2 className="text-xl">Learner List ({totalLearners})</h2>
        </div>

        {learners.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground mt-10 p-8 border rounded-md bg-muted/30">
            No learners enrolled yet.
          </div>
        ) : (
          <div className="border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Onboarding</th>
                  <th className="px-6 py-3 font-medium">Enrolled Date</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {learners.map((learner) => (
                  <tr key={learner.id} className="bg-card hover:bg-muted/40 transition">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      {learner.name}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{learner.email}</td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          learner.onboardingSource === 'PAID' ||
                          learner.onboardingSource === 'PAID_MANUAL'
                            ? 'default'
                            : 'secondary'
                        }
                        className={
                          learner.onboardingSource === 'PAID'
                            ? 'bg-emerald-600'
                            : learner.onboardingSource === 'PAID_MANUAL'
                              ? 'bg-amber-600'
                              : ''
                        }
                      >
                        {learner.onboardingSource === 'PAID'
                          ? 'Paid'
                          : learner.onboardingSource === 'PAID_MANUAL'
                            ? 'Paid Manually'
                            : learner.onboardingSource === 'MANUAL'
                              ? 'Manual'
                              : 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }).format(new Date(learner.enrolledAt))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <LearnerRowActions
                        courseId={params.courseId}
                        purchaseId={learner.id}
                        studentId={learner.studentId}
                        learnerName={learner.name}
                        onboardingSource={learner.onboardingSource}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ListPagination page={page} pageCount={getPageCount(totalLearners, LEARNERS_PAGE_SIZE)} />
      </div>
    </div>
  );
};

export default CourseLearnersPage;
