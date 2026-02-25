import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isMarketer } from '@/lib/marketer';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { createLeadSchema } from '@/lib/validations';

export async function GET() {
  try {
    const authorized = await isMarketer();
    if (!authorized) return apiError('Forbidden', 403);

    const leads = await db.lead.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(leads);
  } catch (error) {
    return handleApiError('LEADS_GET', error);
  }
}

export async function POST(req: Request) {
  try {
    const authorized = await isMarketer();
    if (!authorized) return apiError('Forbidden', 403);

    const body = await req.json();
    const validation = validateBody(createLeadSchema, body);
    if (!validation.success) return validation.response;

    const lead = await db.lead.create({
      data: {
        ...validation.data,
        status: 'NEW_LEAD'
      }
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return handleApiError('LEADS_POST', error);
  }
}
