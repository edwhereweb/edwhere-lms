import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { canManagePlacement, getPlacementUser } from '@/lib/placement';
import { db } from '@/lib/db';
import { updatePlacementApplicationStatusSchema } from '@/lib/validations';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { applicationId } = await params;

    const isAdmin = await canManagePlacement(userId);

    const application = await db.placementApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: { company: { select: { id: true, name: true, logoUrl: true } } }
        },
        user: { select: { id: true, name: true, email: true, phone: true, resumeUrl: true, userId: true } }
      }
    });

    if (!application) return mobileError('NOT_FOUND', 'Application not found', 404);

    if (!isAdmin) {
      const placementUser = await getPlacementUser(userId);
      if (!placementUser || application.user.userId !== userId) {
        return mobileError('FORBIDDEN', 'Forbidden', 403);
      }
    }

    return mobileSuccess(application);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_APPLICATION_GET', error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManagePlacement(userId);
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { applicationId } = await params;

    const application = await db.placementApplication.findUnique({ where: { id: applicationId } });
    if (!application) return mobileError('NOT_FOUND', 'Application not found', 404);

    const body = await req.json();
    const result = validateMobileBody(updatePlacementApplicationStatusSchema, body);
    if (!result.success) return result.response;

    const updated = await db.placementApplication.update({
      where: { id: applicationId },
      data: result.data
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_APPLICATION_UPDATE', error);
  }
}
