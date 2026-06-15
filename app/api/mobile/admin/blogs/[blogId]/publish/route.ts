import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { canManageBlogs } from '@/lib/blog-auth';
import { db } from '@/lib/db';

type Params = { params: Promise<{ blogId: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManageBlogs();
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { blogId } = await params;

    const post = await db.blogPost.findUnique({
      where: { id: blogId },
      select: { isPublished: true }
    });

    if (!post) return mobileError('NOT_FOUND', 'Blog post not found', 404);

    const updated = await db.blogPost.update({
      where: { id: blogId },
      data: { isPublished: !post.isPublished }
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BLOG_PUBLISH', error);
  }
}
