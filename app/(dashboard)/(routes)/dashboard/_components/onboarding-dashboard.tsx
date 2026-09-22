'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

import { formatPrice } from '@/lib/format';
import { trackFunnelEvent } from '@/lib/funnel-analytics';
import { type OnboardingCategory } from '@/actions/get-onboarding-categories';

type OnboardingDashboardProps = {
  categories: OnboardingCategory[];
};

function CategoryTile({ category }: { category: OnboardingCategory }) {
  const onTileClick = () => {
    void trackFunnelEvent({
      event: 'dashboard_category_tile_click',
      categoryId: category.id,
      dedupeKey: `dashboard_category_tile_click:${category.id}`
    });
  };

  return (
    <div className="rounded-xl border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{category.name}</h3>
        <Link
          href={`/search?categoryId=${category.id}`}
          onClick={onTileClick}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#6715FF] hover:underline"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {category.courses.slice(0, 4).map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.slug ?? course.id}`}
            onClick={onTileClick}
            className="group block rounded-lg border overflow-hidden hover:shadow-sm transition"
          >
            <div className="relative w-full aspect-video bg-muted">
              <Image
                src={course.imageUrl ?? '/images/course-placeholder.png'}
                alt={course.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-2">
              <p className="text-xs font-medium line-clamp-2">{course.title}</p>
              {typeof course.price === 'number' && course.price > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{formatPrice(course.price)}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function OnboardingDashboard({ categories }: OnboardingDashboardProps) {
  useEffect(() => {
    void trackFunnelEvent({
      event: 'dashboard_onboarding_impression',
      dedupeKey: 'dashboard_onboarding_impression'
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-br from-[#6715FF] to-[#5210CC] text-white p-6 md:p-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wide opacity-90">
            Welcome to Edwhere
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">
          Let&apos;s find your first course
        </h1>
        <p className="text-white/90 max-w-2xl">
          You haven&apos;t enrolled in a course yet. Explore our most popular categories below, or
          browse the full catalog to get started.
        </p>
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-white text-[#6715FF] font-semibold rounded-lg hover:bg-white/90 transition"
        >
          Explore all courses <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {categories.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <CategoryTile key={category.id} category={category} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border p-6 text-center text-muted-foreground">
          <p>New courses are being added soon.</p>
          <Link href="/courses" className="text-[#6715FF] font-medium hover:underline">
            Browse all courses
          </Link>
        </div>
      )}
    </div>
  );
}
