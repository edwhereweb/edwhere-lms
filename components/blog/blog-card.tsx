import Link from 'next/link';
import { format } from 'date-fns';
import { User, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface BlogCardProps {
  post: {
    title: string;
    slug: string;
    imageUrl: string | null;
    imageAlt: string | null;
    createdAt: Date;
    author: {
      name: string;
    };
    category: {
      name: string;
    } | null;
    tags: string[];
  };
}

export const BlogCard = ({ post }: BlogCardProps) => {
  return (
    <Link href={`/blog/${post.slug}`} className="group h-full">
      <div className="h-full flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500 transition-all hover:shadow-xl group overflow-hidden">
        {/* Image Container */}
        <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          {post.imageUrl ? (
            <Image
              src={post.imageUrl}
              alt={post.imageAlt || post.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <ImageIcon className="h-10 w-10 text-slate-400" />
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1 p-6">
          <div className="flex items-center gap-x-2 mb-4">
            {post.category && (
              <Badge
                variant="secondary"
                className="bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400 border-0"
              >
                {post.category.name}
              </Badge>
            )}
            <div className="text-xs text-slate-500 font-medium">
              {format(post.createdAt, 'MMM d, yyyy')}
            </div>
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-sky-600 transition-colors line-clamp-2">
            {post.title}
          </h3>

          <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-x-2 text-slate-600 dark:text-slate-400 text-sm">
              <User className="h-4 w-4" />
              <span className="font-medium">{post.author.name}</span>
            </div>

            <div className="flex items-center gap-x-1 text-sky-600 font-bold text-xs uppercase tracking-wider">
              Read More
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
