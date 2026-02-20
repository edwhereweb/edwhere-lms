import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';
import getSafeProfile from '@/actions/get-safe-profile';
import { TeacherCourseCard } from './_components/teacher-course-card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

const CoursesPage = async () => {
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    return redirect('/sign-in');
  }

  const isAuthorized = await isTeacher();
  if (!isAuthorized) {
    return redirect('/');
  }

  const profile = await getSafeProfile();
  if (!profile) {
    return redirect('/');
  }

  const includeConfig = {
    category: true,
    chapters: {
      select: { id: true }
    }
  };

  let courses = [];

  if (profile.role === 'ADMIN') {
    // Admins see all courses
    courses = await db.course.findMany({
      include: includeConfig,
      orderBy: {
        createdAt: 'desc'
      }
    });
  } else {
    // Teachers see courses they own OR courses they are assigned to as an instructor
    courses = await db.course.findMany({
      where: {
        OR: [
          { userId },
          {
            instructors: {
              some: { profileId: profile.id }
            }
          }
        ]
      },
      include: includeConfig,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium">Manage Courses</h1>
        <Link href="/teacher/create">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Course
          </Button>
        </Link>
      </div>

      {courses.length === 0 && (
        <div className="text-center text-sm text-muted-foreground mt-10">No courses found</div>
      )}

      <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        {courses.map((course) => (
          <TeacherCourseCard
            key={course.id}
            id={course.id}
            title={course.title}
            imageUrl={course.imageUrl}
            chaptersLength={course.chapters.length}
            price={course.price}
            category={course?.category?.name || null}
            isPublished={course.isPublished}
          />
        ))}
      </div>
    </div>
  );
};

export default CoursesPage;
