import { Metadata } from 'next';
import { db } from '@/lib/db';
import { BlogCard } from '@/components/blog/blog-card';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog | Edwhere Learning',
  description:
    'Advanced technical tutorials, security walkthroughs, and expert insights on C programming, IoT, and Cybersecurity.'
};

interface BlogIndexPageProps {
  searchParams: {
    categoryId?: string;
    tag?: string;
  };
}

const BlogIndexPage = async ({ searchParams }: BlogIndexPageProps) => {
  const [categories, posts] = await Promise.all([
    db.blogCategory.findMany({
      orderBy: { name: 'asc' }
    }),
    db.blogPost.findMany({
      where: {
        isPublished: true,
        ...(searchParams.categoryId ? { categoryId: searchParams.categoryId } : {}),
        ...(searchParams.tag ? { tags: { has: searchParams.tag } } : {})
      },
      include: {
        author: true,
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  ]);

  return (
    <div className="pb-20">
      {/* Header Section */}
      <div className="bg-slate-900 py-20 px-6 text-white text-center">
        <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
          EDWHERE <span className="text-sky-400">BLOG</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Master the art of technical problem solving with our expert-led walkthroughs and deep
          dives.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar / Filters */}
          <div className="md:w-64 flex-shrink-0 space-y-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
                Categories
              </h3>
              <div className="flex flex-col gap-y-2">
                <Link
                  href="/blog"
                  className={`text-sm py-2 px-3 rounded-md transition-colors ${!searchParams.categoryId ? 'bg-sky-100 text-sky-700 font-bold' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                  All Topics
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/blog?categoryId=${cat.id}`}
                    className={`text-sm py-2 px-3 rounded-md transition-colors ${searchParams.categoryId === cat.id ? 'bg-sky-100 text-sky-700 font-bold' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Posts Grid */}
          <div className="flex-1">
            {posts.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
                <p className="text-slate-500 text-lg">No articles found in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                {posts.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogIndexPage;
