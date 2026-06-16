import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one ID is required')
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') {
      return apiError('Forbidden — only admins can revoke certificates', 403);
    }

    const body = await req.json();
    const validation = validateBody(bulkDeleteSchema, body);
    if (!validation.success) return validation.response;

    const { ids } = validation.data;

    const result = await db.certificate.deleteMany({ where: { id: { in: ids } } });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    return handleApiError('BULK_DELETE_CERTIFICATES', error);
  }
}
