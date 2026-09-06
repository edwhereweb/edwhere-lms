import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Clock } from 'lucide-react';

import { getDashboardCourses } from '@/actions/get-dashboard-courses';
import { getOnboardingCategories } from '@/actions/get-onboarding-categories';
import { CoursesList } from '@/components/courses-list';
import { GamificationStatsCard } from '@/components/gamification-stats-card';
import { db } from '@/lib/db';

import { InfoCard } from '../(root)/_components/info-card';
import { OnboardingDashboard } from './_components/onboarding-dashboard';

export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    return redirect('/sign-in');
  }

  const [dashboardData, incompleteCheckout] = await Promise.all([
    getDashboardCourses(userId),
    db.courseOrder.findFirst({
      where: {
        userId,
        status: {
          in: ['PENDING', 'FAILED', 'CANCELLED']
        }
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        courseId: true,
        course: {
          select: {
            title: true
          }
        }
      }
    })
  ]);
  const { completedCourses, coursesInProgress } = dashboardData;

  // A "new" user has zero course purchases/enrollments — show a tailored
  // onboarding experience instead of an empty progress dashboard.
  const isNewUser = completedCourses.length === 0 && coursesInProgress.length === 0;

  if (isNewUser) {
    const categories = await getOnboardingCategories();

    return (
      <div className="p-6 space-y-4">
        {incompleteCheckout && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Incomplete checkout for{' '}
            <span className="font-medium">{incompleteCheckout.course.title}</span>.{' '}
            <Link
              href={`/checkout?courseId=${incompleteCheckout.courseId}&intent=resume`}
              className="underline font-semibold"
            >
              Resume Checkout
            </Link>
          </div>
        )}
        <OnboardingDashboard categories={categories} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {incompleteCheckout && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Incomplete checkout for{' '}
          <span className="font-medium">{incompleteCheckout.course.title}</span>.{' '}
          <Link
            href={`/checkout?courseId=${incompleteCheckout.courseId}&intent=resume`}
            className="underline font-semibold"
          >
            Resume Checkout
          </Link>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard icon={Clock} label="In Progress" numberOfItems={coursesInProgress.length} />
        <InfoCard
          icon={CheckCircle}
          label="Completed"
          numberOfItems={completedCourses.length}
          variant="success"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CoursesList items={[...coursesInProgress, ...completedCourses]} />
        </div>
        <div>
          <GamificationStatsCard />
        </div>
      </div>
    </div>
  );
}
