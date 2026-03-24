import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { PublicCourseCard } from './_components/public-course-card';
import { PublicSearchBar } from './_components/public-search-bar';
import { PublicCategoryFilter } from './_components/public-category-filter';

export const metadata: Metadata = {
    title: 'Courses',
    description:
        'Browse all courses from Edwhere Education — Cybersecurity, Python, Data Analytics, AI and more. Start learning today.',
    openGraph: {
        title: 'Courses | Edwhere Education',
        description:
            'Browse all courses from Edwhere Education — Cybersecurity, Python, Data Analytics, AI and more.'
    }
};

interface CoursesPageProps {
    searchParams: {
        q?: string;
        categoryId?: string;
    };
}

export default async function PublicCoursesPage({ searchParams }: CoursesPageProps) {
    const { q, categoryId } = searchParams;

    const categories = await db.category.findMany({
        orderBy: { name: 'asc' }
    });

    const courses = await db.course.findMany({
        where: {
            isPublished: true,
            isWebVisible: true,
            ...(q && {
                OR: [
                    { title: { contains: q, mode: 'insensitive' as const } },
                    { description: { contains: q, mode: 'insensitive' as const } },
                    { category: { name: { contains: q, mode: 'insensitive' as const } } }
                ]
            }),
            ...(categoryId === 'uncategorized'
                ? { categoryId: null }
                : categoryId
                    ? { categoryId }
                    : {})
        } as Record<string, unknown>,
        include: {
            category: true,
            chapters: {
                where: { isPublished: true },
                select: { id: true }
            },
            instructors: {
                include: {
                    profile: {
                        select: { name: true, imageUrl: true }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Check if any published course has no category
    const hasUncategorized = courses.some((c) => !c.categoryId);

    return (
        <div className="bg-white min-h-[80vh]">
            {/* Hero Header */}
            <section className="bg-[#111111] text-white">
                <div className="max-w-[1400px] mx-auto px-6 py-16 text-center">
                    <h1 className="font-poppins text-4xl md:text-5xl font-semibold mb-4">
                        Explore Our Courses
                    </h1>
                    <p className="font-inter text-lg text-gray-300 max-w-2xl mx-auto">
                        Hands-on training in Cybersecurity, Data Analytics, AI, Programming and more.
                        Find the perfect course to kickstart your tech career.
                    </p>
                    <div className="mt-8 max-w-xl mx-auto">
                        <PublicSearchBar defaultValue={q} />
                    </div>
                </div>
            </section>

            {/* Filters + Grid */}
            <section className="max-w-[1400px] mx-auto px-6 py-10">
                <PublicCategoryFilter
                    categories={categories}
                    selectedCategoryId={categoryId}
                    hasUncategorized={hasUncategorized}
                />

                {courses.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-xl text-gray-500 font-inter">No courses found</p>
                        <p className="text-sm text-gray-400 mt-2">
                            Try adjusting your search or filter criteria
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
                        {courses.map((course) => (
                            <PublicCourseCard
                                key={course.id}
                                id={course.id}
                                title={course.title}
                                description={course.description}
                                imageUrl={course.imageUrl}
                                price={course.price}
                                slug={course.slug}
                                category={course.category?.name}
                                chaptersCount={course.chapters.length}
                                instructors={course.instructors
                                    .filter((i) => i.profile != null)
                                    .map((i) => ({
                                        name: i.profile.name,
                                        imageUrl: i.profile.imageUrl
                                    }))}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
