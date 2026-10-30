import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { canManageBlogs } from '@/lib/blog-auth';
import { currentProfile } from '@/lib/current-profile';
import { getBlogList, type BlogListSearchParams } from '@/actions/get-blog-list';
import { BlogFilterGrid } from '@/app/(dashboard)/(routes)/marketer/blogs/_components/blog-filter-grid';

const BloggerBlogsPage = async ({ searchParams }: { searchParams: BlogListSearchParams }) => {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const isAuthorized = await canManageBlogs();
  if (!isAuthorized) redirect('/');

  const profile = await currentProfile();
  if (!profile) redirect('/');

  // Bloggers only manage their own posts — find their BlogAuthor record first
  const author = await db.blogAuthor.findUnique({ where: { userId: profile.userId } });

  const { blogs, categories, page, pageCount } = author
    ? await getBlogList(searchParams, author.id)
    : {
        blogs: [],
        categories: await db.blogCategory.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, name: true }
        }),
        page: 1,
        pageCount: 1
      };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium">My Blogs</h1>
        <Link href="/blogger/blogs/create">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Blog Post
          </Button>
        </Link>
      </div>
      <BlogFilterGrid
        blogs={blogs}
        categories={categories}
        page={page}
        pageCount={pageCount}
        basePath="/blogger"
      />
    </div>
  );
};

export default BloggerBlogsPage;
