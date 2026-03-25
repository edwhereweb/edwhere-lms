import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { upsertBlogCategorySchema } from '@/lib/validations';
import { canManageBlogs } from '@/lib/blog-auth';

export async function POST(req: Request) {
  try {
    const isAuthorized = await canManageBlogs();
    if (!isAuthorized) return apiError('Unauthorized', 401);

    const body = await req.json();
    const validation = validateBody(upsertBlogCategorySchema, body);
    if (!validation.success) return validation.response;

    const values = validation.data;

    const category = await db.blogCategory.create({
      data: { ...values }
    });

    return NextResponse.json(category);
  } catch (error) {
    return handleApiError('BLOG_CATEGORY_CREATE', error);
  }
}

export async function GET(_req: Request) {
  try {
    const categories = await db.blogCategory.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(categories);
  } catch (error) {
    return handleApiError('BLOG_CATEGORY_LIST', error);
  }
}
