import { db } from '@/lib/db';
import { upsertBlogCategorySchema } from '@/lib/validations';
import { canManageBlogs } from '@/lib/blog-auth';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';

export async function POST(req: Request) {
  try {
    const isAuthorized = await canManageBlogs();
    if (!isAuthorized) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const body = await req.json();
    const validation = validateRequest(upsertBlogCategorySchema, body);
    if (!validation.success) return validation.response;

    const values = validation.data;

    const category = await db.blogCategory.create({
      data: { ...values }
    });

    return apiOk(category);
  } catch (error) {
    return handleRouteError('BLOG_CATEGORY_CREATE', error);
  }
}

export async function GET(_req: Request) {
  try {
    const categories = await db.blogCategory.findMany({
      orderBy: { name: 'asc' }
    });
    return apiOk(categories);
  } catch (error) {
    return handleRouteError('BLOG_CATEGORY_LIST', error);
  }
}
