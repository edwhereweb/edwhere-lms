import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { isMarketer } from '@/lib/marketer';
import { markEntryPaidSchema } from '@/lib/validations';

export async function POST(
  req: Request,
  { params }: { params: { leadId: string; entryId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const authorized = await isMarketer();
    if (!authorized) return apiError('Forbidden', 403);

    const entry = await db.leadPaymentEntry.findUnique({ where: { id: params.entryId } });
    if (!entry || entry.leadId !== params.leadId) return apiError('Entry not found', 404);

    if (entry.status === 'PAID') return apiError('Entry is already marked as paid', 400);
    if (entry.status === 'DELETION_REQUESTED') {
      return apiError('Cannot mark an entry with a pending deletion request as paid', 400);
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateBody(markEntryPaidSchema, body);
    if (!validation.success) return validation.response;

    const updated = await db.leadPaymentEntry.update({
      where: { id: params.entryId },
      data: {
        status: 'PAID',
        paidAt: validation.data.paidAt ? new Date(validation.data.paidAt) : new Date()
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('PAYMENT_ENTRY_MARK_PAID', error);
  }
}
