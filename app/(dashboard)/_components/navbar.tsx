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
    <div className="p-4 border-b border-border/60 h-full flex items-center bg-background/70 backdrop-blur-xl text-foreground">
      <MobileSidebar currentProfile={currentProfile} hasBatchEnrollment={hasBatchEnrollment} />
      <NavbarRoutes currentProfile={currentProfile} />
    </div>
  );
};
