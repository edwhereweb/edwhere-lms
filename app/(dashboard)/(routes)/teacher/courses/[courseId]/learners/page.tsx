import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';

import { db } from '@/lib/db';
import { canEditCourse } from '@/lib/course-auth';
import { IconBadge } from '@/components/icon-badge';

const CourseLearnersPage = async ({ params }: { params: { courseId: string } }) => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  // Check permissions — owner, instructor, or admin
  const allowed = await canEditCourse(userId, params.courseId);
  if (!allowed) return redirect('/teacher/courses');

  const course = await db.course.findUnique({
    where: { id: params.courseId }
  });

  if (!course) return redirect('/teacher/courses');

  const purchases = await db.purchase.findMany({
    where: {
      courseId: params.courseId
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const enrolledUserIds = purchases.map((p) => p.userId);

  const profiles = await db.profile.findMany({
    where: {
      userId: { in: enrolledUserIds }
    }
  });

  // Map purchases to profiles to include enrollment date
  const learners = purchases.map((purchase) => {
    const profile = profiles.find((p) => p.userId === purchase.userId);
    return {
      id: purchase.id,
      name: profile?.name || 'Unknown User',
      email: profile?.email || 'No email',
      enrolledAt: purchase.createdAt
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
            View students who have purchased this course
          </span>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-x-2 mb-6">
          <IconBadge icon={Users} />
          <h2 className="text-xl">Learner List ({learners.length})</h2>
        </div>

        {learners.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground mt-10 p-8 border rounded-md bg-slate-50 dark:bg-slate-900">
            No learners enrolled yet.
          </div>
        ) : (
          <div className="border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Enrolled Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {learners.map((learner) => (
                  <tr
                    key={learner.id}
                    className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      {learner.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{learner.email}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }).format(new Date(learner.enrolledAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseLearnersPage;
