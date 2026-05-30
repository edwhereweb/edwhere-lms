import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { getProgress } from '@/actions/get-progress';

export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const progress = await getProgress(userId, params.courseId);

    return NextResponse.json({ progress });
  } catch (error) {
    return handleApiError('MOBILE_PROGRESS', error);
  }
}
