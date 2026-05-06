import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { landingPageSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    if (!profile || !['ADMIN', 'MARKETER', 'BLOGGER'].includes(profile.role)) {
      return apiError('Forbidden', 403);
    }

    const body = await req.json();
    const validation = validateBody(landingPageSchema, body);
    if (!validation.success) return validation.response;

    const { title, slug, htmlContent } = validation.data;

    const existing = await db.landingPage.findUnique({
      where: { slug }
    });

    if (existing) {
      return apiError('Slug already in use', 400);
    }

    const landingPage = await db.landingPage.create({
      data: {
        title,
        slug,
        htmlContent,
        createdBy: userId
      }
    });

    return NextResponse.json(landingPage, { status: 201 });
  } catch (error) {
    return handleApiError('CREATE_LANDING_PAGE', error);
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    if (!profile || !['ADMIN', 'MARKETER', 'BLOGGER'].includes(profile.role)) {
      return apiError('Forbidden', 403);
    }

    const pages = await db.landingPage.findMany({
      where: profile.role === 'ADMIN' ? {} : { createdBy: userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(pages);
  } catch (error) {
    return handleApiError('GET_LANDING_PAGES', error);
  }
}
