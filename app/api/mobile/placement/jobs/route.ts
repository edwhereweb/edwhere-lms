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
import { createPlacementJobSchema } from '@/lib/validations';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const companyId = searchParams.get('companyId');
    const type = searchParams.get('type');

    const jobs = await db.placementJob.findMany({
      where: {
        isActive: true,
        ...(companyId ? { companyId } : {}),
        ...(type ? { type } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      include: {
        company: { select: { id: true, name: true, logoUrl: true, industry: true } },
        _count: { select: { applications: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return mobileSuccess(jobs);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_JOBS_LIST', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManagePlacement(userId);
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const result = validateMobileBody(createPlacementJobSchema, body);
    if (!result.success) return result.response;

    const company = await db.placementCompany.findUnique({
      where: { id: result.data.companyId },
      select: { id: true, isActive: true }
    });
    if (!company || !company.isActive) {
      return mobileError('NOT_FOUND', 'Company not found', 404);
    }

    const job = await db.placementJob.create({
      data: {
        ...result.data,
        deadline: result.data.deadline ? new Date(result.data.deadline) : null
      },
      include: { company: { select: { id: true, name: true } } }
    });

    return mobileCreated(job);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_JOBS_CREATE', error);
  }
}
