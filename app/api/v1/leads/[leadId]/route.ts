import { db } from '@/lib/db';
import { isMarketer } from '@/lib/marketer';
import { validateRequest, apiErr, handleRouteError, apiOk } from '@/lib/api-response';
import { updateLeadSchema } from '@/lib/validations';

export async function PATCH(req: Request, { params }: { params: { leadId: string } }) {
  try {
    const authorized = await isMarketer();
    if (!authorized) return apiErr('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const validation = validateRequest(updateLeadSchema, body);
    if (!validation.success) return validation.response;

    const lead = await db.lead.update({
      where: { id: params.leadId },
      data: validation.data
    });

    return apiOk(lead);
  } catch (error) {
    return handleRouteError('LEAD_PATCH', error);
  }
}
