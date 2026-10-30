import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Edit, Eye, Layout, Users } from 'lucide-react';

import { IconBadge } from '@/components/icon-badge';
import { formatPrice } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TeacherCourseCardProps {
  id: string;
  title: string;
  imageUrl: string | null;
  chaptersLength: number;
  price: number | null;
  category: string | null;
  isPublished: boolean;
}

export const TeacherCourseCard = ({
  id,
  title,
  imageUrl,
  chaptersLength,
  price,
  category,
  isPublished
}: TeacherCourseCardProps) => {
  return (
    <div className="group h-full flex flex-col rounded-2xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted">
        {imageUrl ? (
          <Image fill className="object-cover" alt={title} src={imageUrl} />
        ) : (
          <div className="flex items-center justify-center h-full w-full text-muted-foreground">
            No Image
          </div>
        )}
      </div>
      <div className="flex flex-col pt-4 flex-grow">
        <div className="flex justify-between items-start gap-x-2">
          <div className="text-lg font-semibold leading-snug text-foreground line-clamp-2">
            {title}
          </div>
          <Badge
            variant="outline"
            className={cn(
              'shrink-0 bg-muted text-muted-foreground',
              isPublished &&
                'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
            )}
          >
            {isPublished ? 'Published' : 'Draft'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{category || 'Uncategorized'}</p>
        <div className="my-3 flex items-center gap-x-2 text-sm text-muted-foreground">
          <IconBadge size="sm" icon={BookOpen} />
          <span>
            {chaptersLength} {chaptersLength === 1 ? 'Chapter' : 'Chapters'}
          </span>
        </div>

        <p className="text-base font-semibold text-foreground mb-4">
          {price !== null ? formatPrice(price) : 'Free'}
        </p>

        <div className="grid grid-cols-2 gap-2 mt-auto">
          <Link href={`/teacher/courses/${id}/details`}>
            <Button variant="outline" className="w-full justify-start text-xs py-1 h-8">
              <Edit className="w-3 h-3 mr-2" />
              Edit Details
            </Button>
          </Link>
          <Link href={`/teacher/courses/${id}/structure`}>
            <Button variant="outline" className="w-full justify-start text-xs py-1 h-8">
              <Layout className="w-3 h-3 mr-2" />
              Structure
            </Button>
          </Link>
          <Link href={`/courses/${id}`}>
            <Button variant="outline" className="w-full justify-start text-xs py-1 h-8">
              <Eye className="w-3 h-3 mr-2" />
              Preview
            </Button>
          </Link>
          <Link href={`/teacher/courses/${id}/learners`}>
            <Button variant="outline" className="w-full justify-start text-xs py-1 h-8">
              <Users className="w-3 h-3 mr-2" />
              Learners
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
