import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { updateBlogPostSchema } from '@/lib/validations';
import { canManageBlogs } from '@/lib/blog-auth';

export async function PATCH(req: Request, { params }: { params: { blogId: string } }) {
  try {
    const isAuthorized = await canManageBlogs();
    if (!isAuthorized) return apiError('Unauthorized', 401);

    const body = await req.json();
    const validation = validateBody(updateBlogPostSchema, body);
    if (!validation.success) return validation.response;

    const values = validation.data;

    const blogPost = await db.blogPost.update({
      where: { id: params.blogId },
      data: { ...values }
    });

    return NextResponse.json(blogPost);
  } catch (error) {
    return handleApiError('BLOG_POST_UPDATE', error);
  }
}

export async function DELETE(req: Request, { params }: { params: { blogId: string } }) {
  try {
    const isAuthorized = await canManageBlogs();
    if (!isAuthorized) return apiError('Unauthorized', 401);

    await db.blogPost.delete({
      where: { id: params.blogId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('BLOG_POST_DELETE', error);
  }
}
