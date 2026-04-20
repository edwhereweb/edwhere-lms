import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { currentProfile } from '@/lib/current-profile';
import { profileUpdateSchema } from '@/lib/validations';
import { validateRequest, apiErr, handleRouteError, apiOk } from '@/lib/api-response';
import { urlToR2Key, deleteObject } from '@/lib/r2';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const isAdmin = profile.role === 'ADMIN';
    const isSelf = profile.id === params.id;

    if (!isAdmin && !isSelf) {
      return apiErr(
        'FORBIDDEN',
        'Forbidden. You do not have permission to edit this profile.',
        403
      );
    }

    const body = await req.json();
    const validation = validateRequest(profileUpdateSchema, body);
    if (!validation.success) return validation.response;

    if (validation.data.imageUrl !== undefined) {
      const existing = await db.profile.findUnique({
        where: { id: params.id },
        select: { imageUrl: true }
      });
      const oldKey = urlToR2Key(existing?.imageUrl ?? null);
      const newUrl = validation.data.imageUrl ?? null;
      if (oldKey && newUrl !== existing?.imageUrl) {
        try {
          await deleteObject(oldKey);
        } catch {
          // continue — object may already be gone
        }
      }
    }

    const { role, ...safeFields } = validation.data;

    // Prevent non-admins from changing roles at all
    if (!isAdmin && role) {
      return apiErr('FORBIDDEN', 'Forbidden. Only admins can change roles.', 403);
    }

    const updateData = {
      ...safeFields,
      ...(role ? { role: role as 'ADMIN' | 'TEACHER' | 'STUDENT' | 'MARKETER' | 'BLOGGER' } : {})
    };

    const updatedProfile = await db.profile.update({
      where: { id: params.id },
      data: updateData
    });

    return apiOk(updatedProfile);
  } catch (error) {
    return handleRouteError('PROFILE_ID', error);
  }
}
