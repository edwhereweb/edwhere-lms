import { db } from '@/lib/db';
import { createBlogPostSchema } from '@/lib/validations';
import { canManageBlogs } from '@/lib/blog-auth';
import { currentProfile } from '@/lib/current-profile';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    const isAuthorized = await canManageBlogs();

    if (!profile || !isAuthorized) {
      return apiErr('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await req.json();
    const validation = validateRequest(createBlogPostSchema, body);
    if (!validation.success) return validation.response;

    const { title } = validation.data;

    // Generate unique slug from title
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let slug = baseSlug;
    let count = 1;
    while (await db.blogPost.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    // Default to first author if exists, or create one for the user if needed
    // For now, assume we'll select/create author in the UI.
    // Here we just initialize with a dummy or let the user choose later.
    // However, authorId is required in schema.

    let author = await db.blogAuthor.findFirst({
      where: { userId: profile.userId }
    });

    if (!author) {
      author = await db.blogAuthor.create({
        data: {
          userId: profile.userId,
          name: profile.name,
          imageUrl: profile.imageUrl
        }
      });
    }

    const blogPost = await db.blogPost.create({
      data: {
        title,
        slug,
        content: '', // Initial empty content
        authorId: author.id
      }
    });

    return apiOk(blogPost);
  } catch (error) {
    return handleRouteError('BLOG_POST_CREATE', error);
  }
}

export async function GET(req: Request) {
  try {
    const isAuthorized = await canManageBlogs();
    if (!isAuthorized) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const isPublished = searchParams.get('isPublished');

    const blogs = await db.blogPost.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(isPublished !== null ? { isPublished: isPublished === 'true' } : {})
      },
      include: {
        author: true,
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return apiOk(blogs);
  } catch (error) {
    return handleRouteError('BLOG_POST_LIST', error);
  }
}
