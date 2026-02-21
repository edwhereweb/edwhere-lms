'use client';

import { useMemo, useState } from 'react';
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
}

export function CourseFilterGrid({ courses, categories }: CourseFilterGridProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return courses.filter((c) => {
      const matchSearch = !q || c.title.toLowerCase().includes(q);
      const matchCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [courses, search, categoryFilter]);

  const hasFilters = search || categoryFilter !== 'ALL';

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('ALL');
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

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
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
      </div>

      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground mt-10">
          {hasFilters ? 'No courses match your search or filter.' : 'No courses found'}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
            {filtered.map((course) => (
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
              Showing {filtered.length} of {courses.length} course{courses.length !== 1 ? 's' : ''}
            </p>
          )}
        </>
      )}
    </div>
  );
}
