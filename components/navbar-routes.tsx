'use client';

import { UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { SearchInput } from './search-input';
import { SafeProfile } from '@/types';

interface NavbarRoutesProps {
  currentProfile?: SafeProfile | null;
}

export const NavbarRoutes: React.FC<NavbarRoutesProps> = ({ currentProfile }) => {
  const pathname = usePathname();
  const isTeacherPage = pathname?.startsWith('/teacher');
  const isMarketerPage = pathname?.startsWith('/marketer');
  const isBloggerPage = pathname?.startsWith('/blogger');
  const isPlayerPage = pathname?.includes('/chapters');
  const isSearchPage = pathname === '/search';

  const isTeacher = currentProfile?.role === 'ADMIN' || currentProfile?.role === 'TEACHER';
  const isMarketer = currentProfile?.role === 'ADMIN' || currentProfile?.role === 'MARKETER';
  const isBlogger = currentProfile?.role === 'ADMIN' || currentProfile?.role === 'BLOGGER';

  const isStaffPage = isTeacherPage || isMarketerPage || isBloggerPage;

  return (
    <>
      {isSearchPage && (
        <div className="hidden md:block">
          <SearchInput />
        </div>
      )}
      <div className="flex gap-x-2 ml-auto">
        {isStaffPage || isPlayerPage ? (
          <Link href="/dashboard">
            <Button size="sm" variant="ghost">
              <LogOut className="h-4 w-4 mr-2" />
              Exit
            </Button>
          </Link>
        ) : (
          <div className="flex items-center gap-x-2">
            {isBlogger && (
              <Link href="/blogger/blogs">
                <Button size="sm" variant="ghost">
                  Blogger Mode
                </Button>
              </Link>
            )}
            {isMarketer && (
              <Link href="/marketer">
                <Button size="sm" variant="ghost">
                  Marketer Mode
                </Button>
              </Link>
            )}
            {isTeacher && (
              <Link href="/teacher/courses">
                <Button size="sm" variant="ghost">
                  {currentProfile?.role === 'ADMIN' ? 'Admin Mode' : 'Teacher Mode'}
                </Button>
              </Link>
            )}
          </div>
        )}

        <UserButton afterSignOutUrl="/" />
      </div>
    </>
  );
};
