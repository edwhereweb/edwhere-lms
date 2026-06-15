import { auth } from '@clerk/nextjs/server';
import {
  mobileError,
  validateMobileBody,
  handleMobileApiError,
  mobileCreated
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { hasBatchAccess } from '@/lib/batch-auth';
import { addCoInstructorSchema } from '@/lib/validations';

type Params = { params: Promise<{ batchId: string; moduleId: string; itemId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId, itemId } = await params;

    const hasAccess = await hasBatchAccess(batchId, userId);
    if (!hasAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const session = await db.offlineSession.findUnique({ where: { itemId } });
    if (!session) return mobileError('NOT_FOUND', 'Session not found', 404);

    const body = await req.json();
    const result = validateMobileBody(addCoInstructorSchema, body);
    if (!result.success) return result.response;

    const coInstructor = await db.sessionCoInstructor.create({
      data: {
        sessionId: session.id,
        userId: result.data.userId
      }
    });

    return mobileCreated(coInstructor);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_CO_INSTRUCTOR_ADD', error);
  }
}
