import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { upsertBlogAuthorSchema } from '@/lib/validations';
import { canManageBlogs } from '@/lib/blog-auth';

export async function POST(req: Request) {
  try {
    const isAuthorized = await canManageBlogs();
    if (!isAuthorized) return apiError('Unauthorized', 401);

    const body = await req.json();
    const validation = validateBody(upsertBlogAuthorSchema, body);
    if (!validation.success) return validation.response;

    const values = validation.data;

    const author = await db.blogAuthor.create({
      data: { ...values }
    });

    return NextResponse.json(author);
  } catch (error) {
    return handleApiError('BLOG_AUTHOR_CREATE', error);
  }
}

export async function GET(_req: Request) {
  try {
    const authors = await db.blogAuthor.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(authors);
  } catch (error) {
    return handleApiError('BLOG_AUTHOR_LIST', error);
  }
}
