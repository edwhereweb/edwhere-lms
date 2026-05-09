import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { currentProfile } from '@/lib/current-profile';
import { resolveEntryDeletionSchema } from '@/lib/validations';

export async function POST(req: Request, { params }: { params: { entryId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await currentProfile();
    if (profile?.role !== 'ADMIN') return apiError('Forbidden', 403);

    const entry = await db.leadPaymentEntry.findUnique({ where: { id: params.entryId } });
    if (!entry) return apiError('Entry not found', 404);

    if (entry.status !== 'DELETION_REQUESTED') {
      return apiError('No pending deletion request for this entry', 400);
    }

    const body = await req.json();
    const validation = validateBody(resolveEntryDeletionSchema, body);
    if (!validation.success) return validation.response;

    if (validation.data.action === 'APPROVE') {
      await db.leadPaymentEntry.delete({ where: { id: params.entryId } });
      return NextResponse.json({ message: 'Entry deleted' });
    }

    // Reject — restore to PENDING (or PAID if it was paid before the request)
    const restored = await db.leadPaymentEntry.update({
      where: { id: params.entryId },
      data: {
        status: entry.paidAt ? 'PAID' : 'PENDING',
        deletionReason: null,
        deletionRequestedAt: null
      }
    });

    return NextResponse.json(restored);
  } catch (error) {
    return handleApiError('PAYMENT_ENTRY_RESOLVE_DELETION', error);
  }
}
