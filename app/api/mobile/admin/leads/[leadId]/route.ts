import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { isMarketer } from '@/lib/marketer';
import { updateLeadSchema } from '@/lib/validations';

type Params = { params: Promise<{ leadId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await isMarketer();
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { leadId } = await params;

    const body = await req.json();
    const result = validateMobileBody(updateLeadSchema, body);
    if (!result.success) return result.response;

    const existing = await db.lead.findUnique({ where: { id: leadId } });
    if (!existing) return mobileError('NOT_FOUND', 'Lead not found', 404);

    const updated = await db.lead.update({
      where: { id: leadId },
      data: result.data
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_LEAD_UPDATE', error);
  }
}
