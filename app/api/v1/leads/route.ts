import { db } from '@/lib/db';
import { isMarketer } from '@/lib/marketer';
import { validateRequest, apiErr, handleRouteError } from '@/lib/api-response';
import { createLeadSchema } from '@/lib/validations';

export async function GET() {
  try {
    const authorized = await isMarketer();
    if (!authorized) return apiErr('FORBIDDEN', 'Forbidden', 403);

    const leads = await db.lead.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return apiOk(leads);
  } catch (error) {
    return handleRouteError('LEADS_GET', error);
  }
}

export async function POST(req: Request) {
  try {
    const authorized = await isMarketer();
    if (!authorized) return apiErr('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const validation = validateRequest(createLeadSchema, body);
    if (!validation.success) return validation.response;

    const lead = await db.lead.create({
      data: {
        ...validation.data,
        status: 'NEW_LEAD'
      }
    });

    return apiOk(lead, undefined, 201);
  } catch (error) {
    return handleRouteError('LEADS_POST', error);
  }
}
