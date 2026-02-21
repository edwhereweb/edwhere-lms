import { auth } from '@clerk/nextjs/server';
import { type Chapter, type Course, type UserProgress } from '@prisma/client';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

import { db } from '@/lib/db';
import { CourseProgress } from '@/components/course-progress';
import { CourseSidebarItem } from './course-sidebar-item';

type ModuleWithChapters = {
  id: string;
  title: string;
  position: number;
  chapters: (Chapter & { userProgress: UserProgress[] | null })[];
};

interface CourseSidebarProps {
  course: Course & {
    modules: ModuleWithChapters[];
    chapters: (Chapter & { userProgress: UserProgress[] | null })[];
  };
  progressCount: number;
  unreadCount?: number;
}

export const CourseSidebar = async ({
  course,
  progressCount,
  unreadCount = 0
}: CourseSidebarProps) => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const purchase = await db.purchase.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } }
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

      {/* Scrollable chapter list */}
      <div className="flex flex-col w-full flex-1 overflow-y-auto">
        {/* Modules */}
        {course.modules.map((module) => (
          <div key={module.id} className="flex flex-col w-full">
            <div className="px-4 py-3 border-b border-t border-border bg-muted">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {module.title}
              </p>
            </div>
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

        {/* Unassigned chapters */}
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

      {/* Mentor Connect — pinned at bottom */}
      <div className="border-t shrink-0">
        <Link
          href={`/courses/${course.id}/chat`}
          className="flex items-center gap-x-2 pl-6 py-4 text-sm font-[500] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors w-full"
        >
          <div className="relative">
            <MessageCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          Mentor Connect
        </Link>
      </div>
    </div>
  );
};
