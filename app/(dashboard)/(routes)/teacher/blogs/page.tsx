import { redirect } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { canManageBlogs } from '@/lib/blog-auth';
import { BlogFilterGrid } from './_components/blog-filter-grid';

interface BlogWithRelations {
  id: string;
  title: string;
  isPublished: boolean;
  createdAt: Date;
  slug: string;
  author: {
    name: string;
  };
  category: {
    name: string;
  } | null;
}

const BlogsPage = async () => {
  const isAuthorized = await canManageBlogs();
  if (!isAuthorized) return redirect('/');

  const blogs = (await db.blogPost.findMany({
    include: {
      author: true,
      category: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })) as unknown as BlogWithRelations[];

  const categories = await db.blogCategory.findMany({
    orderBy: { name: 'asc' }
  });

  const flatBlogs = blogs.map((b) => ({
    id: b.id,
    title: b.title,
    isPublished: b.isPublished,
    createdAt: b.createdAt,
    category: b.category?.name ?? null,
    author: b.author?.name ?? 'Unknown Author',
    slug: b.slug
  }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium">Manage Blogs</h1>
        <Link href="/teacher/blogs/create">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Blog Post
          </Button>
        </Link>
      </div>

      <BlogFilterGrid blogs={flatBlogs} categories={categories} />
    </div>
  );
};

export default BlogsPage;
