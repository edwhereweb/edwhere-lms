import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { isMarketer } from '@/lib/marketer';
import { updatePaymentEntrySchema } from '@/lib/validations';

type Params = { params: { leadId: string; entryId: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const authorized = await isMarketer();
    if (!authorized) return apiError('Forbidden', 403);

    const entry = await db.leadPaymentEntry.findUnique({ where: { id: params.entryId } });
    if (!entry || entry.leadId !== params.leadId) return apiError('Entry not found', 404);

    if (entry.status === 'DELETION_REQUESTED') {
      return apiError('Cannot edit an entry with a pending deletion request', 400);
    }

    const body = await req.json();
    const validation = validateBody(updatePaymentEntrySchema, body);
    if (!validation.success) return validation.response;

    const { amount, ...rest } = validation.data;

    // Amount is locked once the entry is marked PAID
    const updateData: Record<string, unknown> = { ...rest };
    if (amount !== undefined && entry.status !== 'PAID') {
      // Enforce cap: sum of all other active entries + new amount must not exceed agreedAmount
      const lead = await db.lead.findUnique({
        where: { id: params.leadId },
        include: { paymentEntries: true }
      });
      if (lead?.agreedAmount !== null && lead?.agreedAmount !== undefined) {
        const othersTotal = (lead.paymentEntries ?? [])
          .filter(
            (e) =>
              e.id !== params.entryId && e.status !== 'WAIVED' && e.status !== 'DELETION_REQUESTED'
          )
          .reduce((s, e) => s + e.amount, 0);
        if (othersTotal + amount > lead.agreedAmount) {
          const remaining = lead.agreedAmount - othersTotal;
          return apiError(
            `Amount exceeds remaining balance. Maximum allowed: ₹${remaining.toLocaleString('en-IN')}`,
            400
          );
        }
      }
      updateData.amount = amount;
    }

    const updated = await db.leadPaymentEntry.update({
      where: { id: params.entryId },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('PAYMENT_ENTRY_PATCH', error);
  }
}
