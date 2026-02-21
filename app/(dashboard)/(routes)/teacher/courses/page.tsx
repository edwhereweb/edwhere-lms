import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';
import getSafeProfile from '@/actions/get-safe-profile';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { CourseFilterGrid } from './_components/course-filter-grid';

const CoursesPage = async () => {
  const session = await auth();
  const userId = session?.userId;

  if (!userId) return redirect('/sign-in');

  const isAuthorized = await isTeacher();
  if (!isAuthorized) return redirect('/');

  const profile = await getSafeProfile();
  if (!profile) return redirect('/');

  const includeConfig = {
    category: true,
    chapters: { select: { id: true } }
  };

  let courses = [];

  if (profile.role === 'ADMIN') {
    courses = await db.course.findMany({
      include: includeConfig,
      orderBy: { createdAt: 'desc' }
    });
  } else {
    courses = await db.course.findMany({
      where: {
        OR: [{ userId }, { instructors: { some: { profileId: profile.id } } }]
      },
      include: includeConfig,
      orderBy: { createdAt: 'desc' }
    });
  }

  const categories = await db.category.findMany({
    orderBy: { name: 'asc' }
  });

  // Flatten to the shape CourseFilterGrid expects
  const flatCourses = courses.map((c) => ({
    id: c.id,
    title: c.title,
    imageUrl: c.imageUrl ?? null,
    chaptersLength: c.chapters.length,
    price: c.price ?? null,
    category: c.category?.name ?? null,
    isPublished: c.isPublished
  }));

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

      <CourseFilterGrid courses={flatCourses} categories={categories} />
    </div>
  );
};

export default CoursesPage;
