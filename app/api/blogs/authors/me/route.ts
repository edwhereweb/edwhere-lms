import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { upsertBlogAuthorSchema } from '@/lib/validations';
import { currentProfile } from '@/lib/current-profile';
import { canManageBlogs } from '@/lib/blog-auth';

export async function GET() {
  try {
    const profile = await currentProfile();
    const isAuthorized = await canManageBlogs();

    if (!profile || !isAuthorized) {
      return apiError('Unauthorized', 401);
    }

    const author = await db.blogAuthor.findUnique({
      where: { userId: profile.userId }
    });

    return NextResponse.json(author);
  } catch (error) {
    return handleApiError('BLOG_AUTHOR_GET_ME', error);
  }
}

export async function PATCH(req: Request) {
  try {
    const profile = await currentProfile();
    const isAuthorized = await canManageBlogs();

    if (!profile || !isAuthorized) {
      return apiError('Unauthorized', 401);
    }

    const body = await req.json();
    const validation = validateBody(upsertBlogAuthorSchema, body);
    if (!validation.success) return validation.response;

    const values = validation.data;

    const author = await db.blogAuthor.upsert({
      where: { userId: profile.userId },
      update: { ...values },
      create: {
        ...values,
        userId: profile.userId,
        name: values.name || profile.name
      }
    });

    return NextResponse.json(author);
  } catch (error) {
    return handleApiError('BLOG_AUTHOR_UPDATE_ME', error);
  }
}
