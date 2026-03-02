import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { ClipboardList, BookOpen } from 'lucide-react';
import getSafeProfile from '@/actions/get-safe-profile';

export default async function ProjectSubmissionsPage() {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const profile = await getSafeProfile();
  if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'TEACHER'))
    return redirect('/dashboard');

  const isAdmin = profile.role === 'ADMIN';

  const courses = await db.course.findMany({
    where: isAdmin
      ? { chapters: { some: { contentType: 'HANDS_ON_PROJECT' } } }
      : {
          chapters: { some: { contentType: 'HANDS_ON_PROJECT' } },
          OR: [{ userId }, { instructors: { some: { profile: { userId } } } }]
        },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      chapters: {
        where: { contentType: 'HANDS_ON_PROJECT' },
        select: {
          id: true,
          projectSubmissions: { select: { status: true } }
        }
      }
    },
    orderBy: { title: 'asc' }
  });

  const coursesWithCounts = courses.map((course) => {
    const allSubs = course.chapters.flatMap((ch) => ch.projectSubmissions);
    return {
      ...course,
      projectChapterCount: course.chapters.length,
      pendingCount: allSubs.filter((s) => s.status === 'PENDING').length,
      approvedCount: allSubs.filter((s) => s.status === 'APPROVED').length,
      rejectedCount: allSubs.filter((s) => s.status === 'REJECTED').length,
      totalCount: allSubs.length
    };
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-x-2 mb-2">
        <ClipboardList className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-bold">Student Submissions</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Review Hands-on Project submissions from students across your courses.
      </p>

      {coursesWithCounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <BookOpen className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No project courses yet</p>
          <p className="text-sm mt-1">Courses with Hands-on Project chapters will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coursesWithCounts.map((course) => (
            <Link
              key={course.id}
              href={`/teacher/project-submissions/${course.id}`}
              className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700 transition-all group"
            >
              <div className="flex-1 min-w-0 mr-4">
                <h2 className="font-semibold text-base truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {course.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {course.projectChapterCount} project chapter
                  {course.projectChapterCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs font-medium">
                {course.pendingCount > 0 && (
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded-full">
                    🕐 {course.pendingCount} pending
                  </span>
                )}
                {course.approvedCount > 0 && (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                    ✅ {course.approvedCount} approved
                  </span>
                )}
                {course.rejectedCount > 0 && (
                  <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full">
                    ❌ {course.rejectedCount} rejected
                  </span>
                )}
                {course.totalCount === 0 && (
                  <span className="text-muted-foreground">No submissions yet</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
