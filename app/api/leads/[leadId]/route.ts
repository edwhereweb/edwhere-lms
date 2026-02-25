import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isMarketer } from '@/lib/marketer';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { updateLeadSchema } from '@/lib/validations';

export async function PATCH(req: Request, { params }: { params: { leadId: string } }) {
  try {
    const authorized = await isMarketer();
    if (!authorized) return apiError('Forbidden', 403);

    const body = await req.json();
    const validation = validateBody(updateLeadSchema, body);
    if (!validation.success) return validation.response;

    const lead = await db.lead.update({
      where: { id: params.leadId },
      data: validation.data
    });

    return NextResponse.json(lead);
  } catch (error) {
    return handleApiError('LEAD_PATCH', error);
  }
}
