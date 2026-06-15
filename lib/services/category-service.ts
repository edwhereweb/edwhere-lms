import { db } from '@/lib/db';
import type { z } from 'zod';
import type { categorySchema } from '@/lib/validations';

type CreateCategoryInput = z.infer<typeof categorySchema>;

export async function listCategories(includeCourseCount = false) {
  return db.category.findMany({
    include: includeCourseCount ? { _count: { select: { courses: true } } } : undefined,
    orderBy: { name: 'asc' }
  });
}

export async function createCategory(data: CreateCategoryInput) {
  return db.category.create({
    data: { name: data.name }
  });
}
