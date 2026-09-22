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
    <div className="group border rounded-lg p-3 h-full flex flex-col bg-neutral-50 dark:bg-neutral-900">
      <div className="relative w-full aspect-video rounded-md overflow-hidden bg-neutral-200 dark:bg-neutral-800">
        {imageUrl ? (
          <Image fill className="object-cover" alt={title} src={imageUrl} />
        ) : (
          <div className="flex items-center justify-center h-full w-full text-neutral-400">
            No Image
          </div>
        )}
      </div>
      <div className="flex flex-col pt-4 flex-grow">
        <div className="flex justify-between items-start gap-x-2">
          <div className="text-lg font-medium line-clamp-2">{title}</div>
          <Badge className={cn('bg-neutral-500', isPublished && 'bg-[#F80602]')}>
            {isPublished ? 'Published' : 'Draft'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{category || 'Uncategorized'}</p>
        <div className="my-3 flex items-center gap-x-2 text-sm text-neutral-500">
          <IconBadge size="sm" icon={BookOpen} />
          <span>
            {chaptersLength} {chaptersLength === 1 ? 'Chapter' : 'Chapters'}
          </span>
        </div>

        <p className="text-md font-medium text-neutral-700 dark:text-neutral-300 mb-4">
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
