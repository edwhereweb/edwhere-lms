import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { canManagePlacement } from '@/lib/placement';
import { db } from '@/lib/db';
import { createPlacementCompanySchema } from '@/lib/validations';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const companies = await db.placementCompany.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { industry: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      include: { _count: { select: { jobs: { where: { isActive: true } } } } },
      orderBy: { name: 'asc' }
    });

    return mobileSuccess(companies);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_COMPANIES_LIST', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManagePlacement(userId);
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const result = validateMobileBody(createPlacementCompanySchema, body);
    if (!result.success) return result.response;

    const company = await db.placementCompany.create({ data: result.data });

    return mobileCreated(company);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_COMPANIES_CREATE', error);
  }
}
