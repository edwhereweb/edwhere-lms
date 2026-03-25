import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { upsertBlogTagMappingSchema } from '@/lib/validations';
import { canManageBlogs } from '@/lib/blog-auth';

export async function POST(req: Request) {
  try {
    const isAuthorized = await canManageBlogs();
    if (!isAuthorized) return apiError('Unauthorized', 401);

    const body = await req.json();
    const validation = validateBody(upsertBlogTagMappingSchema, body);
    if (!validation.success) return validation.response;

    const { tagName, courseId } = validation.data;

    const mapping = await db.blogTagMapping.upsert({
      where: { tagName },
      update: { courseId },
      create: { tagName, courseId }
    });

    return NextResponse.json(mapping);
  } catch (error) {
    return handleApiError('BLOG_TAG_MAPPING_UPSERT', error);
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
    return NextResponse.json(mappings);
  } catch (error) {
    return handleApiError('BLOG_TAG_MAPPING_LIST', error);
  }
}
