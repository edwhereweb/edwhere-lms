import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getPageCount, getPagination, getParam } from '@/lib/pagination';

export type BlogListSearchParams = {
  q?: string;
  category?: string;
  status?: string;
  page?: string;
};

// Shared by the admin, marketer and blogger blog lists: filtered and paged in the database.
export async function getBlogList(searchParams: BlogListSearchParams, authorId?: string) {
  const { page, skip, take } = getPagination(searchParams.page);
  const q = getParam(searchParams.q);
  const category = getParam(searchParams.category);
  const status = getParam(searchParams.status);

  const where: Prisma.BlogPostWhereInput = {
    ...(authorId && { authorId }),
    ...(q && { title: { contains: q, mode: 'insensitive' } }),
    // Ignore malformed ids from the URL instead of letting Prisma throw.
    ...(/^[a-f\d]{24}$/i.test(category) && { categoryId: category }),
    ...(status === 'published' && { isPublished: true }),
    ...(status === 'draft' && { isPublished: false })
  };

  const [total, posts, categories] = await Promise.all([
    db.blogPost.count({ where }),
    db.blogPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      // Only list columns; the post body is never sent to the list.
      select: {
        id: true,
        title: true,
        isPublished: true,
        createdAt: true,
        slug: true,
        author: { select: { name: true } },
        category: { select: { name: true } }
      }
    }),
    db.blogCategory.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
  ]);

  const blogs = posts.map((b) => ({
    id: b.id,
    title: b.title,
    isPublished: b.isPublished,
    createdAt: b.createdAt,
    category: b.category?.name ?? null,
    author: b.author?.name ?? 'Unknown Author',
    slug: b.slug
  }));

  return { blogs, categories, page, pageCount: getPageCount(total) };
}
