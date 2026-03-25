import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Course {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
}

interface CourseWidgetProps {
  courses: Course[];
  tagName?: string;
}

export const CourseWidget = ({ courses, tagName }: CourseWidgetProps) => {
  if (courses.length === 0) return null;

  return (
    <div className="my-10 p-6 rounded-2xl bg-indigo-600 text-white shadow-xl overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <BookOpen className="h-32 w-32 -rotate-12" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-x-2 mb-4">
          <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
            {tagName ? `Related to ${tagName}` : 'Scale your skills'}
          </Badge>
        </div>

        <h3 className="text-2xl font-bold mb-2">Want to dive deeper?</h3>
        <p className="text-indigo-100 mb-6 max-w-lg">
          Explore our certified internship and certification programs related to this topic.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-sm line-clamp-1">{course.title}</span>
                <span className="text-xs text-indigo-200">Official Certification</span>
              </div>
              <ArrowRight className="h-4 w-4 ml-4 flex-shrink-0" />
            </Link>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            variant="outline"
            className="bg-white text-indigo-600 hover:bg-indigo-50 border-0"
          >
            View All Courses
          </Button>
        </div>
      </div>
    </div>
  );
};
