import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import { SearchInput } from '@/components/search-input';
import { getCourses } from '@/actions/get-courses';
import { CoursesList } from '@/components/courses-list';

import { Categories } from './_components/categories';

interface SearchPageProps {
  searchParams: {
    title: string;
    categoryId: string;
  };
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const { userId } = await auth();

  if (!userId) {
    return redirect('/sign-in');
  }

  const categories = await db.category.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  const courses = await getCourses({
    userId,
    ...searchParams
  });

  // Check if any course (matching search/publish but ignoring category filter) has no category
  // Alternatively, just query if there exist any published courses with categoryId: null
  const hasUncategorized = await db.course.findFirst({
    where: { isPublished: true, categoryId: null }
  });

  if (hasUncategorized) {
    categories.unshift({
      id: 'uncategorized',
      name: 'Uncategorized',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  return (
    <>
      <div className="px-6 pt-6 md:hidden md:mb-0 block">
        <SearchInput />
      </div>
      <div className="p-6 space-y-4">
        <Categories items={categories} />
        <CoursesList items={courses} />
      </div>
    </>
  );
};

export default SearchPage;
