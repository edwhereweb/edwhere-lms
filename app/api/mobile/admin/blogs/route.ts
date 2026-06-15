import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { canManageBlogs } from '@/lib/blog-auth';
import { db } from '@/lib/db';
import { createBlogPostSchema } from '@/lib/validations';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManageBlogs();
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { searchParams } = new URL(req.url);
    const isPublished = searchParams.get('isPublished');

    const where: Record<string, unknown> = {};
    if (isPublished === 'true') where.isPublished = true;
    if (isPublished === 'false') where.isPublished = false;

    const posts = await db.blogPost.findMany({
      where,
      include: {
        author: { select: { name: true } },
        category: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return mobileSuccess(posts);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BLOGS_LIST', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManageBlogs();
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const result = validateMobileBody(createBlogPostSchema, body);
    if (!result.success) return result.response;

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile) return mobileError('NOT_FOUND', 'Profile not found', 404);

    let author = await db.blogAuthor.findUnique({ where: { userId } });
    if (!author) {
      author = await db.blogAuthor.create({
        data: { userId, name: profile.name }
      });
    }

    const baseSlug = result.data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const existing = await db.blogPost.findUnique({ where: { slug: baseSlug } });
    const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;

    const post = await db.blogPost.create({
      data: {
        title: result.data.title,
        slug,
        content: '',
        authorId: author.id
      }
    });

    return mobileCreated(post);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BLOGS_CREATE', error);
  }
}
