import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { isMarketer } from '@/lib/marketer';
import { requestEntryDeletionSchema } from '@/lib/validations';

type Params = { params: Promise<{ entryId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await isMarketer();
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { entryId } = await params;

    const body = await req.json();
    const result = validateMobileBody(requestEntryDeletionSchema, body);
    if (!result.success) return result.response;

    const entry = await db.leadPaymentEntry.findUnique({ where: { id: entryId } });
    if (!entry) return mobileError('NOT_FOUND', 'Payment entry not found', 404);

    const updated = await db.leadPaymentEntry.update({
      where: { id: entryId },
      data: {
        status: 'DELETION_REQUESTED',
        deletionRequestedAt: new Date(),
        deletionReason: result.data.deletionReason
      }
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_PAYMENT_REQUEST_DELETION', error);
  }
}
