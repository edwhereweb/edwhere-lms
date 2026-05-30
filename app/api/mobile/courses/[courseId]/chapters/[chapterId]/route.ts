import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { getChapter } from '@/actions/get-chapter';

export async function GET(
  _req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const data = await getChapter({
      userId,
      courseId: params.courseId,
      chapterId: params.chapterId
    });

    if (!data.chapter) {
      return apiError('Not Found', 404);
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError('MOBILE_CHAPTER', error);
  }
}
