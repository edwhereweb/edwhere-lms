import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, PlayCircle } from 'lucide-react';

import { IconBadge } from '@/components/icon-badge';
import { formatPrice } from '@/lib/format';
import { CourseProgress } from '@/components/course-progress';

interface CourseCardProps {
  id: string;
  title: string;
  imageUrl: string;
  imageAlt?: string | null;
  chaptersLength: number;
  price: number;
  progress: number | null;
  category: string;
  resumeChapterId?: string | null;
  resumeChapterTitle?: string | null;
}

export const CourseCard = ({
  id,
  title,
  imageUrl,
  imageAlt,
  chaptersLength,
  price,
  progress,
  category,
  resumeChapterId,
  resumeChapterTitle
}: CourseCardProps) => {
  const href = resumeChapterId
    ? `/courses/${id}/chapters/${resumeChapterId}`
    : `/courses/${id}/start`;

  return (
    <Link href={href}>
      <div className="group h-full overflow-hidden rounded-2xl border bg-card p-3 shadow-sm transition hover:shadow-md">
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted">
          <Image
            fill
            className="object-cover"
            alt={imageAlt || title}
            src={imageUrl}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
        <div className="flex flex-col pt-3">
          <div className="text-lg md:text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-red-700 dark:group-hover:text-red-400 line-clamp-2">
            {title}
          </div>
          <p className="text-xs text-muted-foreground">{category}</p>
          <div className="my-3 flex items-center gap-x-2 text-sm md:text-xs">
            <div className="flex items-center gap-x-1 text-muted-foreground">
              <IconBadge size="sm" icon={BookOpen} />
              <span>
                {chaptersLength} {chaptersLength === 1 ? 'Chapter' : 'Chapters'}
              </span>
            </div>
          </div>
          {progress !== null ? (
            <>
              <CourseProgress
                variant={progress === 100 ? 'success' : 'default'}
                size="sm"
                value={progress}
              />
              {/* Continue Learning CTA — only for in-progress courses with a resume point */}
              {resumeChapterId && resumeChapterTitle && progress < 100 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400">
                  <PlayCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Continue: {resumeChapterTitle}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-base md:text-sm font-semibold text-foreground">
              {formatPrice(price)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};
