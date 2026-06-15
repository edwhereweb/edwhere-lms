import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { isMarketer } from '@/lib/marketer';
import { closeLeadSchema } from '@/lib/validations';

type Params = { params: Promise<{ leadId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await isMarketer();
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { leadId } = await params;

    const body = await req.json();
    const result = validateMobileBody(closeLeadSchema, body);
    if (!result.success) return result.response;

    const existing = await db.lead.findUnique({ where: { id: leadId } });
    if (!existing) return mobileError('NOT_FOUND', 'Lead not found', 404);

    const updated = await db.lead.update({
      where: { id: leadId },
      data: {
        closureStatus: result.data.closureStatus,
        closureNote: result.data.closureNote,
        agreedAmount: result.data.agreedAmount,
        courseInterest: result.data.courseInterest,
        closedAt: new Date(),
        closedBy: userId
      }
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_LEAD_CLOSE', error);
  }
}
