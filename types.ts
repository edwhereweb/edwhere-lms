import { type Category, type Course, type Profile } from '@prisma/client';

export type CourseWithProgressWithCategory = Course & {
  category: Category | null;
  chapters: { id: string }[];
  progress: number | null;
};

export type SafeProfile = Omit<Profile, 'createdAt' | 'updatedAt' | 'lastLoginAt'> & {
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};
