import { db } from '@/lib/db';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;

    // Try finding by slug first, then fall back to ID
    let course = await db.course.findFirst({
      where: {
        slug,
        isPublished: true
      },
      include: {
        category: true,
        chapters: {
          where: { isPublished: true },
          select: { id: true, title: true, isFree: true, position: true },
          orderBy: { position: 'asc' }
        },
        modules: {
          where: { isPublished: true },
          select: {
            id: true,
            title: true,
            position: true,
            chapters: {
              where: { isPublished: true },
              select: { id: true, title: true, isFree: true, position: true },
              orderBy: { position: 'asc' }
            }
          },
          orderBy: { position: 'asc' }
        },
        instructors: {
          include: {
            profile: {
              select: { name: true, imageUrl: true }
            }
          }
        }
      }
    });

    // Fallback: try by MongoDB ObjectId
    if (!course) {
      course = await db.course.findFirst({
        where: {
          id: slug,
          isPublished: true
        },
        include: {
          category: true,
          chapters: {
            where: { isPublished: true },
            select: { id: true, title: true, isFree: true, position: true },
            orderBy: { position: 'asc' }
          },
          modules: {
            where: { isPublished: true },
            select: {
              id: true,
              title: true,
              position: true,
              chapters: {
                where: { isPublished: true },
                select: { id: true, title: true, isFree: true, position: true },
                orderBy: { position: 'asc' }
              }
            },
            orderBy: { position: 'asc' }
          },
          instructors: {
            include: {
              profile: {
                select: { name: true, imageUrl: true }
              }
            }
          }
        }
      });
    }

    if (!course) {
      return apiErr('NOT_FOUND', 'Not found', 404);
    }

    // Count total published chapters (standalone + in modules)
    const standaloneChapters = course.chapters.filter(
      (ch) => !course!.modules.some((m) => m.chapters.some((mc) => mc.id === ch.id))
    );
    const totalChapters =
      standaloneChapters.length + course.modules.reduce((sum, m) => sum + m.chapters.length, 0);

    return apiOk({
      id: course.id,
      title: course.title,
      description: course.description,
      imageUrl: course.imageUrl,
      price: course.price,
      slug: course.slug,
      metaTitle: course.metaTitle,
      metaDescription: course.metaDescription,
      category: course.category,
      chaptersCount: totalChapters,
      modules: course.modules,
      chapters: standaloneChapters,
      instructors: course.instructors.map((i) => ({
        name: i.profile.name,
        imageUrl: i.profile.imageUrl
      })),
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    });
  } catch (error) {
    return handleRouteError('PUBLIC_COURSE_SLUG', error);
  }
}
