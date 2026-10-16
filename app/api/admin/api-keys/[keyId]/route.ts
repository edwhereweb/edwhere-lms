import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { updateApiKeySchema } from '@/lib/validations';

interface Params {
  params: { keyId: string };
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') return apiError('Forbidden', 403);

    const body = await req.json();
    const validation = validateBody(updateApiKeySchema, body);
    if (!validation.success) return validation.response;

    const existing = await db.apiKey.findUnique({ where: { id: params.keyId } });
    if (!existing) return apiError('API key not found', 404);

    const updated = await db.apiKey.update({
      where: { id: params.keyId },
      data: validation.data,
      select: {
        id: true,
        name: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('ADMIN_API_KEY_PATCH', error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') return apiError('Forbidden', 403);

    const existing = await db.apiKey.findUnique({ where: { id: params.keyId } });
    if (!existing) return apiError('API key not found', 404);

    await db.apiKey.delete({ where: { id: params.keyId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError('ADMIN_API_KEY_DELETE', error);
  }
}
