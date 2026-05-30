import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { getDashboardCourses } from '@/actions/get-dashboard-courses';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const data = await getDashboardCourses(userId);

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError('MOBILE_DASHBOARD', error);
  }
}
