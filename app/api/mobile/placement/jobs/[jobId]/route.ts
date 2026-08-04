import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { canManagePlacement } from '@/lib/placement';
import { db } from '@/lib/db';
import { updatePlacementJobSchema } from '@/lib/validations';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { jobId } = await params;

    const job = await db.placementJob.findUnique({
      where: { id: jobId },
      include: {
        company: { select: { id: true, name: true, logoUrl: true, industry: true, website: true } },
        _count: { select: { applications: true } }
      }
    });

    if (!job) return mobileError('NOT_FOUND', 'Job not found', 404);
    if (!job.isActive) return mobileError('NOT_FOUND', 'Job not found', 404);

    return mobileSuccess(job);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_JOB_GET', error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManagePlacement(userId);
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { jobId } = await params;

    const job = await db.placementJob.findUnique({ where: { id: jobId } });
    if (!job) return mobileError('NOT_FOUND', 'Job not found', 404);

    const body = await req.json();
    const result = validateMobileBody(updatePlacementJobSchema, body);
    if (!result.success) return result.response;

    const { deadline, ...rest } = result.data;
    const updated = await db.placementJob.update({
      where: { id: jobId },
      data: {
        ...rest,
        ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {})
      }
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_JOB_UPDATE', error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManagePlacement(userId);
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { jobId } = await params;

    const job = await db.placementJob.findUnique({ where: { id: jobId } });
    if (!job) return mobileError('NOT_FOUND', 'Job not found', 404);

    await db.placementJob.update({ where: { id: jobId }, data: { isActive: false } });

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_JOB_DELETE', error);
  }
}
