import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { currentProfile } from '@/lib/current-profile';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';

export async function DELETE(_req: Request, { params }: { params: { categoryId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || profile.role !== 'ADMIN') {
      return apiErr('FORBIDDEN', 'Forbidden. Only admins can delete categories.', 403);
    }

    if (!params.categoryId) {
      return apiErr('VALIDATION', 'Missing category ID', 400);
    }

    const category = await db.category.delete({
      where: { id: params.categoryId }
    });

    return apiOk(category);
  } catch (error) {
    return handleRouteError('CATEGORY_ID_DELETE', error);
  }
}
