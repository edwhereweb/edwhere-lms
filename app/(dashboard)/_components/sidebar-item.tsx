'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  nested?: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, nested }: SidebarItemProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const isActive =
    (pathname === '/' && href === '/') || pathname === href || pathname?.startsWith(`${href}/`);

  const onClick = () => {
    router.push(href);
  };

  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        'flex items-center gap-x-2 text-muted-foreground text-sm font-[500] transition-all hover:text-foreground hover:bg-accent',
        nested ? 'pl-10' : 'pl-6',
        isActive && 'text-foreground bg-accent'
      )}
    >
      <div className={cn('flex items-center gap-x-2', nested ? 'py-2' : 'py-4')}>
        <Icon
          size={nested ? 18 : 22}
          className={cn('text-muted-foreground', isActive && 'text-primary')}
        />
        {label}
      </div>
      <div
        className={cn(
          'ml-auto opacity-0 border-2',
          isActive && 'border-primary h-full transition-all opacity-100'
        )}
      />
    </button>
  );
};

export default SidebarItem;
