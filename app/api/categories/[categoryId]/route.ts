import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import getSafeProfile from '@/actions/get-safe-profile';

export async function DELETE(req: Request, { params }: { params: { categoryId: string } }) {
  try {
    const profile = await getSafeProfile();

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
