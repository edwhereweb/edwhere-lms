import { redirect } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { canManageBlogs } from '@/lib/blog-auth';
import { getBlogList, type BlogListSearchParams } from '@/actions/get-blog-list';
import { BlogFilterGrid } from '@/app/(dashboard)/(routes)/marketer/blogs/_components/blog-filter-grid';

const BlogsPage = async ({ searchParams }: { searchParams: BlogListSearchParams }) => {
  const isAuthorized = await canManageBlogs();
  if (!isAuthorized) return redirect('/');

  const { blogs, categories, page, pageCount } = await getBlogList(searchParams);

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

      <BlogFilterGrid
        blogs={blogs}
        categories={categories}
        page={page}
        pageCount={pageCount}
        basePath="/teacher"
      />
    </div>
  );
};

export default BlogsPage;
