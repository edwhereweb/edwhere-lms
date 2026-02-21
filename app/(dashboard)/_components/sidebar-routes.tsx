'use client';

import {
  Layout,
  Compass,
  List,
  BarChart,
  Users,
  Tag,
  ClipboardCheck,
  Megaphone,
  MessageCircle
} from 'lucide-react';
import SidebarItem from './sidebar-item';
import { usePathname } from 'next/navigation';
import { SafeProfile } from '@/types';

const STUDENTRoutes = [
  { icon: Layout, label: 'Dashboard', href: '/dashboard' },
  { icon: Compass, label: 'Browse', href: '/search' }
];

const teacherRoutes = [
  { icon: List, label: 'Courses', href: '/teacher/courses' },
  { icon: BarChart, label: 'Analytics', href: '/teacher/analytics' },
  { icon: Users, label: 'Manage Users', href: '/teacher/users' },
  { icon: Tag, label: 'Categories', href: '/teacher/categories' },
  { icon: ClipboardCheck, label: 'Pending Approvals', href: '/teacher/pending-approvals' },
  { icon: MessageCircle, label: 'Mentor Connect', href: '/teacher/mentor-connect' }
];

const marketerRoutes = [{ icon: Megaphone, label: 'Leads', href: '/marketer' }];

interface SidebarRoutesProps {
  currentProfile?: SafeProfile | null;
}

export const SidebarRoutes = ({ currentProfile }: SidebarRoutesProps) => {
  const pathname = usePathname();

  const isTeacherPage = pathname?.startsWith('/teacher');
  const isMarketerPage = pathname?.startsWith('/marketer');

  const isMarketerRole = currentProfile?.role === 'MARKETER' || currentProfile?.role === 'ADMIN';

  let routes = isMarketerPage ? marketerRoutes : isTeacherPage ? teacherRoutes : STUDENTRoutes;

  // Restrict admin-only teacher routes
  if (isTeacherPage && currentProfile?.role !== 'ADMIN') {
    routes = routes.filter(
      (route) => !['Manage Users', 'Categories', 'Pending Approvals'].includes(route.label)
    );
  }

  // For student view: append Marketing link for MARKETER/ADMIN users
  const extraRoutes =
    !isTeacherPage && !isMarketerPage && isMarketerRole
      ? [{ icon: Megaphone, label: 'Marketing', href: '/marketer' }]
      : [];

  return (
    <div className="flex flex-col w-full">
      {[...routes, ...extraRoutes].map((route, index) => (
        <SidebarItem key={index} icon={route.icon} label={route.label} href={route.href} />
      ))}
    </div>
  );
};
