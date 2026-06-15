import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { getCourses } from '@/actions/get-courses';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;

    const courses = await getCourses({ userId, title, categoryId });

    return mobileSuccess(courses);
  } catch (error) {
    return handleMobileApiError('MOBILE_COURSES', error);
  }
}
