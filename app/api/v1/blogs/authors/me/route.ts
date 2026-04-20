import { db } from '@/lib/db';
import { upsertBlogAuthorSchema } from '@/lib/validations';
import { currentProfile } from '@/lib/current-profile';
import { canManageBlogs } from '@/lib/blog-auth';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';

export async function GET() {
  try {
    const profile = await currentProfile();
    const isAuthorized = await canManageBlogs();

    if (!profile || !isAuthorized) {
      return apiErr('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const author = await db.blogAuthor.findUnique({
      where: { userId: profile.userId }
    });

    return apiOk(author);
  } catch (error) {
    return handleRouteError('BLOG_AUTHOR_GET_ME', error);
  }
}

export async function PATCH(req: Request) {
  try {
    const profile = await currentProfile();
    const isAuthorized = await canManageBlogs();

    if (!profile || !isAuthorized) {
      return apiErr('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await req.json();
    const validation = validateRequest(upsertBlogAuthorSchema, body);
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

    return apiOk(author);
  } catch (error) {
    return handleRouteError('BLOG_AUTHOR_UPDATE_ME', error);
  }
}
