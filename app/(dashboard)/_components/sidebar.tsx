'use client';

import { Logo } from './logo';
import { SidebarRoutes, profileRoute } from './sidebar-routes';
import SidebarItem from './sidebar-item';
import { SafeProfile } from '@/types';
import { Separator } from '@/components/ui/separator';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  currentProfile?: SafeProfile | null;
  hasBatchEnrollment?: boolean;
}

export const Sidebar = ({ currentProfile, hasBatchEnrollment }: SidebarProps) => {
  const pathname = usePathname();
  const isTeacherPage = pathname?.startsWith('/teacher');
  const isAdminPage = pathname?.startsWith('/admin');

  // Only show the sticky profile footer on teacher/admin pages
  // (marketer/blogger/student routes already include profile inline)
  const showStickyProfile = isTeacherPage || isAdminPage;

  return (
    <div className="h-full border-r flex flex-col overflow-y-auto bg-background text-foreground shadow-sm">
      <div className="p-6">
        <Logo />
      </div>
      <div className="flex-1 flex flex-col w-full overflow-y-auto">
        <SidebarRoutes currentProfile={currentProfile} hasBatchEnrollment={hasBatchEnrollment} />
      </div>
      {showStickyProfile && (
        <div className="shrink-0">
          <Separator />
          <SidebarItem
            icon={profileRoute.icon}
            label={profileRoute.label}
            href={profileRoute.href}
          />
        </div>
      )}
    </div>
  );
};
