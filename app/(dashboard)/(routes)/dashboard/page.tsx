import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { CheckCircle, Clock } from 'lucide-react';

import { getDashboardCourses } from '@/actions/get-dashboard-courses';
import { CoursesList } from '@/components/courses-list';
import { GamificationStatsCard } from '@/components/gamification-stats-card';

import { InfoCard } from '../(root)/_components/info-card';

export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    return redirect('/sign-in');
  }

  const { completedCourses, coursesInProgress } = await getDashboardCourses(userId);

  return (
    <div className="p-6 space-y-4">
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
