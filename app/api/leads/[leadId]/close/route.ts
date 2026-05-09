import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { isMarketer } from '@/lib/marketer';
import { closeLeadSchema } from '@/lib/validations';

export async function POST(req: Request, { params }: { params: { leadId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const authorized = await isMarketer();
    if (!authorized) return apiError('Forbidden', 403);

    const lead = await db.lead.findUnique({ where: { id: params.leadId } });
    if (!lead) return apiError('Lead not found', 404);

    if (lead.closureStatus) {
      return apiError('Lead is already closed', 400);
    }

    const body = await req.json();
    const validation = validateBody(closeLeadSchema, body);
    if (!validation.success) return validation.response;

    const { closureStatus, closureNote, agreedAmount, courseInterest } = validation.data;

    const updated = await db.lead.update({
      where: { id: params.leadId },
      data: {
        closureStatus,
        closureNote,
        agreedAmount,
        courseInterest,
        closedAt: new Date(),
        closedBy: userId,
        status: closureStatus === 'WON' ? 'CLOSED_WON' : 'CLOSED_LOST'
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('LEAD_CLOSE', error);
  }
}
