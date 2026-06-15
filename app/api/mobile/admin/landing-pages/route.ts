import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';
import { landingPageSchema } from '@/lib/validations';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const pages = await db.landingPage.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const creatorIds = Array.from(new Set(pages.map((p) => p.createdBy)));
    const profiles = await db.profile.findMany({
      where: { userId: { in: creatorIds } },
      select: { userId: true, name: true }
    });
    const nameMap = new Map(profiles.map((p) => [p.userId, p.name]));

    const result = pages.map((p) => ({
      ...p,
      creatorName: nameMap.get(p.createdBy) ?? 'Unknown'
    }));

    return mobileSuccess(result);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_LANDING_PAGES_LIST', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const result = validateMobileBody(landingPageSchema, body);
    if (!result.success) return result.response;

    const page = await db.landingPage.create({
      data: {
        title: result.data.title,
        slug: result.data.slug,
        htmlContent: result.data.htmlContent,
        createdBy: userId
      }
    });

    return mobileCreated(page);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_LANDING_PAGES_CREATE', error);
  }
}
