import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { getDashboardCourses } from '@/actions/get-dashboard-courses';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const data = await getDashboardCourses(userId);

    return mobileSuccess(data);
  } catch (error) {
    return handleMobileApiError('MOBILE_DASHBOARD', error);
  }
}
