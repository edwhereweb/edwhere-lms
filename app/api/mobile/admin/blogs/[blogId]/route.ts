import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { canManageBlogs } from '@/lib/blog-auth';
import { db } from '@/lib/db';
import { updateBlogPostSchema } from '@/lib/validations';

type Params = { params: Promise<{ blogId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManageBlogs();
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { blogId } = await params;

    const post = await db.blogPost.findUnique({
      where: { id: blogId },
      include: {
        author: { select: { id: true, name: true, imageUrl: true } },
        category: { select: { id: true, name: true } }
      }
    });

    if (!post) return mobileError('NOT_FOUND', 'Blog post not found', 404);

    return mobileSuccess(post);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BLOG_DETAIL', error);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManageBlogs();
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { blogId } = await params;

    const body = await req.json();
    const result = validateMobileBody(updateBlogPostSchema, body);
    if (!result.success) return result.response;

    const existing = await db.blogPost.findUnique({ where: { id: blogId } });
    if (!existing) return mobileError('NOT_FOUND', 'Blog post not found', 404);

    const updated = await db.blogPost.update({
      where: { id: blogId },
      data: result.data
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BLOG_UPDATE', error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManageBlogs();
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { blogId } = await params;

    const existing = await db.blogPost.findUnique({ where: { id: blogId } });
    if (!existing) return mobileError('NOT_FOUND', 'Blog post not found', 404);

    await db.blogPost.delete({ where: { id: blogId } });

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BLOG_DELETE', error);
  }
}
