import { db } from '@/lib/db';
import { updateBlogPostSchema } from '@/lib/validations';
import { canManageBlogs } from '@/lib/blog-auth';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';

export async function PATCH(req: Request, { params }: { params: { blogId: string } }) {
  try {
    const isAuthorized = await canManageBlogs();
    if (!isAuthorized) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const body = await req.json();
    const validation = validateRequest(updateBlogPostSchema, body);
    if (!validation.success) return validation.response;

    const values = validation.data;

    const blogPost = await db.blogPost.update({
      where: { id: params.blogId },
      data: { ...values }
    });

    return apiOk(blogPost);
  } catch (error) {
    return handleRouteError('BLOG_POST_UPDATE', error);
  }
}

export async function DELETE(_req: Request, { params }: { params: { blogId: string } }) {
  try {
    const isAuthorized = await canManageBlogs();
    if (!isAuthorized) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    await db.blogPost.delete({
      where: { id: params.blogId }
    });

    return apiOk({ success: true });
  } catch (error) {
    return handleRouteError('BLOG_POST_DELETE', error);
  }
}
