import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { apiError, handleApiError } from '@/lib/api-utils';

const VALID_CONTENT_TYPES = [
  'VIDEO_MUX',
  'VIDEO_YOUTUBE',
  'TEXT',
  'HTML_EMBED',
  'PDF_DOCUMENT'
] as const;

const VALID_PAGE_SIZES = [10, 20, 30] as const;

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    const isAdmin = profile?.role === 'ADMIN';
    const isTeacher = profile?.role === 'TEACHER';

    if (!profile || (!isAdmin && !isTeacher)) return apiError('Forbidden', 403);

    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search')?.trim() ?? '';
    const contentTypeParam = searchParams.get('contentType') ?? '';
    const courseIdParam = searchParams.get('courseId') ?? '';
    const pageParam = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSizeParam = parseInt(searchParams.get('pageSize') ?? '10', 10);

    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const pageSize = (VALID_PAGE_SIZES as readonly number[]).includes(pageSizeParam)
      ? pageSizeParam
      : 10;

    // For teachers, restrict to courses they own or are instructors on.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (isTeacher) {
      // Build the set of allowed courseIds for this teacher
      const teacherCourses = await db.course.findMany({
        where: {
          OR: [{ userId }, { instructors: { some: { profileId: profile.id } } }]
        },
        select: { id: true }
      });
      const allowedCourseIds = teacherCourses.map((c) => c.id);

      // If a specific courseId filter is requested, use it only if allowed.
      if (courseIdParam && allowedCourseIds.includes(courseIdParam)) {
        where.courseId = courseIdParam;
      } else {
        where.courseId = { in: allowedCourseIds };
      }
    } else if (courseIdParam) {
      // Admin — unrestricted but can still filter by course
      where.courseId = courseIdParam;
    }

    if (contentTypeParam && (VALID_CONTENT_TYPES as readonly string[]).includes(contentTypeParam)) {
      where.contentType = contentTypeParam;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [totalCount, items] = await Promise.all([
      db.chapter.count({ where }),
      db.chapter.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          contentType: true,
          isPublished: true,
          courseId: true,
          updatedAt: true,
          course: { select: { id: true, title: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return NextResponse.json({ items, totalCount, page, pageSize });
  } catch (error) {
    return handleApiError('ASSET_LIBRARY_GET', error);
  }
}
