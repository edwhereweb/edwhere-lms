import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import { canEditCourse } from '@/lib/course-auth';
import { canUseMeet } from '@/lib/live-sessions/access';
import { LearnerLiveSessions } from '@/components/live-sessions/learner-live-sessions';

export const dynamic = 'force-dynamic';

export default async function CourseLiveSessionsPage({ params }: { params: { courseId: string } }) {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    select: { id: true, googleMeetEnabled: true }
  });
  if (!course || !canUseMeet(course)) return redirect(`/courses/${params.courseId}`);

  const purchase = await db.purchase.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
    select: { id: true }
  });
  const hasAccess = !!purchase || (await canEditCourse(userId, course.id));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-medium mb-1">Live sessions</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Times are shown in IST. The join button appears once the host is ready.
      </p>
      <LearnerLiveSessions courseId={course.id} hasAccess={hasAccess} />
    </div>
  );
}
