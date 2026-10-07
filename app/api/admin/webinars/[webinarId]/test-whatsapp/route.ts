import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { testWhatsappSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import { sendWebinarConfirmationWhatsApp } from '@/lib/wacrm';

interface Params {
  params: { webinarId: string };
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const body = await req.json();
    const validation = validateBody(testWhatsappSchema, body);
    if (!validation.success) return validation.response;

    const { countryCode, phone } = validation.data;

    const webinar = await db.webinar.findUnique({
      where: { id: params.webinarId },
      select: { id: true, title: true, scheduledAt: true, meetLink: true }
    });

    if (!webinar) return apiError('Webinar not found', 404);

    const fullPhone = `${(countryCode ?? '91').replace('+', '')}${phone}`;

    await sendWebinarConfirmationWhatsApp({
      phone: fullPhone,
      name: 'Test User',
      webinarTitle: webinar.title,
      scheduledAt: webinar.scheduledAt,
      meetLink: webinar.meetLink
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('WEBINAR_TEST_WHATSAPP', error);
  }
}
