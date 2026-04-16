import { redirect } from 'next/navigation';
import { LayoutDashboard, FileText, Settings } from 'lucide-react';

import { db } from '@/lib/db';
import { Banner } from '@/components/banner';
import { canManageBlogs } from '@/lib/blog-auth';
import { currentProfile } from '@/lib/current-profile';

import { TitleForm } from '../../../marketer/blogs/[blogId]/_components/title-form';
import { SlugForm } from '@/components/blog/slug-form';
import { ImageForm } from '../../../marketer/blogs/[blogId]/_components/image-form';
import { ContentForm } from '../../../marketer/blogs/[blogId]/_components/content-form';
import { CategoryForm } from '../../../marketer/blogs/[blogId]/_components/category-form';
import { AuthorForm } from '../../../marketer/blogs/[blogId]/_components/author-form';
import { SEOForm } from '../../../marketer/blogs/[blogId]/_components/seo-form';
import { SEOAnalyzer } from '@/components/blog/seo-analyzer';
import { RelatedCoursesForm } from '@/components/blog/related-courses-form';
import { BlogActions } from './_components/blog-actions';

interface BlogIdPageProps {
  params: {
    blogId: string;
  };
}

const BloggerBlogIdPage = async ({ params }: BlogIdPageProps) => {
  const isAuthorized = await canManageBlogs();
  if (!isAuthorized) return redirect('/');

  const profile = await currentProfile();
  if (!profile) return redirect('/');

  // Find the author record for this user
  const author = await db.blogAuthor.findUnique({
    where: { userId: profile.userId }
  });

  if (!author) return redirect('/blogger/blogs');

  const blog = await db.blogPost.findUnique({
    where: {
      id: params.blogId,
      // Ensure the blog belongs to this author
      authorId: author.id
    },
    include: {
      author: true,
      category: true
    }
  });

  if (!blog) return redirect('/blogger/blogs');

  const [categories, authors, courses] = await Promise.all([
    db.blogCategory.findMany({
      orderBy: { name: 'asc' }
    }),
    db.blogAuthor.findMany({
      orderBy: { name: 'asc' }
    }),
    db.course.findMany({
      select: { id: true, title: true },
      orderBy: { title: 'asc' }
    })
  ]);

  const requiredFields = [blog.title, blog.content, blog.categoryId, blog.authorId, blog.imageUrl];

  const totalFields = requiredFields.length;
  const completedFields = requiredFields.filter(Boolean).length;

  const completionText = `(${completedFields}/${totalFields})`;
  const isComplete = requiredFields.every(Boolean);

  return (
    <>
      {!blog.isPublished && (
        <Banner label="This blog post is unpublished. It will not be visible to the public." />
      )}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-y-2">
            <h1 className="text-2xl font-medium">Blog Setup</h1>
            <span className="text-sm text-slate-700 dark:text-slate-400">
              Complete all fields {completionText}
            </span>
          </div>
          <BlogActions
            disabled={!isComplete}
            blogId={params.blogId}
            isPublished={blog.isPublished}
            slug={blog.slug}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
          <div>
            <div className="flex items-center gap-x-2">
              <div className="p-2 bg-sky-100 rounded-full dark:bg-sky-900">
                <LayoutDashboard className="h-6 w-6 text-sky-700 dark:text-sky-300" />
              </div>
              <h2 className="text-xl">Customize your blog post</h2>
            </div>
            <TitleForm initialData={blog} blogId={blog.id} />
            <SlugForm initialData={blog} blogId={blog.id} />
            <ImageForm
              initialData={blog as { imageUrl: string | null; imageAlt: string | null }}
              blogId={blog.id}
            />
            <CategoryForm
              initialData={blog}
              blogId={blog.id}
              options={categories.map((cat) => ({
                label: cat.name,
                value: cat.id
              }))}
            />
            <AuthorForm
              initialData={blog}
              blogId={blog.id}
              options={authors.map((a) => ({
                label: a.name,
                value: a.id
              }))}
            />
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-x-2">
                <div className="p-2 bg-sky-100 rounded-full dark:bg-sky-900">
                  <Settings className="h-6 w-6 text-sky-700 dark:text-sky-300" />
                </div>
                <h2 className="text-xl">SEO & Meta Tags</h2>
              </div>
              <SEOForm initialData={blog} blogId={blog.id} />
              <SEOAnalyzer initialData={blog} />
              <RelatedCoursesForm
                initialData={blog}
                blogId={blog.id}
                options={courses.map((course) => ({
                  label: course.title,
                  value: course.id
                }))}
              />
            </div>
            <div>
              <div className="flex items-center gap-x-2">
                <div className="p-2 bg-sky-100 rounded-full dark:bg-sky-900">
                  <FileText className="h-6 w-6 text-sky-700 dark:text-sky-300" />
                </div>
                <h2 className="text-xl">Article Content</h2>
              </div>
              <ContentForm initialData={blog} blogId={blog.id} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BloggerBlogIdPage;
