import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { getCourses } from '@/actions/get-courses';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;

    const courses = await getCourses({ userId, title, categoryId });

    return NextResponse.json(courses);
  } catch (error) {
    return handleApiError('MOBILE_COURSES', error);
  }
}
