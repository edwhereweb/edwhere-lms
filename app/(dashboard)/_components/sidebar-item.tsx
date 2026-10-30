'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  nested?: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, nested }: SidebarItemProps) => {
  const pathname = usePathname();

  const isActive =
    (pathname === '/' && href === '/') || pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-x-3 rounded-full mr-3 text-left text-muted-foreground text-sm font-medium transition-colors hover:text-foreground hover:bg-accent',
        nested ? 'ml-6 pl-4 py-2' : 'ml-3 pl-4 py-2.5',
        isActive &&
          'bg-primary/10 text-primary font-semibold hover:bg-primary/10 hover:text-primary'
      )}
    >
      <Icon
        size={nested ? 18 : 20}
        className={cn('shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}
      />
      {label}
    </Link>
  );
};

export default SidebarItem;
