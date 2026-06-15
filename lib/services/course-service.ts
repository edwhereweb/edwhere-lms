import { db } from '@/lib/db';
import type { z } from 'zod';
import type { createCourseSchema } from '@/lib/validations';

type CreateCourseInput = z.infer<typeof createCourseSchema>;

export async function listCourses(userId: string, role: string) {
  const isAdmin = role === 'ADMIN';

  return db.course.findMany({
    where: isAdmin
      ? {}
      : {
          OR: [{ userId }, { instructors: { some: { profile: { userId } } } }]
        },
    include: {
      category: true,
      _count: {
        select: {
          chapters: true,
          purchases: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createCourse(userId: string, _data: CreateCourseInput) {
  return db.course.create({
    data: {
      userId,
      title: _data.title
    }
  });
}
