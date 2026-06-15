import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { resolveEntryDeletionSchema } from '@/lib/validations';

type Params = { params: Promise<{ entryId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || profile.role !== 'ADMIN') {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const { entryId } = await params;

    const body = await req.json();
    const result = validateMobileBody(resolveEntryDeletionSchema, body);
    if (!result.success) return result.response;

    const entry = await db.leadPaymentEntry.findUnique({ where: { id: entryId } });
    if (!entry) return mobileError('NOT_FOUND', 'Payment entry not found', 404);

    if (result.data.action === 'APPROVE') {
      await db.leadPaymentEntry.delete({ where: { id: entryId } });
      return mobileSuccess({ success: true, deleted: true });
    }

    const updated = await db.leadPaymentEntry.update({
      where: { id: entryId },
      data: {
        status: 'PENDING',
        deletionRequestedAt: null,
        deletionReason: null
      }
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_PAYMENT_RESOLVE_DELETION', error);
  }
}
