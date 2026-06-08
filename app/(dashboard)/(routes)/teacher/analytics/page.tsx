import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import {
  Banknote,
  GraduationCap,
  MessageCircle,
  ClipboardList,
  CalendarCheck,
  CheckSquare
} from 'lucide-react';

import { getAnalytics } from '@/actions/get-analytics';
import { DataCard } from './_components/data-card';
import { Chart } from './_components/chart';
import getSafeProfile from '@/actions/get-safe-profile';

const AnalyticsPage = async () => {
  const { userId } = await auth();
  if (!userId) {
    return redirect('/');
  }

  const profile = await getSafeProfile();
  if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'TEACHER')) {
    return redirect('/');
  }

  const {
    data,
    totalRevenue,
    totalSales,
    pendingMessages,
    pendingSubmissions,
    avgAttendance,
    pendingApprovals
  } = await getAnalytics(userId, profile);

  const isAdmin = profile.role === 'ADMIN';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Track your course sales, student engagement, and operational tasks.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-4">
        <DataCard
          label="Total Revenue"
          value={totalRevenue}
          shouldFormat
          icon={Banknote}
          description="Total earnings from sales"
        />
        <DataCard
          label="Total Sales"
          value={totalSales}
          shouldFormat={false}
          icon={GraduationCap}
          description="Total courses purchased"
        />
        <DataCard
          label="Pending Mentorship"
          value={pendingMessages}
          shouldFormat={false}
          icon={MessageCircle}
          description="Unread student queries"
        />
        <DataCard
          label="Pending Submissions"
          value={pendingSubmissions}
          shouldFormat={false}
          icon={ClipboardList}
          description="Projects awaiting grading"
        />
        <DataCard
          label="Avg. Attendance"
          value={`${avgAttendance}%`}
          shouldFormat={false}
          icon={CalendarCheck}
          description="Offline session attendance"
        />
        {isAdmin && (
          <DataCard
            label="Pending Approvals"
            value={pendingApprovals}
            shouldFormat={false}
            icon={CheckSquare}
            description="Courses waiting for review"
          />
        )}
      </div>
      <Chart data={data} />
    </div>
  );
};

export default AnalyticsPage;
