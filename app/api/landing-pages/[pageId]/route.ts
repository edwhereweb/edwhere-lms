import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { landingPageSchema } from '@/lib/validations';
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
    const validation = validateBody(landingPageSchema.partial(), body);
    if (!validation.success) return validation.response;

    if (validation.data.slug && validation.data.slug !== landingPage.slug) {
      const existing = await db.landingPage.findUnique({
        where: { slug: validation.data.slug }
      });
      if (existing) return apiError('Slug already in use', 400);
    }

    const updatedPage = await db.landingPage.update({
      where: { id: params.pageId },
      data: {
        ...validation.data,
        isApproved: profile.role === 'ADMIN' ? undefined : false
      }
    });

    return NextResponse.json(updatedPage);
  } catch (error) {
    return handleApiError('UPDATE_LANDING_PAGE', error);
  }
}

export async function DELETE(req: Request, { params }: { params: { pageId: string } }) {
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

    await db.landingPage.delete({
      where: { id: params.pageId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError('DELETE_LANDING_PAGE', error);
  }
}
