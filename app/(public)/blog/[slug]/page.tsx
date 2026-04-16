import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { format } from 'date-fns';
import { Calendar, Tag } from 'lucide-react';

import { db } from '@/lib/db';
import { BlogContent } from '@/components/blog/blog-content';
import { AuthorBio } from '@/components/blog/author-bio';
import { CourseWidget } from '@/components/blog/course-widget';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { canManageBlogs } from '@/lib/blog-auth';
import Image from 'next/image';

interface Course {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
}

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

const getPostBySlug = cache(async (slug: string) => {
  return db.blogPost.findUnique({
    where: { slug },
    include: {
      author: true,
      category: true,
      courses: {
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true
        }
      }
    }
  });
});

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);

  if (!post) return { title: 'Blog Not Found' };

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || 'Read more on Edwhere Blog',
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || 'Read more on Edwhere Blog',
      type: 'article',
      publishedTime: post.createdAt.toISOString(),
      tags: post.tags
    }
  };
}

const BlogPostPage = async ({ params }: BlogPostPageProps) => {
  const post = await getPostBySlug(params.slug);

  const isAuthorized = await canManageBlogs();

  if (!post) {
    return notFound();
  }

  if (!post.isPublished && !isAuthorized) {
    return notFound();
  }

  // Fetch related courses based on tags
  const tagMappings = await db.blogTagMapping.findMany({
    where: {
      tagName: { in: post.tags }
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true
        }
      }
    }
  });

  const tagRelatedCourses = tagMappings.map((m) => m.course as Course);

  // Combine manual courses and tag-based courses, avoiding duplicates
  const manualCourses = (post.courses as Course[]) || [];
  const courseMap = new Map<string, Course>();

  [...manualCourses, ...tagRelatedCourses].forEach((course) => {
    if (course && !courseMap.has(course.id)) {
      courseMap.set(course.id, course);
    }
  });

  const relatedCourses = Array.from(courseMap.values());

  return (
    <div className="bg-white dark:bg-slate-950 pb-20">
      {/* Hero Section */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-6 text-center md:text-left">
            {post.category && (
              <Badge
                variant="secondary"
                className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
              >
                {post.category.name}
              </Badge>
            )}

            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-500 text-sm font-medium">
              <div className="flex items-center gap-x-1.5">
                <Calendar className="h-4 w-4" />
                {format(post.createdAt, 'MMMM d, yyyy')}
              </div>
              <Separator orientation="vertical" className="h-4 hidden md:block" />
              <div className="flex items-center gap-x-1.5">
                <Tag className="h-4 w-4" />
                {post.tags.join(', ') || 'General'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {post.imageUrl && (
        <div className="max-w-5xl mx-auto px-6 -mt-8 md:-mt-16 flex justify-center">
          <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 w-full max-w-[750px]">
            {/* Note: I'm using relative sizing that feels like 50% of content width but fixed classes for precision */}
            <Image
              src={post.imageUrl}
              alt={post.imageAlt || post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-6 mt-12 md:mt-20">
        <div className="flex flex-col gap-y-12">
          {/* Article Content */}
          <BlogContent content={post.content} />

          {/* Dynamic Course Widget */}
          {relatedCourses.length > 0 && (
            <CourseWidget courses={relatedCourses} tagName={post.tags[0]} />
          )}

          <Separator className="my-8" />

          {/* Author Bio */}
          <AuthorBio author={post.author} />
        </div>
      </div>
    </div>
  );
};

export default BlogPostPage;
