import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { webinarRegistrationSchema } from '@/lib/validations';
import { isRateLimited } from '@/lib/rate-limit';
import { sendWebinarConfirmationWhatsApp } from '@/lib/wacrm';

interface Params {
  params: { webinarId: string };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: Request, { params }: Params) {
  try {
    const ip = getClientIp(req);

    // Per-minute limit: max 3 attempts per IP
    if (isRateLimited(`webinar-register:${ip}:min`, { maxRequests: 3, windowMs: 60_000 })) {
      return apiError('Too many registration attempts. Please try again in a minute.', 429);
    }

    // Per-hour limit: max 10 attempts per IP
    if (isRateLimited(`webinar-register:${ip}:hr`, { maxRequests: 10, windowMs: 3_600_000 })) {
      return apiError('Too many registration attempts. Please try again later.', 429);
    }

    const body = await req.json();
    const validation = validateBody(webinarRegistrationSchema, body);
    if (!validation.success) return validation.response;

    const { name, email, countryCode, phone, website } = validation.data;

    // Honeypot check — silently accept but do not create a record
    if (website && website.length > 0) {
      return NextResponse.json({ success: true }, { status: 201 });
    }

    // Ensure the webinar exists and is published
    const webinar = await db.webinar.findUnique({
      where: { id: params.webinarId, isPublished: true },
      select: { id: true, title: true, scheduledAt: true, meetLink: true }
    });

    if (!webinar) return apiError('Webinar not found', 404);

    // Check if the user is already registered with this email OR phone
    const existingRegistration = await db.webinarRegistration.findFirst({
      where: {
        webinarId: params.webinarId,
        OR: [{ email }, { phone }]
      }
    });

    if (existingRegistration) {
      return apiError("You're already registered for this webinar.", 409);
    }

    try {
      await db.webinarRegistration.create({
        data: {
          webinarId: params.webinarId,
          name,
          email,
          countryCode,
          phone,
          registeredIp: ip
        }
      });
    } catch (err: unknown) {
      // Prisma unique constraint violation code
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        return apiError("You're already registered for this webinar.", 409);
      }
      throw err;
    }

    // Fire-and-forget — WhatsApp confirmation skipped if WACRM env vars are absent
    const fullPhone = `+${(countryCode ?? '+91').replace('+', '')}${phone}`;
    void sendWebinarConfirmationWhatsApp({
      phone: fullPhone,
      name,
      webinarTitle: webinar.title,
      scheduledAt: webinar.scheduledAt,
      meetLink: webinar.meetLink
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleApiError('WEBINAR_REGISTER', error);
  }
}
