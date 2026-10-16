import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { createApiKeySchema } from '@/lib/validations';
import { generateApiKey, hashApiKey } from '@/lib/api-key';

export async function GET(_req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') return apiError('Forbidden', 403);

    const keys = await db.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        scopes: true,
        isActive: true,
        createdBy: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true
        // keyHash is intentionally excluded
      }
    });

    return NextResponse.json(keys);
  } catch (error) {
    return handleApiError('ADMIN_API_KEYS_GET', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') return apiError('Forbidden', 403);

    const body = await req.json();
    const validation = validateBody(createApiKeySchema, body);
    if (!validation.success) return validation.response;

    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);

    const created = await db.apiKey.create({
      data: {
        name: validation.data.name,
        keyHash,
        scopes: validation.data.scopes,
        createdBy: userId
      },
      select: {
        id: true,
        name: true,
        scopes: true,
        isActive: true,
        createdAt: true
      }
    });

    // rawKey is returned only here — never stored, never retrievable again
    return NextResponse.json({ ...created, rawKey }, { status: 201 });
  } catch (error) {
    return handleApiError('ADMIN_API_KEYS_POST', error);
  }
}
