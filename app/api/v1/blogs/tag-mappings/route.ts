import { db } from '@/lib/db';
import { upsertBlogTagMappingSchema } from '@/lib/validations';
import { canManageBlogs } from '@/lib/blog-auth';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';

export async function POST(req: Request) {
  try {
    const isAuthorized = await canManageBlogs();
    if (!isAuthorized) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const body = await req.json();
    const validation = validateRequest(upsertBlogTagMappingSchema, body);
    if (!validation.success) return validation.response;

    const { tagName, courseId } = validation.data;

    const mapping = await db.blogTagMapping.upsert({
      where: { tagName },
      update: { courseId },
      create: { tagName, courseId }
    });

    return apiOk(mapping);
  } catch (error) {
    return handleRouteError('BLOG_TAG_MAPPING_UPSERT', error);
  }
}

export async function GET() {
  try {
    const mappings = await db.blogTagMapping.findMany({
      include: {
        course: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { tagName: 'asc' }
    });
    return apiOk(mappings);
  } catch (error) {
    return handleRouteError('BLOG_TAG_MAPPING_LIST', error);
  }
}
