import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { getPageCount, getPagination, getParam } from '@/lib/pagination';
import { CourseFilterGrid } from './_components/course-filter-grid';

const CoursesPage = async ({
  searchParams
}: {
  searchParams: { q?: string; category?: string; page?: string };
}) => {
  const session = await auth();
  const userId = session?.userId;

  if (!userId) return redirect('/sign-in');

  const profile = await getSafeProfile();
  if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'TEACHER')) return redirect('/');

  const { page, skip, take } = getPagination(searchParams.page);
  const q = getParam(searchParams.q);
  const category = getParam(searchParams.category);

  const where: Prisma.CourseWhereInput = {
    ...(profile.role !== 'ADMIN' && {
      OR: [{ userId }, { instructors: { some: { profileId: profile.id } } }]
    }),
    ...(q && { title: { contains: q, mode: 'insensitive' } }),
    // Ignore malformed ids from the URL instead of letting Prisma throw.
    ...(/^[a-f\d]{24}$/i.test(category) && { categoryId: category })
  };

  const [total, courses, categories] = await Promise.all([
    db.course.count({ where }),
    db.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        price: true,
        isPublished: true,
        category: { select: { name: true } },
        _count: { select: { chapters: true } }
      }
    }),
    db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
  ]);

  // Flatten to the shape CourseFilterGrid expects
  const flatCourses = courses.map((c) => ({
    id: c.id,
    title: c.title,
    imageUrl: c.imageUrl ?? null,
    chaptersLength: c._count.chapters,
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

      <CourseFilterGrid
        courses={flatCourses}
        categories={categories}
        total={total}
        page={page}
        pageCount={getPageCount(total)}
      />
    </div>
  );
};

export default CoursesPage;
