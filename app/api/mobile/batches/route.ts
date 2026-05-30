import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { getStudentBatches } from '@/actions/get-batches';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const batches = await getStudentBatches(userId);

    return NextResponse.json(batches);
  } catch (error) {
    return handleApiError('MOBILE_BATCHES', error);
  }
}
