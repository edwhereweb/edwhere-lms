import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { categorySchema } from '@/lib/validations';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const categories = await db.category.findMany({
      orderBy: { name: 'asc' }
    });

    return apiOk(categories);
  } catch (error) {
    return handleRouteError('CATEGORIES_GET', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') {
      return apiErr('FORBIDDEN', 'Forbidden', 403);
    }

    const body = await req.json();
    const validation = validateRequest(categorySchema, body);
    if (!validation.success) return validation.response;

    const category = await db.category.create({
      data: { name: validation.data.name }
    });

    return apiOk(category);
  } catch (error) {
    return handleRouteError('CATEGORIES_POST', error);
  }
}
