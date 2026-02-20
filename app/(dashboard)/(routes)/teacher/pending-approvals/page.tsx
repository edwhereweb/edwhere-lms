import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { formatPrice } from '@/lib/format';
import { PendingCourseActions } from './_components/pending-course-actions';

const PendingApprovalsPage = async () => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const profile = await getSafeProfile();
  if (!profile || profile.role !== 'ADMIN') return redirect('/dashboard');

  const pendingCourses = await db.course.findMany({
    where: { pendingApproval: true },
    include: {
      category: true,
      chapters: { where: { isPublished: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-x-2 mb-2">
        <Clock className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-bold">Pending Approvals</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Courses submitted by teachers waiting for your approval before going live.
      </p>

      {pendingCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CheckCircle className="h-12 w-12 mb-4 text-green-500" />
          <p className="text-lg font-medium">All caught up!</p>
          <p className="text-sm">No courses pending approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingCourses.map((course) => (
            <div
              key={course.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm"
            >
              <div className="flex-1 min-w-0 mr-4">
                <h2 className="font-semibold text-base truncate">{course.title}</h2>
                <div className="flex items-center gap-x-3 mt-1 text-xs text-muted-foreground">
                  {course.category && (
                    <span className="bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                      {course.category.name}
                    </span>
                  )}
                  <span>{course.chapters.length} published chapter(s)</span>
                  {course.price && <span>{formatPrice(course.price)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-x-2 shrink-0">
                <Link
                  href={`/teacher/courses/${course.id}/details`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Review
                </Link>
                <PendingCourseActions courseId={course.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingApprovalsPage;
