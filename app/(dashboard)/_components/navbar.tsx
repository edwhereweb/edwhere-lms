'use client';

import { NavbarRoutes } from '@/components/navbar-routes';
import { MobileSidebar } from './mobile-sidebar';
import { SafeProfile } from '@/types';

interface NavbarProps {
  currentProfile?: SafeProfile | null;
  hasBatchEnrollment?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentProfile, hasBatchEnrollment }) => {
  return (
    <div className="p-4 border-b h-full flex items-center bg-background text-foreground shadow-sm">
      <MobileSidebar currentProfile={currentProfile} hasBatchEnrollment={hasBatchEnrollment} />
      <NavbarRoutes currentProfile={currentProfile} />
    </div>
  );
};
