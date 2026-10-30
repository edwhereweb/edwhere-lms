'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ListPagination } from '@/components/list-pagination';
import { LogoSpinner } from '@/components/logo-spinner';
import { useDebounce } from '@/hooks/use-debounce';
import { useListParams } from '@/hooks/use-list-params';
import { cn } from '@/lib/utils';
import { TeacherCourseCard } from './teacher-course-card';

interface Course {
  id: string;
  title: string;
  imageUrl: string | null;
  chaptersLength: number;
  price: number | null;
  category: string | null;
  isPublished: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface CourseFilterGridProps {
  courses: Course[];
  categories: Category[];
  total: number;
  page: number;
  pageCount: number;
}

// Filtering and paging happen on the server; this grid only edits the URL.
export function CourseFilterGrid({
  courses,
  categories,
  total,
  page,
  pageCount
}: CourseFilterGridProps) {
  const { searchParams, setParams, isPending } = useListParams();
  const urlSearch = searchParams.get('q') ?? '';
  const categoryFilter = searchParams.get('category') ?? 'ALL';
  const [search, setSearch] = useState(urlSearch);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    if (debouncedSearch.trim() !== urlSearch) setParams({ q: debouncedSearch.trim() || null });
  }, [debouncedSearch, urlSearch, setParams]);

  const hasFilters = urlSearch || categoryFilter !== 'ALL';

  const clearFilters = () => {
    setSearch('');
    setParams({ q: null, category: null });
  };

  return (
    <div>
      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search courses by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={categoryFilter}
          onValueChange={(value) => setParams({ category: value === 'ALL' ? null : value })}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
            <X className="h-4 w-4" />
          </Button>
        )}
        {isPending && <LogoSpinner size={28} className="self-center" />}
      </div>

      {/* ── Results ── */}
      {courses.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground mt-10">
          {hasFilters ? 'No courses match your search or filter.' : 'No courses found'}
        </div>
      ) : (
        <>
          <div
            className={cn(
              'grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 transition-opacity',
              isPending && 'opacity-60'
            )}
          >
            {courses.map((course) => (
              <TeacherCourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                imageUrl={course.imageUrl}
                chaptersLength={course.chaptersLength}
                price={course.price}
                category={course.category}
                isPublished={course.isPublished}
              />
            ))}
          </div>
          {hasFilters && (
            <p className="mt-4 text-xs text-muted-foreground">
              {total} matching course{total !== 1 ? 's' : ''}
            </p>
          )}
          <ListPagination page={page} pageCount={pageCount} />
        </>
      )}
    </div>
  );
}
