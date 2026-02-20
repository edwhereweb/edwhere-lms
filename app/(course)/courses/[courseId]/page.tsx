import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

const CourseIdPage = async ({ params }: { params: { courseId: string } }) => {
  const course = await db.course.findUnique({
    where: {
      id: params.courseId
    },
    include: {
      // Get ALL published chapters regardless of module assignment
      // so we can always find the first one to redirect to
      chapters: {
        where: {
          isPublished: true
        },
        orderBy: {
          position: 'asc'
        }
      }
    }
  });

  if (!course) {
    return redirect('/dashboard');
  }

  if (!course.chapters.length) {
    return redirect('/dashboard');
  }

  return redirect(`/courses/${course.id}/chapters/${course.chapters[0].id}`);
};

export default CourseIdPage;
