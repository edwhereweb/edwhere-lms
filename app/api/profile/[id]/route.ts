import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { profileUpdateSchema } from '@/lib/validations';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import getSafeProfile from '@/actions/get-safe-profile';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const profile = await getSafeProfile();

    if (!profile) {
      return apiError('Unauthorized', 401);
    }

    const isAdmin = profile.role === 'ADMIN';
    const isSelf = profile.id === params.id;

    if (!isAdmin && !isSelf) {
      return apiError('Forbidden. You do not have permission to edit this profile.', 403);
    }

    const body = await req.json();
    const validation = validateBody(profileUpdateSchema, body);
    if (!validation.success) return validation.response;

    const { role, ...safeFields } = validation.data;

    // Prevent non-admins from changing roles at all
    if (!isAdmin && role) {
      return apiError('Forbidden. Only admins can change roles.', 403);
    }

    const updateData = {
      ...safeFields,
      ...(role ? { role: role as 'ADMIN' | 'TEACHER' | 'STUDENT' } : {})
    };

    const updatedProfile = await db.profile.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    return handleApiError('PROFILE_ID', error);
  }
}
