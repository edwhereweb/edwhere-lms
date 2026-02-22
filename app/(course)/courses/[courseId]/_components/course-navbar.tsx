import { type Module, type Chapter, type Course, type UserProgress } from '@prisma/client';

import { NavbarRoutes } from '@/components/navbar-routes';

import { CourseMobileSidebar } from './course-mobile-sidebar';
import { CourseSidebar } from './course-sidebar';
import { SafeProfile } from '@/types';

interface CourseNavbarProps {
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
  currentProfile?: SafeProfile | null;
  unreadCount?: number;
}

export const CourseNavbar = ({
  course,
  progressCount,
  currentProfile,
  unreadCount = 0
}: CourseNavbarProps) => {
  return (
    <div className="p-4 border-b h-full flex items-center  shadow-sm">
      <CourseMobileSidebar>
        <CourseSidebar course={course} progressCount={progressCount} unreadCount={unreadCount} />
      </CourseMobileSidebar>
      <NavbarRoutes currentProfile={currentProfile} />
    </div>
  );
};
