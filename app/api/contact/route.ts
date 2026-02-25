import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { contactSchema } from '@/lib/validations';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    if (isRateLimited(`contact:${ip}`, { maxRequests: 5, windowMs: 60_000 })) {
      return apiError('Too many requests. Please try again later.', 429);
    }

    const body = await req.json();
    const validation = validateBody(contactSchema, body);
    if (!validation.success) return validation.response;

    const { name, phone, email, message } = validation.data;

    const lead = await db.lead.create({
      data: {
        name,
        phone,
        email,
        message,
        source: 'GENERAL_WEBSITE_ENQUIRY',
        status: 'NEW_LEAD'
      }
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return handleApiError('CONTACT_POST', error);
  }
}
