import { auth } from '@clerk/nextjs/server';
import { type Module, type Chapter, type Course, type UserProgress } from '@prisma/client';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import { CourseProgress } from '@/components/course-progress';

import { CourseSidebarItem } from './course-sidebar-item';

interface CourseSidebarProps {
  course: Course & {
    modules: (Module & {
      chapters: (Chapter & {
        userProgress: UserProgress[] | null;
      })[];
    })[];
    chapters: (Chapter & {
      userProgress: UserProgress[] | null;
    })[];
  };
  progressCount: number;
}

export const CourseSidebar = async ({ course, progressCount }: CourseSidebarProps) => {
  const { userId } = await auth();

  if (!userId) {
    return redirect('/sign-in');
  }

  const purchase = await db.purchase.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: course.id
      }
    }
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto border-r shadow-sm">
      {/* Course Header */}
      <div className="flex flex-col p-8 border-b flex-shrink-0">
        <h1 className="font-semibold">{course.title}</h1>
        {purchase && (
          <div className="mt-10">
            <CourseProgress variant="success" value={progressCount} />
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex flex-col w-full flex-1 overflow-y-auto">
        {/* Modules */}
        {course.modules.map((module) => (
          <div key={module.id} className="flex flex-col w-full">
            {/* Module Header */}
            <div className="px-4 py-3 border-b border-t border-border bg-muted">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {module.title}
              </p>
            </div>
            {/* Module Chapters */}
            {module.chapters.length > 0 ? (
              <div className="flex flex-col w-full">
                {module.chapters.map((chapter) => (
                  <CourseSidebarItem
                    key={chapter.id}
                    id={chapter.id}
                    label={chapter.title}
                    isCompleted={!!chapter.userProgress?.[0]?.isCompleted}
                    courseId={course.id}
                    isLocked={!chapter.isFree && !purchase}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-6 py-3 italic">
                No chapters in this module yet.
              </p>
            )}
          </div>
        ))}

        {/* Unassigned Chapters (no module) */}
        {course.chapters.length > 0 && (
          <div className="flex flex-col w-full">
            {course.modules.length > 0 && (
              <div className="px-4 py-3 border-b border-t border-border bg-muted">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Course Contents
                </p>
              </div>
            )}
            {course.chapters.map((chapter) => (
              <CourseSidebarItem
                key={chapter.id}
                id={chapter.id}
                label={chapter.title}
                isCompleted={!!chapter.userProgress?.[0]?.isCompleted}
                courseId={course.id}
                isLocked={!chapter.isFree && !purchase}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
