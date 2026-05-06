import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';

export async function PATCH(req: Request, { params }: { params: { pageId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    if (!profile || profile.role !== 'ADMIN') {
      return apiError('Forbidden', 403);
    }

    const updatedPage = await db.landingPage.update({
      where: { id: params.pageId },
      data: {
        isApproved: true,
        approvedBy: userId,
        approvedAt: new Date()
      }
    });

    return NextResponse.json(updatedPage);
  } catch (error) {
    return handleApiError('APPROVE_LANDING_PAGE', error);
  }
}
