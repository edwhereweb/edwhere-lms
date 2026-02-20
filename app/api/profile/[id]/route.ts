import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { profileUpdateSchema } from '@/lib/validations';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';

export async function PATCH(req: Request, { params: _params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const body = await req.json();
    const validation = validateBody(profileUpdateSchema, body);
    if (!validation.success) return validation.response;

    const { role: _role, ...safeFields } = validation.data;

    const profile = await db.profile.update({
      where: { userId },
      data: safeFields
    });

    return NextResponse.json(profile);
  } catch (error) {
    return handleApiError('PROFILE_ID', error);
  }
}
