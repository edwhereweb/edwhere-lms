'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

import { Menu } from 'lucide-react';
import { Sidebar } from './sidebar';
import { SafeProfile } from '@/types';

interface MobileSidebarProps {
  currentProfile?: SafeProfile | null;
  hasBatchEnrollment?: boolean;
}

export const MobileSidebar = ({ currentProfile, hasBatchEnrollment }: MobileSidebarProps) => {
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
      <SheetContent side="left" className="p-0">
        <Sidebar currentProfile={currentProfile} hasBatchEnrollment={hasBatchEnrollment} />
      </SheetContent>
    </Sheet>
  );
};
