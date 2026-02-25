import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { currentProfile } from '@/lib/current-profile';
import { apiError, handleApiError } from '@/lib/api-utils';

export async function DELETE(_req: Request, { params }: { params: { categoryId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || profile.role !== 'ADMIN') {
      return apiError('Forbidden. Only admins can delete categories.', 403);
    }

    if (!params.categoryId) {
      return apiError('Missing category ID', 400);
    }

    const category = await db.category.delete({
      where: { id: params.categoryId }
    });

    return NextResponse.json(category);
  } catch (error) {
    return handleApiError('CATEGORY_ID_DELETE', error);
  }
}
