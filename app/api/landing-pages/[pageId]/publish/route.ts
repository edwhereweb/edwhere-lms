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
    if (!profile) return apiError('Forbidden', 403);

    const landingPage = await db.landingPage.findUnique({
      where: { id: params.pageId }
    });

    if (!landingPage) return apiError('Not Found', 404);

    if (landingPage.createdBy !== userId && profile.role !== 'ADMIN') {
      return apiError('Forbidden', 403);
    }

    const body = await req.json();
    const { isPublished } = body;

    if (isPublished && !landingPage.isApproved && profile.role !== 'ADMIN') {
      return apiError('Page must be approved before publishing', 400);
    }

    const updatedPage = await db.landingPage.update({
      where: { id: params.pageId },
      data: { isPublished }
    });

    return NextResponse.json(updatedPage);
  } catch (error) {
    return handleApiError('PUBLISH_LANDING_PAGE', error);
  }
}
