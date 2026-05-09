import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { isMarketer } from '@/lib/marketer';
import { requestEntryDeletionSchema } from '@/lib/validations';

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

    if (entry.status === 'DELETION_REQUESTED') {
      return apiError('Deletion already requested for this entry', 400);
    }

    const body = await req.json();
    const validation = validateBody(requestEntryDeletionSchema, body);
    if (!validation.success) return validation.response;

    const updated = await db.leadPaymentEntry.update({
      where: { id: params.entryId },
      data: {
        status: 'DELETION_REQUESTED',
        deletionReason: validation.data.deletionReason,
        deletionRequestedAt: new Date()
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('PAYMENT_ENTRY_REQUEST_DELETION', error);
  }
}
