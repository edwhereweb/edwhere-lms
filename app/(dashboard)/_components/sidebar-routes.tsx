'use client';

import { Layout, Compass, List, BarChart, Users, Tag, ClipboardCheck } from 'lucide-react';
import SidebarItem from './sidebar-item';
import { usePathname } from 'next/navigation';
import { SafeProfile } from '@/types';

const STUDENTRoutes = [
  {
    icon: Layout,
    label: 'Dashboard',
    href: '/dashboard'
  },
  {
    icon: Compass,
    label: 'Browse',
    href: '/search'
  }
];

const teacherRoutes = [
  {
    icon: List,
    label: 'Courses',
    href: '/teacher/courses'
  },
  {
    icon: BarChart,
    label: 'Analytics',
    href: '/teacher/analytics'
  },
  {
    icon: Users,
    label: 'Manage Users',
    href: '/teacher/users'
  },
  {
    icon: Tag,
    label: 'Categories',
    href: '/teacher/categories'
  },
  {
    icon: ClipboardCheck,
    label: 'Pending Approvals',
    href: '/teacher/pending-approvals'
  }
];

interface SidebarRoutesProps {
  currentProfile?: SafeProfile | null;
}

export const SidebarRoutes = ({ currentProfile }: SidebarRoutesProps) => {
  const pathname = usePathname();

  const isTeacherPage = pathname?.startsWith('/teacher');

  let routes = isTeacherPage ? teacherRoutes : STUDENTRoutes;

  if (currentProfile?.role !== 'ADMIN') {
    routes = routes.filter((route) => !['Manage Users', 'Categories'].includes(route.label));
  }

  return (
    <div className="flex flex-col w-full">
      {routes.map((route, index) => (
        <SidebarItem key={index} icon={route.icon} label={route.label} href={route.href} />
      ))}
    </div>
  );
};
