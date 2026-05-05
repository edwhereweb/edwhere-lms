'use client';

import { Logo } from './logo';
import { SidebarRoutes } from './sidebar-routes';
import { SafeProfile } from '@/types';

interface SidebarProps {
  currentProfile?: SafeProfile | null;
  hasBatchEnrollment?: boolean;
}

export const Sidebar = ({ currentProfile, hasBatchEnrollment }: SidebarProps) => {
  return (
    <div className="h-full border-r flex flex-col overflow-y-auto bg-background text-foreground shadow-sm">
      <div className="p-6">
        <Logo />
      </div>
      <div className="flex flex-col w-full">
        <SidebarRoutes currentProfile={currentProfile} hasBatchEnrollment={hasBatchEnrollment} />
      </div>
    </div>
  );
};
