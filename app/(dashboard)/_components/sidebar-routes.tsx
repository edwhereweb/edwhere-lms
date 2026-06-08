'use client';

import {
  Layout,
  Compass,
  List,
  BarChart,
  Users,
  Tag,
  ClipboardCheck,
  ClipboardList,
  Megaphone,
  MessageCircle,
  Library,
  UserPlus,
  Newspaper,
  UserCircle,
  BookMarked,
  CalendarClock,
  LineChart,
  LayoutTemplate,
  Wallet,
  BookOpen,
  GraduationCap,
  Settings,
  Award,
  type LucideIcon
} from 'lucide-react';
import SidebarItem from './sidebar-item';
import { SidebarSection } from './sidebar-section';
import { usePathname } from 'next/navigation';
import { SafeProfile } from '@/types';

// ── Route / Section types ────────────────────────────────────────────────

interface SidebarRoute {
  icon: LucideIcon;
  label: string;
  href: string;
  adminOnly?: boolean;
}

interface SidebarSectionDef {
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  routes: SidebarRoute[];
}

// ── Student routes (flat — only 2 items) ─────────────────────────────────

const studentRoutes: SidebarRoute[] = [
  { icon: Layout, label: 'Dashboard', href: '/dashboard' },
  { icon: Compass, label: 'Browse', href: '/search' }
];

// ── Teacher / Admin sections ─────────────────────────────────────────────

const teacherSections: SidebarSectionDef[] = [
  {
    label: 'Content',
    icon: BookOpen,
    routes: [
      { icon: List, label: 'Courses', href: '/teacher/courses' },
      { icon: Library, label: 'Asset Library', href: '/teacher/asset-library' },
      { icon: Newspaper, label: 'Blogs', href: '/teacher/blogs' },
      {
        icon: LayoutTemplate,
        label: 'Landing Pages',
        href: '/admin/landing-pages',
        adminOnly: true
      }
    ]
  },
  {
    label: 'Students & Grading',
    icon: GraduationCap,
    routes: [
      { icon: ClipboardList, label: 'Student Submissions', href: '/teacher/project-submissions' },
      {
        icon: ClipboardCheck,
        label: 'Pending Approvals',
        href: '/teacher/pending-approvals',
        adminOnly: true
      },
      { icon: MessageCircle, label: 'Mentor Connect', href: '/teacher/mentor-connect' }
    ]
  },
  {
    label: 'Offline Learning',
    icon: CalendarClock,
    routes: [
      { icon: BookMarked, label: 'Offline Batches', href: '/teacher/offline-batches' },
      { icon: CalendarClock, label: 'Offline Sessions', href: '/teacher/offline-sessions' },
      {
        icon: LineChart,
        label: 'Batch Reports',
        href: '/admin/reports/offline-batches',
        adminOnly: true
      }
    ]
  },
  {
    label: 'Analytics',
    icon: BarChart,
    routes: [{ icon: BarChart, label: 'Analytics', href: '/teacher/analytics' }]
  },
  {
    label: 'Administration',
    icon: Settings,
    adminOnly: true,
    routes: [
      { icon: Users, label: 'Manage Users', href: '/teacher/users', adminOnly: true },
      { icon: UserPlus, label: 'Manual Enrolment', href: '/teacher/enrolments', adminOnly: true },
      { icon: Tag, label: 'Categories', href: '/teacher/categories', adminOnly: true },
      { icon: Award, label: 'Certificates', href: '/admin/certificates', adminOnly: true },
      {
        icon: Wallet,
        label: 'Payment Deletions',
        href: '/teacher/payment-deletions',
        adminOnly: true
      }
    ]
  }
];

// Profile route — rendered separately in sticky footer
export const profileRoute: SidebarRoute = {
  icon: UserCircle,
  label: 'My Profile',
  href: '/teacher/profile'
};

// ── Marketer routes (flat) ───────────────────────────────────────────────

const marketerRoutes: SidebarRoute[] = [
  { icon: Megaphone, label: 'Leads', href: '/marketer' },
  { icon: Wallet, label: 'Payment Tracker', href: '/marketer/payments' },
  { icon: Newspaper, label: 'Blogs', href: '/marketer/blogs' },
  { icon: LayoutTemplate, label: 'Landing Pages', href: '/marketer/landing-pages' },
  { icon: UserCircle, label: 'My Profile', href: '/marketer/profile' }
];

// ── Blogger routes (flat) ────────────────────────────────────────────────

const bloggerRoutes: SidebarRoute[] = [
  { icon: Newspaper, label: 'Blogs', href: '/blogger/blogs' },
  { icon: LayoutTemplate, label: 'Landing Pages', href: '/blogger/landing-pages' },
  { icon: UserCircle, label: 'My Profile', href: '/blogger/profile' }
];

// ── Component ────────────────────────────────────────────────────────────

interface SidebarRoutesProps {
  currentProfile?: SafeProfile | null;
  hasBatchEnrollment?: boolean;
}

export const SidebarRoutes = ({ currentProfile, hasBatchEnrollment }: SidebarRoutesProps) => {
  const pathname = usePathname();

  const isTeacherPage = pathname?.startsWith('/teacher');
  const isAdminPage = pathname?.startsWith('/admin');
  const isMarketerPage = pathname?.startsWith('/marketer');
  const isBloggerPage = pathname?.startsWith('/blogger');

  const isAdmin = currentProfile?.role === 'ADMIN';

  // ── Flat-route roles (marketer, blogger, student) ────────────────────

  if (isBloggerPage) {
    return <FlatRoutes routes={bloggerRoutes} />;
  }

  if (isMarketerPage) {
    return <FlatRoutes routes={marketerRoutes} />;
  }

  if (!isTeacherPage && !isAdminPage) {
    let routes = studentRoutes;
    if (hasBatchEnrollment) {
      routes = [
        ...routes,
        { icon: BookMarked, label: 'Offline Batches', href: '/offline-batches' }
      ];
    }
    return <FlatRoutes routes={routes} />;
  }

  // ── Teacher / Admin — sectioned layout ───────────────────────────────

  const visibleSections = teacherSections
    .filter((section) => !section.adminOnly || isAdmin)
    .map((section) => ({
      ...section,
      routes: section.routes.filter((route) => !route.adminOnly || isAdmin)
    }))
    .filter((section) => section.routes.length > 0);

  return (
    <div className="flex flex-col w-full">
      {visibleSections.map((section) => (
        <SidebarSection
          key={section.label}
          label={section.label}
          icon={section.icon}
          routeHrefs={section.routes.map((r) => r.href)}
        >
          {section.routes.map((route) => (
            <SidebarItem
              key={route.href}
              icon={route.icon}
              label={route.label}
              href={route.href}
              nested
            />
          ))}
        </SidebarSection>
      ))}
    </div>
  );
};

// ── Flat route list (student / marketer / blogger) ───────────────────────

const FlatRoutes = ({ routes }: { routes: SidebarRoute[] }) => (
  <div className="flex flex-col w-full">
    {routes.map((route) => (
      <SidebarItem key={route.href} icon={route.icon} label={route.label} href={route.href} />
    ))}
  </div>
);
