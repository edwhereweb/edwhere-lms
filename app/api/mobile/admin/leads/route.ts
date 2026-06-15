import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { isMarketer } from '@/lib/marketer';
import { createLeadSchema } from '@/lib/validations';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await isMarketer();
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const leads = await db.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { paymentEntries: true } }
      }
    });

    return mobileSuccess(leads);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_LEADS_LIST', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await isMarketer();
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const result = validateMobileBody(createLeadSchema, body);
    if (!result.success) return result.response;

    const lead = await db.lead.create({
      data: {
        name: result.data.name,
        phone: result.data.phone,
        email: result.data.email,
        message: result.data.message,
        source: result.data.source
      }
    });

    return mobileCreated(lead);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_LEADS_CREATE', error);
  }
}
