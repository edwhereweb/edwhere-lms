export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';

import { getProgress } from '@/actions/get-progress';

import { CourseSidebar } from './_components/course-sidebar';
import { CourseNavbar } from './_components/course-navbar';
import getSafeProfile from '@/actions/get-safe-profile';

const CourseLayout = async ({
  children,
  params
}: {
  children: React.ReactNode;
  params: { courseId: string };
}) => {
  const { userId } = await auth();
  if (!userId) {
    return redirect('/sign-in');
  }
  const safeProfile = await getSafeProfile();
  if (!safeProfile) {
    return redirect('/dashboard');
  }

  const course = await db.course.findUnique({
    where: {
      id: params.courseId
    },
    include: {
      // Include all modules (not filtering by isPublished) so students see
      // chapters even when the parent module is in draft state.
      // Only the chapter's own isPublished matters for student visibility.
      modules: {
        orderBy: { position: 'asc' },
        include: {
          chapters: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: { isPublished: true, isLibraryAsset: false } as any,
            include: {
              userProgress: {
                where: { userId }
              }
            },
            orderBy: { position: 'asc' }
          }
        }
      },
      chapters: {
        where: {
          /* eslint-disable @typescript-eslint/no-explicit-any */
          isPublished: true,
          moduleId: null,
          isLibraryAsset: false
        } as any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
        include: {
          userProgress: {
            where: {
              userId
            }
          }
        },
        orderBy: {
          position: 'asc'
        }
      }
    }
  });

  if (!course) {
    return redirect('/dashboard');
  }

  const progressCount: number = await getProgress(userId, course.id);

  // Check unread messages for this student in Mentor Connect
  let unreadCount = 0;
  if (safeProfile) {
    const lastRead = await db.studentLastRead.findUnique({
      where: { studentId_courseId: { studentId: safeProfile.id, courseId: course.id } }
    });
    unreadCount = await db.courseMessage.count({
      where: {
        courseId: course.id,
        threadStudentId: safeProfile.id,
        NOT: { authorId: safeProfile.id }, // from mentors
        ...(lastRead ? { createdAt: { gt: lastRead.lastReadAt } } : {})
      }
    });
  }

  return (
    <>
      {/* Fixed top navbar */}
      <div className="h-[80px] md:pl-80 fixed inset-x-0 top-0 w-full z-50">
        <CourseNavbar course={course} progressCount={progressCount} currentProfile={safeProfile} />
      </div>

      {/* Fixed left sidebar — full height, under navbar */}
      <div className="hidden md:flex w-80 flex-col fixed inset-y-0 z-40">
        <CourseSidebar course={course} progressCount={progressCount} unreadCount={unreadCount} />
      </div>

      {/* Main content — fixed position so it CANNOT bleed under the navbar */}
      <main
        className="fixed overflow-y-auto md:left-80 left-0 right-0 bottom-0"
        style={{ top: '80px' }}
      >
        {children}
      </main>
    </>
  );
};

export default CourseLayout;
