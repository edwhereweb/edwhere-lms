'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface SidebarSectionProps {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
  /** hrefs of all routes in this section — used to auto-expand when one is active */
  routeHrefs: string[];
}

const STORAGE_KEY_PREFIX = 'sidebar-section-';

export const SidebarSection = ({
  label,
  icon: Icon,
  children,
  routeHrefs
}: SidebarSectionProps) => {
  const pathname = usePathname();

  const hasActiveRoute = routeHrefs.some(
    (href) => pathname === href || pathname?.startsWith(`${href}/`)
  );

  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return hasActiveRoute;
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${label}`);
    // Always expand if the section contains the active route
    if (hasActiveRoute) return true;
    return stored !== null ? stored === 'true' : false;
  });

  // Auto-expand when navigating into this section
  useEffect(() => {
    if (hasActiveRoute && !isOpen) {
      setIsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveRoute]);

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${label}`, String(open));
    } catch {
      // localStorage unavailable — ignore
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <CollapsibleTrigger className="flex items-center w-full gap-x-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
        <Icon
          size={16}
          className={cn(
            'shrink-0 text-muted-foreground transition-colors',
            hasActiveRoute && 'text-primary'
          )}
        />
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight
          size={14}
          className={cn(
            'shrink-0 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-90'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};
