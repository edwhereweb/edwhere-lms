'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { type Module, type Chapter, type Course, type UserProgress } from '@prisma/client';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

import { CourseSidebar } from './course-sidebar';

interface CourseMobileSidebarProps {
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

export const CourseMobileSidebar = ({ course, progressCount }: CourseMobileSidebarProps) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger className="md:hidden pr-4 hover:opacity-75 transition">
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="p-0  w-72">
        <CourseSidebar course={course} progressCount={progressCount} />
      </SheetContent>
    </Sheet>
  );
};
