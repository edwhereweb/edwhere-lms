import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categorySchema } from '@/lib/validations';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const categories = await db.category.findMany({
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(categories);
  } catch (error) {
    return handleApiError('CATEGORIES_GET', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || !['ADMIN', 'TEACHER'].includes(profile.role)) {
      return apiError('Forbidden', 403);
    }

    const body = await req.json();
    const validation = validateBody(categorySchema, body);
    if (!validation.success) return validation.response;

    const category = await db.category.create({
      data: { name: validation.data.name }
    });

    return NextResponse.json(category);
  } catch (error) {
    return handleApiError('CATEGORIES_POST', error);
  }
}
