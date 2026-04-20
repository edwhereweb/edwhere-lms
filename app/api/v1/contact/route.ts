import { db } from '@/lib/db';
import { validateRequest, apiErr, handleRouteError, apiOk } from '@/lib/api-response';
import { contactSchema } from '@/lib/validations';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    if (isRateLimited(`contact:${ip}`, { maxRequests: 5, windowMs: 60_000 })) {
      return apiErr('RATE_LIMITED', 'Too many requests. Please try again later.', 429);
    }

    const body = await req.json();
    const validation = validateRequest(contactSchema, body);
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

    return apiOk(lead, undefined, 201);
  } catch (error) {
    return handleRouteError('CONTACT_POST', error);
  }
}
