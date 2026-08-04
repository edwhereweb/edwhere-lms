import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { canManagePlacement, getPlacementUser } from '@/lib/placement';
import { db } from '@/lib/db';
import { createPlacementApplicationSchema } from '@/lib/validations';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const isAdmin = await canManagePlacement(userId);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const jobId = searchParams.get('jobId');

    if (isAdmin) {
      const applications = await db.placementApplication.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(jobId ? { jobId } : {})
        },
        include: {
          job: { select: { id: true, title: true, company: { select: { id: true, name: true } } } },
          user: { select: { id: true, name: true, email: true, phone: true, resumeUrl: true } }
        },
        orderBy: { appliedAt: 'desc' }
      });
      return mobileSuccess(applications);
    }

    const placementUser = await getPlacementUser(userId);
    if (!placementUser) return mobileError('FORBIDDEN', 'Placement profile required', 403);

    const applications = await db.placementApplication.findMany({
      where: {
        userId: placementUser.id,
        ...(status ? { status } : {}),
        ...(jobId ? { jobId } : {})
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            type: true,
            location: true,
            company: { select: { id: true, name: true, logoUrl: true } }
          }
        }
      },
      orderBy: { appliedAt: 'desc' }
    });

    return mobileSuccess(applications);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_APPLICATIONS_LIST', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const placementUser = await getPlacementUser(userId);
    if (!placementUser || !placementUser.isActive) {
      return mobileError('FORBIDDEN', 'Active placement profile required to apply', 403);
    }

    const body = await req.json();
    const result = validateMobileBody(createPlacementApplicationSchema, body);
    if (!result.success) return result.response;

    const job = await db.placementJob.findUnique({
      where: { id: result.data.jobId },
      select: { id: true, isActive: true, deadline: true }
    });

    if (!job || !job.isActive) return mobileError('NOT_FOUND', 'Job not found', 404);

    if (job.deadline && new Date() > job.deadline) {
      return mobileError('VALIDATION', 'Application deadline has passed', 400);
    }

    const existing = await db.placementApplication.findUnique({
      where: { jobId_userId: { jobId: result.data.jobId, userId: placementUser.id } }
    });
    if (existing) return mobileError('CONFLICT', 'Already applied to this job', 409);

    const application = await db.placementApplication.create({
      data: {
        jobId: result.data.jobId,
        userId: placementUser.id,
        note: result.data.note
      },
      include: {
        job: { select: { id: true, title: true, company: { select: { id: true, name: true } } } }
      }
    });

    return mobileCreated(application);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_APPLICATIONS_CREATE', error);
  }
}
