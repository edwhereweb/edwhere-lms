import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { isMarketer } from '@/lib/marketer';
import { createPaymentEntrySchema } from '@/lib/validations';

export async function GET(_req: Request, { params }: { params: { leadId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const authorized = await isMarketer();
    if (!authorized) return apiError('Forbidden', 403);

    const lead = await db.lead.findUnique({
      where: { id: params.leadId },
      include: { paymentEntries: { orderBy: { createdAt: 'asc' } } }
    });
    if (!lead) return apiError('Lead not found', 404);

    const totalPaid = lead.paymentEntries
      .filter((e) => e.status === 'PAID')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalWaived = lead.paymentEntries
      .filter((e) => e.status === 'WAIVED')
      .reduce((sum, e) => sum + e.amount, 0);
    const outstanding = (lead.agreedAmount ?? 0) - totalPaid - totalWaived;

    return NextResponse.json({ lead, totalPaid, totalWaived, outstanding });
  } catch (error) {
    return handleApiError('LEAD_PAYMENTS_GET', error);
  }
}

export async function POST(req: Request, { params }: { params: { leadId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const authorized = await isMarketer();
    if (!authorized) return apiError('Forbidden', 403);

    const lead = await db.lead.findUnique({
      where: { id: params.leadId },
      include: { paymentEntries: true }
    });
    if (!lead) return apiError('Lead not found', 404);
    if (lead.closureStatus !== 'WON')
      return apiError('Can only add payments to closed-won leads', 400);

    const body = await req.json();
    const validation = validateBody(createPaymentEntrySchema, body);
    if (!validation.success) return validation.response;

    const { label, amount, mode, dueDate, note } = validation.data;

    if (lead.agreedAmount !== null) {
      const existingTotal = lead.paymentEntries
        .filter((e) => e.status !== 'WAIVED' && e.status !== 'DELETION_REQUESTED')
        .reduce((s, e) => s + e.amount, 0);
      if (existingTotal + amount > lead.agreedAmount) {
        const remaining = lead.agreedAmount - existingTotal;
        return apiError(
          `Entry amount exceeds the remaining balance. Maximum allowed: ₹${remaining.toLocaleString('en-IN')}`,
          400
        );
      }
    }

    const entry = await db.leadPaymentEntry.create({
      data: {
        leadId: params.leadId,
        label,
        amount,
        mode,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        note,
        recordedBy: userId
      }
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return handleApiError('LEAD_PAYMENTS_POST', error);
  }
}
